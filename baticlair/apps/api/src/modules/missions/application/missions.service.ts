import { createHmac, timingSafeEqual } from "node:crypto";
import {
  alerteCoordonnees,
  alerteNouveauMessage,
  alerteReponseMission,
  budgetLisible,
  CATEGORIES_DOCUMENT,
  DOCUMENTS_PAR_ENTREPRISE,
  etatCoordonnees,
  fauteFichier,
  fauteMessage,
  fautesDisponibilite,
  fautesMission,
  fautesReponse,
  FICHIERS_PAR_ANNONCE,
  initialesEntreprise,
  MOTIF_IMAGE_PROFIL,
  nettoyerImageProfil,
  PHRASE_FAUTE_IMAGE_PROFIL,
  libelleDe,
  masquerCoordonnees,
  MOTIFS_SIGNALEMENT,
  NIVEAUX,
  peutAnnonce,
  PHRASE_FAUTE_FICHIER,
  PHRASE_REFUS_OUVERTURE,
  refusOuverture,
  tarifLisible,
  titreMission,
  zoneDuCodePostal,
  type ActionAnnonce,
  type AlerteCourte,
  type CategorieDocument,
  type Faute,
  type SaisieDisponibilite,
  type SaisieMission,
  type SaisieReponse,
  type StatutAnnonce,
  type TypeAnnonce,
} from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import { ecrireAlerte } from "../../../platform/notifications/alertes.js";
import { isUuid } from "../../../platform/validation/ids.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";

/** Prévenir l'autre entreprise (push, e-mail) : jamais le texte d'un message, seulement l'alerte courte. */
export interface PortsMissions {
  prevenir(companyId: string, alerte: AlerteCourte, options: { sansEmail: boolean }): Promise<void>;
}

const jour = (d: Date) => d.toISOString().slice(0, 10);
const date = (iso: string) => new Date(`${iso}T00:00:00Z`);
const nombre = (d: { toNumber(): number } | null) => (d === null ? null : d.toNumber());
const LIEN_FICHIER_MS = 5 * 60_000;

type Annonce = NonNullable<Awaited<ReturnType<PrismaService["annonceMission"]["findFirst"]>>>;
type Conversation = NonNullable<Awaited<ReturnType<PrismaService["conversationMission"]["findFirst"]>>>;
/** `image` : la version de son logo ou de sa photo (pour l'adresse de l'image), `null` sans image : les initiales. */
export interface EntrepriseVue { id: string; nom: string; initiales: string; verifiee: boolean; departement: string | null; image: string | null }

/**
 * MISSIONS ENTRE ENTREPRISES (Greg, 10 novembre 2026). Chaque lecture et chaque écriture part de l'entreprise courante :
 * une annonce se modifie par son auteur seulement ; une réponse se lit par son auteur et par l'auteur de la mission ; une
 * conversation par ses deux entreprises ; un fichier par son propriétaire et dans le seul cadre qu'il a autorisé. Tout
 * identifiant d'une autre entreprise répond 404, jamais 403 (on ne dit pas qu'il existe).
 */
export class MissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ports: PortsMissions,
    private readonly reglage: { actif: boolean; secret: string },
    private readonly now: () => Date = () => new Date(),
  ) {}

  private exiger(): void {
    if (!this.reglage.actif) throw notFound("Missions");
  }
  private async entreprise(id: string): Promise<EntrepriseVue> {
    const c = await this.prisma.company.findUniqueOrThrow({ where: { id }, select: { id: true, name: true, siretVerifieLe: true, address: true, imageProfil: { select: { updatedAt: true } } } });
    return { id: c.id, nom: c.name, initiales: initialesEntreprise(c.name), verifiee: !!c.siretVerifieLe, departement: zoneDuCodePostal(c.address), image: c.imageProfil ? String(c.imageProfil.updatedAt.getTime()) : null };
  }
  private async entreprises(ids: string[]): Promise<Map<string, EntrepriseVue>> {
    const liste = await this.prisma.company.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, name: true, siretVerifieLe: true, address: true, imageProfil: { select: { updatedAt: true } } } });
    return new Map(liste.map((c) => [c.id, { id: c.id, nom: c.name, initiales: initialesEntreprise(c.name), verifiee: !!c.siretVerifieLe, departement: zoneDuCodePostal(c.address), image: c.imageProfil ? String(c.imageProfil.updatedAt.getTime()) : null }]));
  }
  private async verifiee(companyId: string): Promise<boolean> {
    return !!(await this.prisma.company.findUnique({ where: { id: companyId }, select: { siretVerifieLe: true } }))?.siretVerifieLe;
  }
  /** Les entreprises avec lesquelles tout échange est coupé (blocage posé ou subi). */
  private async bloquees(companyId: string): Promise<Set<string>> {
    const b = await this.prisma.blocageEntreprise.findMany({ where: { OR: [{ companyId }, { cibleId: companyId }] }, select: { companyId: true, cibleId: true } });
    return new Set(b.map((x) => (x.companyId === companyId ? x.cibleId : x.companyId)));
  }
  private async tracer(t: TenantContext, action: string, cible: { annonceId?: string; conversationId?: string }, detail?: Record<string, unknown>) {
    await this.prisma.historiqueMission.create({ data: { companyId: t.companyId, userId: t.userId, action, annonceId: cible.annonceId ?? null, conversationId: cible.conversationId ?? null, ...(detail ? { detail: detail as object } : {}) } });
  }
  private async alerter(companyId: string, alerte: AlerteCourte, sansEmail: boolean) {
    const nouvelle = await ecrireAlerte(this.prisma, companyId, alerte);
    if (nouvelle) await this.ports.prevenir(companyId, alerte, { sansEmail }).catch(() => undefined);
  }
  private refuser(fautes: Faute[]): never {
    throw validationFailed("Invalid mission input", { reason: "saisie", fautes, phrase: fautes[0]?.message });
  }

  /* --------------------------------------------------------------------------------------------- État et annonces */

  async etat(t: TenantContext) {
    this.exiger();
    const [e, nonLus] = await Promise.all([this.entreprise(t.companyId), this.nonLus(t)]);
    return { actif: true, entreprise: e, nonLus };
  }

  private vueAnnonce(a: Annonce, auteur: EntrepriseVue | undefined, moi: string) {
    const mienne = a.companyId === moi;
    const tarifMontre = a.type === "disponibilite" && a.tarifJour !== null && (a.tarifVisible || mienne);
    return {
      id: a.id,
      type: a.type as TypeAnnonce,
      statut: a.statut as StatutAnnonce,
      mienne,
      titre: titreMission(a.metier, a.lieu),
      metier: a.metier,
      autreMetier: a.autreMetier,
      lieu: a.lieu,
      departement: a.departement,
      rayonKm: a.rayonKm,
      debut: jour(a.debut),
      fin: a.fin ? jour(a.fin) : null,
      types: a.types,
      // Recette du 13 novembre 2026 (B10) : les textes libres d'une annonce ne montrent jamais un numéro ni un e-mail à
      // une autre entreprise (les coordonnées ne se partagent qu'après l'accord des deux, dans la conversation).
      description: masquerSi(!mienne, a.description),
      niveau: a.niveau,
      experience: a.experience,
      qualifications: a.qualifications,
      equipe: a.equipe,
      contexte: masquerSi(!mienne, a.contexte),
      modeChiffrage: a.modeChiffrage,
      budgetMin: nombre(a.budgetMin),
      budgetMax: nombre(a.budgetMax),
      budget: budgetLisible(a.modeChiffrage, nombre(a.budgetMin), nombre(a.budgetMax)),
      frais: a.frais,
      conditions: a.conditions,
      tarifJour: tarifMontre ? nombre(a.tarifJour) : null,
      tarifUnite: tarifMontre ? a.tarifUnite : null,
      tarif: tarifMontre ? tarifLisible(nombre(a.tarifJour)!, a.tarifUnite) : null,
      tarifVisible: a.tarifVisible,
      dureeMinJours: a.dureeMinJours,
      negociable: a.negociable,
      entreprise: auteur ?? null,
      ...(mienne ? { consultations: a.consultations } : {}),
      creeLe: a.createdAt.toISOString(),
    };
  }

  /** Les annonces publiées des AUTRES entreprises (jamais d'une entreprise bloquée), les plus proches d'abord. */
  async annonces(t: TenantContext, filtre: { type?: string; q?: string; departement?: string }) {
    this.exiger();
    const [moi, bloquees] = await Promise.all([this.entreprise(t.companyId), this.bloquees(t.companyId)]);
    const q = filtre.q?.trim();
    const liste = await this.prisma.annonceMission.findMany({
      where: {
        statut: "publiee",
        companyId: { notIn: [t.companyId, ...bloquees] },
        ...(filtre.type === "mission" || filtre.type === "disponibilite" ? { type: filtre.type } : {}),
        ...(filtre.departement ? { departement: filtre.departement } : {}),
        OR: [{ fin: null }, { fin: { gte: date(jour(this.now())) } }],
        ...(q ? { AND: [{ OR: [{ metier: { contains: q, mode: "insensitive" } }, { autreMetier: { contains: q, mode: "insensitive" } }, { lieu: { contains: q, mode: "insensitive" } }] }] } : {}),
      },
      orderBy: [{ debut: "asc" }, { createdAt: "desc" }],
      take: 60,
    });
    const auteurs = await this.entreprises(liste.map((a) => a.companyId));
    const vues = liste.map((a) => this.vueAnnonce(a, auteurs.get(a.companyId), t.companyId));
    // « Près de toi » : son département d'abord.
    vues.sort((x, y) => Number(y.departement === moi.departement) - Number(x.departement === moi.departement));
    return { departement: moi.departement, items: vues };
  }

  /** « Mes missions » : mes annonces (avec le nombre de réponses et de messages) et mes réponses. */
  async miennes(t: TenantContext) {
    this.exiger();
    const [annonces, reponses] = await Promise.all([
      this.prisma.annonceMission.findMany({ where: { companyId: t.companyId }, orderBy: { createdAt: "desc" }, take: 100, include: { _count: { select: { reponses: { where: { statut: "envoyee" } }, conversations: true } } } }),
      this.prisma.reponseMission.findMany({ where: { companyId: t.companyId }, orderBy: { createdAt: "desc" }, take: 100, include: { annonce: true } }),
    ]);
    const auteurs = await this.entreprises(reponses.map((r) => r.annonce.companyId));
    return {
      annonces: annonces.map((a) => ({ ...this.vueAnnonce(a, undefined, t.companyId), reponses: a._count.reponses, conversations: a._count.conversations })),
      reponses: reponses.map((r) => ({ id: r.id, statut: r.statut, envoyeeLe: r.createdAt.toISOString(), annonce: this.vueAnnonce(r.annonce, auteurs.get(r.annonce.companyId), t.companyId) })),
    };
  }

  private donneesAnnonce(type: TypeAnnonce, s: SaisieMission | SaisieDisponibilite) {
    if (type === "mission") {
      const m = s as SaisieMission;
      return { metier: m.metier.trim(), autreMetier: null, lieu: m.lieu.trim(), departement: zoneDuCodePostal(m.codePostal)!, rayonKm: null, debut: date(m.debut), fin: date(m.fin), types: m.types, description: m.description.trim(), niveau: m.niveau ?? null, experience: m.experience ?? null, qualifications: (m.qualifications ?? []).map((q) => q.trim()), equipe: m.equipe ?? null, contexte: m.contexte?.trim() || null, modeChiffrage: m.modeChiffrage ?? null, budgetMin: m.budgetMin ?? null, budgetMax: m.budgetMax ?? null, frais: m.frais ?? null, conditions: m.conditions?.trim() || null, tarifJour: null, tarifUnite: null, dureeMinJours: null };
    }
    const d = s as SaisieDisponibilite;
    return { metier: d.metier.trim(), autreMetier: d.autreMetier?.trim() || null, lieu: d.ville.trim(), departement: zoneDuCodePostal(d.codePostal)!, rayonKm: d.rayonKm, debut: date(d.debut), fin: d.fin ? date(d.fin) : null, types: d.types, description: d.presentation.trim(), equipe: d.equipe ?? null, tarifJour: d.tarifJour ?? null, tarifUnite: d.tarifJour != null ? (d.tarifUnite ?? null) : null, dureeMinJours: d.dureeMinJours ?? null, negociable: d.negociable ?? true, tarifVisible: d.tarifVisible ?? true };
  }
  private controler(type: TypeAnnonce, s: SaisieMission | SaisieDisponibilite) {
    const fautes = type === "mission" ? fautesMission(s as SaisieMission, jour(this.now())) : fautesDisponibilite(s as SaisieDisponibilite, jour(this.now()));
    if (fautes.length) this.refuser(fautes);
  }

  async publier(t: TenantContext, type: TypeAnnonce, s: SaisieMission | SaisieDisponibilite) {
    this.exiger();
    assertCanWrite(t);
    this.controler(type, s);
    if (!(await this.verifiee(t.companyId))) throw new DomainError("forbidden", "Company not verified", { reason: "non_verifie", phrase: "Vérifie d'abord ton entreprise (SIRET) pour publier une annonce." });
    const ouvertes = await this.prisma.annonceMission.count({ where: { companyId: t.companyId, statut: { not: "fermee" } } });
    if (ouvertes >= 20) throw validationFailed("Too many ads", { reason: "trop_d_annonces", phrase: "Vingt annonces ouvertes au plus : ferme une annonce terminée." });
    const a = await this.prisma.annonceMission.create({ data: { companyId: t.companyId, userId: t.userId, type, ...this.donneesAnnonce(type, s) } });
    await this.tracer(t, "publiee", { annonceId: a.id });
    return this.vueAnnonce(a, await this.entreprise(t.companyId), t.companyId);
  }

  private async mienne(t: TenantContext, id: string): Promise<Annonce> {
    if (!isUuid(id)) throw notFound("Annonce");
    const a = await this.prisma.annonceMission.findFirst({ where: { id, companyId: t.companyId } });
    if (!a) throw notFound("Annonce");
    return a;
  }

  async modifier(t: TenantContext, id: string, s: SaisieMission | SaisieDisponibilite) {
    this.exiger();
    assertCanWrite(t);
    const a = await this.mienne(t, id);
    if (!peutAnnonce(a.statut as StatutAnnonce, "modifier")) throw validationFailed("Closed ad", { reason: "annonce_fermee", phrase: "Une annonce fermée ne se modifie plus." });
    this.controler(a.type as TypeAnnonce, s);
    const maj = await this.prisma.annonceMission.update({ where: { id }, data: this.donneesAnnonce(a.type as TypeAnnonce, s) });
    await this.tracer(t, "modifiee", { annonceId: id });
    return this.vueAnnonce(maj, await this.entreprise(t.companyId), t.companyId);
  }

  async changerStatut(t: TenantContext, id: string, action: Exclude<ActionAnnonce, "modifier">) {
    this.exiger();
    assertCanWrite(t);
    const a = await this.mienne(t, id);
    if (!peutAnnonce(a.statut as StatutAnnonce, action)) throw validationFailed("Impossible transition", { reason: "action_impossible", phrase: a.statut === "fermee" ? "Cette annonce est déjà fermée." : "Cette action n'est pas possible pour l'instant." });
    const statut: StatutAnnonce = action === "suspendre" ? "suspendue" : action === "reprendre" ? "publiee" : "fermee";
    const maj = await this.prisma.annonceMission.update({ where: { id }, data: { statut, fermeeLe: statut === "fermee" ? this.now() : null } });
    await this.tracer(t, action, { annonceId: id });
    return this.vueAnnonce(maj, await this.entreprise(t.companyId), t.companyId);
  }

  /** Une annonce se lit si elle est publiée, si c'est la mienne, ou si j'y ai déjà répondu ou échangé. */
  private async lisible(t: TenantContext, id: string): Promise<Annonce> {
    if (!isUuid(id)) throw notFound("Annonce");
    const a = await this.prisma.annonceMission.findUnique({ where: { id } });
    if (!a) throw notFound("Annonce");
    if (a.companyId === t.companyId) return a;
    if ((await this.bloquees(t.companyId)).has(a.companyId)) throw notFound("Annonce");
    if (a.statut === "publiee") return a;
    const lie = (await this.prisma.reponseMission.count({ where: { annonceId: id, companyId: t.companyId } })) + (await this.prisma.conversationMission.count({ where: { annonceId: id, autreId: t.companyId } }));
    if (!lie) throw notFound("Annonce");
    return a;
  }

  async annonce(t: TenantContext, id: string) {
    this.exiger();
    const a = await this.lisible(t, id);
    const mienne = a.companyId === t.companyId;
    if (!mienne) await this.prisma.annonceMission.update({ where: { id }, data: { consultations: { increment: 1 } } }).catch(() => undefined);
    const [auteur, fichiers, maReponse, conversation, enregistree, reponses] = await Promise.all([
      this.entreprise(a.companyId),
      this.prisma.fichierPro.findMany({ where: { annonceId: id, portee: "annonce" }, select: { id: true, nom: true, type: true, taille: true }, orderBy: { createdAt: "asc" } }),
      mienne ? null : this.prisma.reponseMission.findUnique({ where: { annonceId_companyId: { annonceId: id, companyId: t.companyId } } }),
      mienne ? null : this.prisma.conversationMission.findUnique({ where: { annonceId_annonceurId_autreId: { annonceId: id, annonceurId: a.companyId, autreId: t.companyId } }, select: { id: true } }),
      this.prisma.annonceEnregistree.count({ where: { companyId: t.companyId, annonceId: id } }),
      mienne ? this.prisma.reponseMission.count({ where: { annonceId: id, statut: "envoyee" } }) : 0,
    ]);
    return {
      ...this.vueAnnonce(a, auteur, t.companyId),
      fichiers,
      enregistree: enregistree > 0,
      maReponse: maReponse && maReponse.statut === "envoyee" ? { id: maReponse.id, envoyeeLe: maReponse.createdAt.toISOString() } : null,
      conversationId: conversation?.id ?? null,
      ...(mienne ? { reponses } : {}),
    };
  }

  async enregistrer(t: TenantContext, id: string, garder: boolean) {
    this.exiger();
    assertCanWrite(t);
    const a = await this.lisible(t, id);
    if (a.companyId === t.companyId) throw validationFailed("Own ad", { reason: "soi_meme", phrase: "C'est ta propre annonce." });
    if (garder) await this.prisma.annonceEnregistree.createMany({ data: [{ companyId: t.companyId, annonceId: id }], skipDuplicates: true });
    else await this.prisma.annonceEnregistree.deleteMany({ where: { companyId: t.companyId, annonceId: id } });
    return { enregistree: garder };
  }

  async enregistrees(t: TenantContext) {
    this.exiger();
    const liste = await this.prisma.annonceEnregistree.findMany({ where: { companyId: t.companyId }, include: { annonce: true }, orderBy: { createdAt: "desc" }, take: 100 });
    const bloquees = await this.bloquees(t.companyId);
    const visibles = liste.filter((e) => !bloquees.has(e.annonce.companyId));
    const auteurs = await this.entreprises(visibles.map((e) => e.annonce.companyId));
    return { items: visibles.map((e) => this.vueAnnonce(e.annonce, auteurs.get(e.annonce.companyId), t.companyId)) };
  }

  /* --------------------------------------------------------------------------------------------- Réponses */

  private async documentsPartages(companyId: string, ids: string[]) {
    if (!ids.length) return [];
    return this.prisma.fichierPro.findMany({ where: { id: { in: ids }, companyId, portee: "dossier" }, select: { id: true, categorie: true, titre: true, nom: true, type: true, taille: true }, orderBy: { createdAt: "asc" } });
  }

  async repondre(t: TenantContext, annonceId: string, s: SaisieReponse) {
    this.exiger();
    assertCanWrite(t);
    const a = await this.lisible(t, annonceId);
    if (a.type !== "mission") throw validationFailed("Not a mission", { reason: "pas_une_mission", phrase: "On répond seulement à une mission." });
    if (a.companyId === t.companyId) throw validationFailed("Own ad", { reason: "soi_meme", phrase: "C'est ta propre mission." });
    if (a.statut !== "publiee") throw validationFailed("Closed ad", { reason: "annonce_fermee", phrase: "Cette mission n'est plus ouverte aux réponses." });
    if (!(await this.verifiee(t.companyId))) throw new DomainError("forbidden", "Company not verified", { reason: "non_verifie", phrase: "Vérifie d'abord ton entreprise (SIRET) pour répondre à une mission." });
    const fautes = fautesReponse(s);
    if (fautes.length) this.refuser(fautes);
    // Seuls MES documents se partagent : un identifiant d'une autre entreprise est refusé, jamais ignoré en silence.
    const ids = [...new Set(s.documentIds ?? [])];
    if (ids.some((i) => !isUuid(i)) || (await this.documentsPartages(t.companyId, ids)).length !== ids.length) throw validationFailed("Unknown document", { reason: "document_inconnu", phrase: "Un des documents choisis n'est plus dans ton dossier." });
    const donnees = { niveau: s.niveau, experienceAns: s.experienceAns, equipe: s.equipe, message: s.message.trim(), tarifJour: s.tarifJour ?? null, tarifUnite: s.tarifJour != null ? (s.tarifUnite ?? null) : null, jours: s.jours?.trim() || null, deplacement: s.deplacement ?? null, documentIds: ids, statut: "envoyee", userId: t.userId };
    const r = await this.prisma.reponseMission.upsert({ where: { annonceId_companyId: { annonceId, companyId: t.companyId } }, create: { annonceId, companyId: t.companyId, ...donnees }, update: donnees });
    await this.tracer(t, "reponse_envoyee", { annonceId });
    const moi = await this.entreprise(t.companyId);
    await this.alerter(a.companyId, alerteReponseMission({ missionId: a.id, entreprise: moi.nom, sujet: titreMission(a.metier, a.lieu), reponseId: r.id }), false);
    return this.vueReponse(r, moi, await this.documentsPartages(t.companyId, ids), null, t.companyId);
  }

  async retirerReponse(t: TenantContext, annonceId: string) {
    this.exiger();
    assertCanWrite(t);
    if (!isUuid(annonceId)) throw notFound("Réponse");
    const r = await this.prisma.reponseMission.findUnique({ where: { annonceId_companyId: { annonceId, companyId: t.companyId } } });
    if (!r) throw notFound("Réponse");
    await this.prisma.reponseMission.update({ where: { id: r.id }, data: { statut: "retiree", documentIds: [] } });
    await this.tracer(t, "reponse_retiree", { annonceId });
    return { retiree: true };
  }

  private vueReponse(r: NonNullable<Awaited<ReturnType<PrismaService["reponseMission"]["findFirst"]>>>, e: EntrepriseVue, documents: { id: string; categorie: string | null; titre: string | null; nom: string; type: string; taille: number }[], conversationId: string | null, lecteur: string) {
    return {
      id: r.id,
      annonceId: r.annonceId,
      statut: r.statut,
      entreprise: e,
      niveau: r.niveau,
      niveauLibelle: libelleDe(NIVEAUX, r.niveau),
      experienceAns: r.experienceAns,
      equipe: r.equipe,
      // Recette du 13 novembre 2026 (B10) : hors de son auteur, un numéro ou un e-mail écrit dans la réponse est masqué.
      message: r.companyId === lecteur ? r.message : masquerCoordonnees(r.message),
      tarifJour: nombre(r.tarifJour),
      tarif: r.tarifJour !== null ? tarifLisible(nombre(r.tarifJour)!, r.tarifUnite) : null,
      tarifUnite: r.tarifUnite,
      jours: r.jours,
      deplacement: r.deplacement,
      documents,
      conversationId,
      envoyeeLe: r.createdAt.toISOString(),
    };
  }

  /** Les réponses reçues à MA mission (jamais celles d'une entreprise bloquée ni une réponse retirée). */
  async reponses(t: TenantContext, annonceId: string) {
    this.exiger();
    const a = await this.mienne(t, annonceId);
    const bloquees = await this.bloquees(t.companyId);
    const liste = (await this.prisma.reponseMission.findMany({ where: { annonceId, statut: "envoyee" }, orderBy: { createdAt: "asc" } })).filter((r) => !bloquees.has(r.companyId));
    const [es, convs] = await Promise.all([this.entreprises(liste.map((r) => r.companyId)), this.prisma.conversationMission.findMany({ where: { annonceId, annonceurId: t.companyId }, select: { id: true, autreId: true } })]);
    const items = [];
    for (const r of liste) items.push(this.vueReponse(r, es.get(r.companyId)!, await this.documentsPartages(r.companyId, r.documentIds), convs.find((c) => c.autreId === r.companyId)?.id ?? null, t.companyId));
    return { annonce: this.vueAnnonce(a, undefined, t.companyId), items };
  }

  /** Une réponse : lue par son auteur ou par l'auteur de la mission, personne d'autre. */
  async reponse(t: TenantContext, id: string) {
    this.exiger();
    if (!isUuid(id)) throw notFound("Réponse");
    const r = await this.prisma.reponseMission.findUnique({ where: { id }, include: { annonce: true } });
    if (!r || (r.companyId !== t.companyId && r.annonce.companyId !== t.companyId)) throw notFound("Réponse");
    if (r.companyId !== t.companyId && (r.statut !== "envoyee" || (await this.bloquees(t.companyId)).has(r.companyId))) throw notFound("Réponse");
    const conv = await this.prisma.conversationMission.findUnique({ where: { annonceId_annonceurId_autreId: { annonceId: r.annonceId, annonceurId: r.annonce.companyId, autreId: r.companyId } }, select: { id: true } });
    const auteurs = await this.entreprises([r.companyId, r.annonce.companyId]);
    return { ...this.vueReponse(r, auteurs.get(r.companyId)!, await this.documentsPartages(r.companyId, r.documentIds), conv?.id ?? null, t.companyId), annonce: this.vueAnnonce(r.annonce, auteurs.get(r.annonce.companyId), t.companyId) };
  }

  /* --------------------------------------------------------------------------------------------- Conversations */

  private cote(c: Conversation, moi: string): "annonceur" | "autre" {
    return c.annonceurId === moi ? "annonceur" : "autre";
  }
  private async conversationDe(t: TenantContext, id: string): Promise<Conversation> {
    if (!isUuid(id)) throw notFound("Conversation");
    const c = await this.prisma.conversationMission.findFirst({ where: { id, OR: [{ annonceurId: t.companyId }, { autreId: t.companyId }] } });
    if (!c) throw notFound("Conversation");
    return c;
  }

  /**
   * Ouvrir une conversation : JAMAIS un contact libre. Mission : l'auteur de la mission, avec une entreprise qui y a
   * répondu. Disponibilité : une entreprise vérifiée, avec l'auteur de l'annonce publiée. Rappelée, elle rend la même.
   */
  async ouvrir(t: TenantContext, annonceId: string, autreIdDemande: string | null) {
    this.exiger();
    assertCanWrite(t);
    const a = await this.lisible(t, annonceId);
    const estAuteur = a.companyId === t.companyId;
    const autreId = estAuteur ? autreIdDemande : t.companyId;
    if (!autreId || !isUuid(autreId) || autreId === a.companyId) throw validationFailed("Cannot open", { reason: estAuteur ? "sans_reponse" : "soi_meme", phrase: PHRASE_REFUS_OUVERTURE[estAuteur ? "sans_reponse" : "soi_meme"] });
    const existante = await this.prisma.conversationMission.findUnique({ where: { annonceId_annonceurId_autreId: { annonceId, annonceurId: a.companyId, autreId } } });
    if (existante) return { id: existante.id, nouvelle: false };
    const [reponse, bloquees, verifiee, ouvertes] = await Promise.all([
      this.prisma.reponseMission.count({ where: { annonceId, companyId: autreId, statut: "envoyee" } }),
      this.bloquees(t.companyId),
      this.verifiee(t.companyId),
      this.prisma.conversationMission.count({ where: { ouvertePar: t.companyId, createdAt: { gte: new Date(this.now().getTime() - 86_400_000) } } }),
    ]);
    const refus = refusOuverture({ type: a.type as TypeAnnonce, statut: a.statut as StatutAnnonce, demandeurEstAuteur: estAuteur, reponseExiste: reponse > 0, bloque: bloquees.has(estAuteur ? autreId : a.companyId), demandeurVerifie: verifiee, ouvertesAujourdHui: ouvertes });
    if (refus) throw new DomainError(refus === "non_verifie" || refus === "bloque" ? "forbidden" : "validation_failed", "Cannot open conversation", { reason: refus, phrase: PHRASE_REFUS_OUVERTURE[refus] });
    try {
      const c = await this.prisma.conversationMission.create({ data: { annonceId, annonceurId: a.companyId, autreId, ouvertePar: t.companyId } });
      await this.tracer(t, "conversation_ouverte", { annonceId, conversationId: c.id });
      return { id: c.id, nouvelle: true };
    } catch (e) {
      // Deux ouvertures en même temps : la contrainte d'unicité n'en laisse qu'une, la seconde retrouve la première.
      const gagnee = await this.prisma.conversationMission.findUnique({ where: { annonceId_annonceurId_autreId: { annonceId, annonceurId: a.companyId, autreId } } });
      if (gagnee) return { id: gagnee.id, nouvelle: false };
      throw e;
    }
  }

  private nonLue(c: Conversation, moi: string): boolean {
    const lu = this.cote(c, moi) === "annonceur" ? c.luAnnonceurLe : c.luAutreLe;
    return !!c.dernierMessageLe && (!lu || lu < c.dernierMessageLe);
  }
  /** Le nombre de conversations où le dernier message vient de l'autre et n'a pas été lu. */
  async nonLus(t: TenantContext): Promise<number> {
    if (!this.reglage.actif) return 0;
    return (await this.conversations(t, "non-lues")).items.length;
  }

  async conversations(t: TenantContext, filtre: "toutes" | "non-lues" | "archivees") {
    this.exiger();
    const liste = await this.prisma.conversationMission.findMany({
      where: { OR: [{ annonceurId: t.companyId }, { autreId: t.companyId }] },
      orderBy: [{ dernierMessageLe: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      take: 200,
      include: { annonce: { select: { metier: true, lieu: true, type: true } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    const es = await this.entreprises(liste.map((c) => (c.annonceurId === t.companyId ? c.autreId : c.annonceurId)));
    const items = liste
      .map((c) => {
        const cote = this.cote(c, t.companyId);
        const dernier = c.messages[0];
        const partagees = !!c.coordonneesAnnonceurLe && !!c.coordonneesAutreLe;
        return {
          id: c.id,
          entreprise: es.get(cote === "annonceur" ? c.autreId : c.annonceurId)!,
          sujet: `${c.annonce.type === "mission" ? "Mission" : "Entreprise disponible"} · ${titreMission(c.annonce.metier, c.annonce.lieu)}`,
          extrait: dernier ? (partagees ? dernier.texte : masquerCoordonnees(dernier.texte)).slice(0, 120) : "Conversation ouverte, aucun message pour l'instant.",
          le: (c.dernierMessageLe ?? c.createdAt).toISOString(),
          // Un message que J'AI envoyé n'est jamais « non lu » pour moi.
          nonLu: this.nonLue(c, t.companyId) && dernier?.companyId !== t.companyId,
          archivee: !!(cote === "annonceur" ? c.archiveeAnnonceurLe : c.archiveeAutreLe),
          bloquee: !!c.bloqueeLe,
        };
      })
      .filter((c) => (filtre === "archivees" ? c.archivee : !c.archivee && (filtre === "toutes" || c.nonLu)));
    return { items };
  }

  /** Lire une conversation la marque lue pour MON côté ; les coordonnées n'apparaissent qu'après l'accord des deux. */
  async conversation(t: TenantContext, id: string) {
    this.exiger();
    const c = await this.conversationDe(t, id);
    const cote = this.cote(c, t.companyId);
    await this.prisma.conversationMission.update({ where: { id }, data: cote === "annonceur" ? { luAnnonceurLe: this.now() } : { luAutreLe: this.now() } });
    const autreId = cote === "annonceur" ? c.autreId : c.annonceurId;
    const [annonce, autre, messages] = await Promise.all([
      this.prisma.annonceMission.findUniqueOrThrow({ where: { id: c.annonceId } }),
      this.entreprise(autreId),
      this.prisma.messageMission.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" }, take: 500, include: { fichiers: { select: { id: true, nom: true, type: true, taille: true } } } }),
    ]);
    const moiOk = !!(cote === "annonceur" ? c.coordonneesAnnonceurLe : c.coordonneesAutreLe);
    const autreOk = !!(cote === "annonceur" ? c.coordonneesAutreLe : c.coordonneesAnnonceurLe);
    const etat = etatCoordonnees(moiOk, autreOk);
    const coordonnees = etat === "partagees" ? await this.prisma.company.findUniqueOrThrow({ where: { id: autreId }, select: { name: true, phone: true, contactEmail: true, prenom: true } }) : null;
    return {
      id: c.id,
      entreprise: autre,
      annonce: { id: annonce.id, type: annonce.type, titre: titreMission(annonce.metier, annonce.lieu), debut: jour(annonce.debut), fin: annonce.fin ? jour(annonce.fin) : null, statut: annonce.statut },
      coordonnees: { etat, ...(coordonnees ? { nom: coordonnees.name, contact: coordonnees.prenom, telephone: coordonnees.phone, email: coordonnees.contactEmail } : {}) },
      bloquee: !!c.bloqueeLe,
      bloqueeParMoi: c.bloqueePar === t.companyId,
      archivee: !!(cote === "annonceur" ? c.archiveeAnnonceurLe : c.archiveeAutreLe),
      messages: messages.map((m) => ({ id: m.id, deMoi: m.companyId === t.companyId, texte: etat === "partagees" || m.companyId === t.companyId ? m.texte : masquerCoordonnees(m.texte), le: m.createdAt.toISOString(), fichiers: m.fichiers })),
    };
  }

  /** Écrire : idempotent par `cle` (un envoi rejoué n'écrit qu'un message). Rend le message et dit s'il est nouveau. */
  async ecrire(t: TenantContext, id: string, texteBrut: string, cle: string, fichier?: { nom: string; type: string; contenu: Uint8Array }) {
    this.exiger();
    assertCanWrite(t);
    const c = await this.conversationDe(t, id);
    if (c.bloqueeLe) throw new DomainError("forbidden", "Blocked conversation", { reason: "bloquee", phrase: "Cette conversation est fermée." });
    const autreId = c.annonceurId === t.companyId ? c.autreId : c.annonceurId;
    if ((await this.bloquees(t.companyId)).has(autreId)) throw new DomainError("forbidden", "Blocked", { reason: "bloque", phrase: PHRASE_REFUS_OUVERTURE.bloque });
    const texte = (texteBrut ?? "").trim() || (fichier ? fichier.nom : "");
    const faute = fauteMessage(texte);
    if (faute) throw validationFailed("Invalid message", { reason: "message", phrase: faute });
    if (fichier) this.controlerFichier(fichier);
    const deja = await this.prisma.messageMission.findUnique({ where: { conversationId_cle: { conversationId: id, cle } } });
    if (deja) return { id: deja.id, nouveau: false };
    let message;
    try {
      message = await this.prisma.$transaction(async (tx) => {
        const m = await tx.messageMission.create({ data: { conversationId: id, companyId: t.companyId, userId: t.userId, texte, cle } });
        if (fichier) await tx.fichierPro.create({ data: { companyId: t.companyId, portee: "message", messageId: m.id, nom: fichier.nom, type: fichier.type, taille: fichier.contenu.byteLength, contenu: Buffer.from(fichier.contenu) } });
        const maintenant = this.now();
        await tx.conversationMission.update({ where: { id }, data: { dernierMessageLe: maintenant, ...(c.annonceurId === t.companyId ? { luAnnonceurLe: maintenant, archiveeAutreLe: null } : { luAutreLe: maintenant, archiveeAnnonceurLe: null }) } });
        return m;
      });
    } catch (e) {
      // Deux envois simultanés de la même clé : le second retrouve le message du premier.
      const gagne = await this.prisma.messageMission.findUnique({ where: { conversationId_cle: { conversationId: id, cle } } });
      if (gagne) return { id: gagne.id, nouveau: false };
      throw e;
    }
    const [moi, annonce, premier] = await Promise.all([this.entreprise(t.companyId), this.prisma.annonceMission.findUniqueOrThrow({ where: { id: c.annonceId }, select: { metier: true, lieu: true } }), this.prisma.messageMission.count({ where: { conversationId: id } })]);
    // L'e-mail ne part qu'au premier message d'une conversation ; ensuite la cloche et le push suffisent.
    await this.alerter(autreId, alerteNouveauMessage({ conversationId: id, entreprise: moi.nom, sujet: titreMission(annonce.metier, annonce.lieu), messageId: message.id }), premier > 1);
    return { id: message.id, nouveau: true };
  }

  /** « Proposer l'échange des coordonnées » : chacun accepte de son côté ; rien n'est montré avant les DEUX accords. */
  async coordonnees(t: TenantContext, id: string, accepte: boolean) {
    this.exiger();
    assertCanWrite(t);
    const c = await this.conversationDe(t, id);
    if (c.bloqueeLe) throw new DomainError("forbidden", "Blocked conversation", { reason: "bloquee", phrase: "Cette conversation est fermée." });
    const cote = this.cote(c, t.companyId);
    const dejaMoi = cote === "annonceur" ? c.coordonneesAnnonceurLe : c.coordonneesAutreLe;
    const autreOk = !!(cote === "annonceur" ? c.coordonneesAutreLe : c.coordonneesAnnonceurLe);
    // Retirer son accord reste possible tant que l'autre n'a pas accepté ; une fois partagées, elles le restent.
    if (!accepte && dejaMoi && autreOk) throw validationFailed("Already shared", { reason: "deja_partagees", phrase: "Les coordonnées sont déjà partagées." });
    const valeur = accepte ? (dejaMoi ?? this.now()) : null;
    await this.prisma.conversationMission.update({ where: { id }, data: cote === "annonceur" ? { coordonneesAnnonceurLe: valeur } : { coordonneesAutreLe: valeur } });
    await this.tracer(t, accepte ? "coordonnees_acceptees" : "coordonnees_retirees", { conversationId: id });
    if (accepte && !dejaMoi) {
      const moi = await this.entreprise(t.companyId);
      await this.alerter(cote === "annonceur" ? c.autreId : c.annonceurId, alerteCoordonnees({ conversationId: id, entreprise: moi.nom, partagees: autreOk }), true);
    }
    return { etat: etatCoordonnees(accepte, autreOk) };
  }

  async archiver(t: TenantContext, id: string, archive: boolean) {
    this.exiger();
    assertCanWrite(t);
    const c = await this.conversationDe(t, id);
    const valeur = archive ? this.now() : null;
    await this.prisma.conversationMission.update({ where: { id }, data: this.cote(c, t.companyId) === "annonceur" ? { archiveeAnnonceurLe: valeur } : { archiveeAutreLe: valeur } });
    return { archivee: archive };
  }

  /** Bloquer l'autre entreprise : la conversation se ferme, plus aucun échange ni annonce entre les deux. */
  async bloquer(t: TenantContext, id: string) {
    this.exiger();
    assertCanWrite(t);
    const c = await this.conversationDe(t, id);
    const cibleId = c.annonceurId === t.companyId ? c.autreId : c.annonceurId;
    await this.prisma.$transaction([
      this.prisma.blocageEntreprise.createMany({ data: [{ companyId: t.companyId, cibleId }], skipDuplicates: true }),
      this.prisma.conversationMission.updateMany({ where: { bloqueeLe: null, OR: [{ annonceurId: t.companyId, autreId: cibleId }, { annonceurId: cibleId, autreId: t.companyId }] }, data: { bloqueeLe: this.now(), bloqueePar: t.companyId } }),
    ]);
    await this.tracer(t, "blocage", { conversationId: id });
    return { bloquee: true };
  }

  async signaler(t: TenantContext, id: string, motif: string, precision: string | null) {
    this.exiger();
    assertCanWrite(t);
    const c = await this.conversationDe(t, id);
    if (!MOTIFS_SIGNALEMENT.some((m) => m.id === motif)) throw validationFailed("Unknown reason", { reason: "motif", phrase: "Choisis un motif." });
    const recent = await this.prisma.signalementMission.count({ where: { companyId: t.companyId, conversationId: id, createdAt: { gte: new Date(this.now().getTime() - 86_400_000) } } });
    if (recent > 0) return { signale: true, deja: true };
    await this.prisma.signalementMission.create({ data: { companyId: t.companyId, cibleId: c.annonceurId === t.companyId ? c.autreId : c.annonceurId, conversationId: id, annonceId: c.annonceId, motif, precision: precision?.trim().slice(0, 600) || null } });
    await this.tracer(t, "signalement", { conversationId: id }, { motif });
    return { signale: true, deja: false };
  }

  /** Admin : les signalements à lire (jamais accessible à une entreprise). */
  async signalements() {
    const liste = await this.prisma.signalementMission.findMany({ where: { traiteLe: null }, orderBy: { createdAt: "desc" }, take: 100 });
    const es = await this.entreprises(liste.flatMap((s) => [s.companyId, s.cibleId]));
    return { items: liste.map((s) => ({ id: s.id, de: es.get(s.companyId)?.nom ?? "?", cible: es.get(s.cibleId)?.nom ?? "?", motif: s.motif === MOTIF_IMAGE_PROFIL ? "Logo ou photo de profil à vérifier" : (libelleDe(MOTIFS_SIGNALEMENT, s.motif) ?? s.motif), precision: s.precision, le: s.createdAt.toISOString() })) };
  }

  /* --------------------------------------------------------------------------------------------- Fichiers */

  private controlerFichier(f: { nom: string; type: string; contenu: Uint8Array }) {
    const faute = fauteFichier({ nom: f.nom, type: f.type, taille: f.contenu.byteLength }, f.contenu.subarray(0, 16));
    if (faute) throw validationFailed("Invalid file", { reason: `fichier_${faute}`, phrase: PHRASE_FAUTE_FICHIER[faute] });
  }

  async joindreAAnnonce(t: TenantContext, annonceId: string, f: { nom: string; type: string; contenu: Uint8Array }) {
    this.exiger();
    assertCanWrite(t);
    const a = await this.mienne(t, annonceId);
    if (a.statut === "fermee") throw validationFailed("Closed ad", { reason: "annonce_fermee", phrase: "Une annonce fermée ne se modifie plus." });
    this.controlerFichier(f);
    if ((await this.prisma.fichierPro.count({ where: { annonceId, portee: "annonce" } })) >= FICHIERS_PAR_ANNONCE) throw validationFailed("Too many files", { reason: "trop_de_fichiers", phrase: `${FICHIERS_PAR_ANNONCE} fichiers au plus par annonce.` });
    const cree = await this.prisma.fichierPro.create({ data: { companyId: t.companyId, portee: "annonce", annonceId, nom: f.nom, type: f.type, taille: f.contenu.byteLength, contenu: Buffer.from(f.contenu) }, select: { id: true, nom: true, type: true, taille: true } });
    return cree;
  }

  async dossier(t: TenantContext) {
    this.exiger();
    const liste = await this.prisma.fichierPro.findMany({ where: { companyId: t.companyId, portee: "dossier" }, select: { id: true, categorie: true, titre: true, nom: true, type: true, taille: true, surProfil: true, createdAt: true }, orderBy: { createdAt: "desc" } });
    return { categories: CATEGORIES_DOCUMENT, items: liste.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })) };
  }

  async ajouterAuDossier(t: TenantContext, categorie: string, titre: string | null, f: { nom: string; type: string; contenu: Uint8Array }) {
    this.exiger();
    assertCanWrite(t);
    if (!CATEGORIES_DOCUMENT.some((c) => c.id === (categorie as CategorieDocument))) throw validationFailed("Unknown category", { reason: "categorie", phrase: "Rubrique inconnue." });
    this.controlerFichier(f);
    if ((await this.prisma.fichierPro.count({ where: { companyId: t.companyId, portee: "dossier" } })) >= DOCUMENTS_PAR_ENTREPRISE) throw validationFailed("Too many documents", { reason: "trop_de_documents", phrase: `${DOCUMENTS_PAR_ENTREPRISE} documents au plus dans ton dossier.` });
    const d = await this.prisma.fichierPro.create({ data: { companyId: t.companyId, portee: "dossier", categorie, titre: titre?.trim().slice(0, 120) || null, nom: f.nom, type: f.type, taille: f.contenu.byteLength, contenu: Buffer.from(f.contenu) }, select: { id: true, categorie: true, titre: true, nom: true, type: true, taille: true, surProfil: true } });
    return d;
  }

  async modifierDocument(t: TenantContext, id: string, maj: { titre?: string | null; surProfil?: boolean }) {
    this.exiger();
    assertCanWrite(t);
    if (!isUuid(id)) throw notFound("Document");
    const r = await this.prisma.fichierPro.updateMany({ where: { id, companyId: t.companyId, portee: "dossier" }, data: { ...(maj.titre !== undefined ? { titre: maj.titre?.trim().slice(0, 120) || null } : {}), ...(maj.surProfil !== undefined ? { surProfil: maj.surProfil } : {}) } });
    if (r.count === 0) throw notFound("Document");
    return { modifie: true };
  }

  /** Supprimer un de MES fichiers : il disparaît aussi des réponses où il était partagé. */
  async supprimerFichier(t: TenantContext, id: string) {
    this.exiger();
    assertCanWrite(t);
    if (!isUuid(id)) throw notFound("Fichier");
    const f = await this.prisma.fichierPro.findFirst({ where: { id, companyId: t.companyId, portee: { in: ["dossier", "annonce"] } }, select: { id: true } });
    if (!f) throw notFound("Fichier");
    const partages = await this.prisma.reponseMission.findMany({ where: { companyId: t.companyId, documentIds: { has: id } }, select: { id: true, documentIds: true } });
    await this.prisma.$transaction([
      ...partages.map((r) => this.prisma.reponseMission.update({ where: { id: r.id }, data: { documentIds: r.documentIds.filter((d) => d !== id) } })),
      this.prisma.fichierPro.delete({ where: { id } }),
    ]);
    return { supprime: true };
  }

  /**
   * QUI PEUT OUVRIR UN FICHIER : son propriétaire ; pour une pièce d'annonce, une entreprise qui peut lire l'annonce ; pour
   * une pièce de message, les deux entreprises de la conversation ; pour un document du dossier, l'auteur d'une mission à
   * laquelle le propriétaire a répondu EN LE PARTAGEANT, ou toute entreprise vérifiée si le propriétaire l'a mis sur son
   * profil public visible. Rien d'autre, et jamais une entreprise bloquée.
   */
  private async peutOuvrir(t: TenantContext, f: { id: string; companyId: string; portee: string; annonceId: string | null; messageId: string | null; surProfil: boolean }): Promise<boolean> {
    if (f.companyId === t.companyId) return true;
    if ((await this.bloquees(t.companyId)).has(f.companyId)) return false;
    if (f.portee === "annonce" && f.annonceId) return this.lisible(t, f.annonceId).then(() => true, () => false);
    if (f.portee === "message" && f.messageId) return (await this.prisma.messageMission.count({ where: { id: f.messageId, conversation: { bloqueeLe: null, OR: [{ annonceurId: t.companyId }, { autreId: t.companyId }] } } })) > 0;
    if (f.portee === "dossier") {
      if ((await this.prisma.reponseMission.count({ where: { companyId: f.companyId, statut: "envoyee", documentIds: { has: f.id }, annonce: { companyId: t.companyId } } })) > 0) return true;
      if (f.surProfil && (await this.verifiee(t.companyId))) return (await this.prisma.profilPublic.count({ where: { companyId: f.companyId, visible: true } })) > 0;
    }
    return false;
  }
  private signer(fichierId: string, companyId: string, expire: number): string {
    return createHmac("sha256", this.reglage.secret).update(`fichier-pro.${fichierId}.${companyId}.${expire}`).digest("base64url");
  }

  /** Un lien PRIVÉ ET TEMPORAIRE (5 minutes), lié à l'entreprise qui le demande : il ne sert à personne d'autre. */
  async lienFichier(t: TenantContext, id: string) {
    this.exiger();
    if (!isUuid(id)) throw notFound("Fichier");
    const f = await this.prisma.fichierPro.findUnique({ where: { id }, select: { id: true, companyId: true, portee: true, annonceId: true, messageId: true, surProfil: true } });
    if (!f || !(await this.peutOuvrir(t, f))) throw notFound("Fichier");
    const expire = this.now().getTime() + LIEN_FICHIER_MS;
    return { url: `/v1/fichiers-pro/ouvrir/${id}.${expire}.${this.signer(id, t.companyId, expire)}`, expireLe: new Date(expire).toISOString() };
  }

  /** Ouvre le fichier d'un lien : signature, échéance ET droit d'accès revérifiés (un droit retiré entre-temps ferme le lien). */
  async ouvrirFichier(t: TenantContext, jeton: string) {
    this.exiger();
    const [id, expireTexte, signature] = jeton.split(".");
    const expire = Number(expireTexte);
    if (!id || !signature || !isUuid(id) || !Number.isFinite(expire)) throw notFound("Fichier");
    const attendue = Buffer.from(this.signer(id, t.companyId, expire));
    const recue = Buffer.from(signature);
    if (attendue.length !== recue.length || !timingSafeEqual(attendue, recue)) throw notFound("Fichier");
    if (expire < this.now().getTime()) throw new DomainError("forbidden", "Link expired", { reason: "lien_expire", phrase: "Ce lien a expiré. Rouvre le document depuis l'application." });
    const f = await this.prisma.fichierPro.findUnique({ where: { id } });
    if (!f || !(await this.peutOuvrir(t, f))) throw notFound("Fichier");
    return { nom: f.nom, type: f.type, contenu: new Uint8Array(f.contenu) };
  }

  /* --------------------------------------------------------------------------------------------- Profil public */

  async monProfil(t: TenantContext) {
    this.exiger();
    const [e, p, dispo, docs] = await Promise.all([
      this.entreprise(t.companyId),
      this.prisma.profilPublic.findUnique({ where: { companyId: t.companyId } }),
      this.prisma.annonceMission.findFirst({ where: { companyId: t.companyId, type: "disponibilite", statut: "publiee" }, orderBy: { createdAt: "desc" } }),
      this.prisma.fichierPro.groupBy({ by: ["categorie"], where: { companyId: t.companyId, portee: "dossier" }, _count: true }),
    ]);
    return { entreprise: e, visible: p?.visible ?? false, presentation: p?.presentation ?? null, metiers: p?.metiers ?? [], services: p?.services ?? null, equipe: p?.equipe ?? null, ville: p?.ville ?? null, disponibilite: dispo ? this.vueAnnonce(dispo, e, t.companyId) : null, documents: Object.fromEntries(docs.map((d) => [d.categorie ?? "autre", d._count])) };
  }

  async enregistrerProfil(t: TenantContext, s: { visible: boolean; presentation: string | null; metiers: string[]; services: string | null; equipe: string | null; ville: string | null }) {
    this.exiger();
    assertCanWrite(t);
    if (s.visible && !(await this.verifiee(t.companyId))) throw new DomainError("forbidden", "Company not verified", { reason: "non_verifie", phrase: "Vérifie d'abord ton entreprise (SIRET) pour rendre ton profil visible." });
    const d = { visible: s.visible, presentation: s.presentation?.trim() || null, metiers: s.metiers.map((m) => m.trim()).filter(Boolean).slice(0, 8), services: s.services?.trim() || null, equipe: s.equipe?.trim() || null, ville: s.ville?.trim() || null };
    await this.prisma.profilPublic.upsert({ where: { companyId: t.companyId }, create: { companyId: t.companyId, ...d }, update: d });
    await this.tracer(t, "profil_public", {}, { visible: d.visible });
    return this.monProfil(t);
  }

  /** Le profil d'une AUTRE entreprise : seulement s'il est visible, ou si une annonce, une réponse ou une conversation nous lie. */
  async profil(t: TenantContext, companyId: string) {
    this.exiger();
    if (!isUuid(companyId)) throw notFound("Profil");
    if (companyId === t.companyId) return { ...(await this.monProfil(t)), realisations: [] };
    if ((await this.bloquees(t.companyId)).has(companyId)) throw notFound("Profil");
    const p = await this.prisma.profilPublic.findUnique({ where: { companyId } });
    const lie =
      (await this.prisma.conversationMission.count({ where: { OR: [{ annonceurId: t.companyId, autreId: companyId }, { annonceurId: companyId, autreId: t.companyId }] } })) +
      (await this.prisma.reponseMission.count({ where: { companyId, statut: "envoyee", annonce: { companyId: t.companyId } } })) +
      (await this.prisma.annonceMission.count({ where: { companyId, statut: "publiee" } }));
    if (!p?.visible && !lie) throw notFound("Profil");
    const [e, dispo, realisations] = await Promise.all([
      this.entreprise(companyId),
      this.prisma.annonceMission.findFirst({ where: { companyId, type: "disponibilite", statut: "publiee" }, orderBy: { createdAt: "desc" } }),
      p?.visible ? this.prisma.fichierPro.findMany({ where: { companyId, portee: "dossier", surProfil: true }, select: { id: true, categorie: true, titre: true, nom: true, type: true, taille: true }, take: 24 }) : [],
    ]);
    return { entreprise: e, visible: p?.visible ?? false, presentation: p?.visible ? masquerSi(companyId !== t.companyId, p.presentation) : null, metiers: p?.visible ? p.metiers : [], services: p?.visible ? masquerSi(companyId !== t.companyId, p.services) : null, equipe: p?.visible ? p.equipe : null, ville: p?.visible ? p.ville : null, disponibilite: dispo ? this.vueAnnonce(dispo, e, t.companyId) : null, realisations };
  }

  /* --------------------------------------------------------------------------------------------- Image du profil */

  /**
   * Le logo ou la photo de MON entreprise (Greg, 12 novembre 2026). Le fichier est contrôlé sur ses octets (jamais sur
   * son nom), doit être carré et léger, et ses métadonnées (lieu, appareil, date, auteur) sont retirées avant qu'il soit
   * gardé. Une seule image par entreprise : en déposer une autre la remplace.
   */
  async deposerImageProfil(t: TenantContext, octets: Uint8Array) {
    this.exiger();
    assertCanWrite(t);
    const propre = nettoyerImageProfil(octets);
    if ("faute" in propre) throw validationFailed("Invalid profile image", { reason: `image_${propre.faute}`, phrase: PHRASE_FAUTE_IMAGE_PROFIL[propre.faute] });
    const d = { type: propre.type, contenu: new Uint8Array(propre.contenu), taille: propre.contenu.byteLength, cote: propre.cote };
    await this.prisma.imageProfil.upsert({ where: { companyId: t.companyId }, create: { companyId: t.companyId, ...d }, update: d });
    await this.tracer(t, "image_profil", {}, { geste: "deposee" });
    return this.entreprise(t.companyId);
  }

  async retirerImageProfil(t: TenantContext) {
    this.exiger();
    assertCanWrite(t);
    await this.prisma.imageProfil.deleteMany({ where: { companyId: t.companyId } });
    await this.tracer(t, "image_profil", {}, { geste: "retiree" });
    return this.entreprise(t.companyId);
  }

  /** L'image d'une entreprise, pour un compte connecté ; une entreprise bloquée (dans un sens ou dans l'autre) répond 404. */
  async imageProfil(t: TenantContext, companyId: string): Promise<{ type: string; contenu: Uint8Array }> {
    this.exiger();
    if (!isUuid(companyId)) throw notFound("Image");
    if (companyId !== t.companyId && (await this.bloquees(t.companyId)).has(companyId)) throw notFound("Image");
    const i = await this.prisma.imageProfil.findUnique({ where: { companyId } });
    if (!i) throw notFound("Image");
    return { type: i.type, contenu: new Uint8Array(i.contenu) };
  }

  /** Signaler l'image d'une autre entreprise à l'équipe Mobiiz (un seul signalement par jour et par image). */
  async signalerImageProfil(t: TenantContext, companyId: string) {
    this.exiger();
    assertCanWrite(t);
    if (!isUuid(companyId) || companyId === t.companyId) throw notFound("Image");
    if (!(await this.prisma.imageProfil.count({ where: { companyId } }))) throw notFound("Image");
    const recent = await this.prisma.signalementMission.count({ where: { companyId: t.companyId, cibleId: companyId, motif: MOTIF_IMAGE_PROFIL, createdAt: { gte: new Date(this.now().getTime() - 86_400_000) } } });
    if (recent > 0) return { signale: true, deja: true };
    await this.prisma.signalementMission.create({ data: { companyId: t.companyId, cibleId: companyId, motif: MOTIF_IMAGE_PROFIL } });
    await this.tracer(t, "signalement", {}, { motif: MOTIF_IMAGE_PROFIL });
    return { signale: true, deja: false };
  }
}

/** Un texte libre vu par une AUTRE entreprise : numéro, e-mail et adresse de site masqués. */
function masquerSi(autre: boolean, texte: string | null): string | null {
  return autre && texte ? masquerCoordonnees(texte) : texte;
}
