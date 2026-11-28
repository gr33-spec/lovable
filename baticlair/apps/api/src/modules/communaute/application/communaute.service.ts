import { randomBytes } from "node:crypto";
import {
  ALPHABET_INVITATION,
  codeInvitationValide,
  CONSENTEMENT_LISTE_ATTENTE,
  DELAI_SUIVI_INVITATION_MS,
  departement as departementConnu,
  estOuvert,
  LOT_ANNONCE,
  messageInvitation,
  PHRASE_DISPONIBILITE,
  PHRASE_INVITATION,
  phraseSurLaListe,
  publicDe,
  questionListeAttente,
  sujetAnnonce,
  texteAnnonce,
  TRADES,
  zoneDuCodePostal,
  type Ouverture,
} from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import type { TransactionalEmailSender } from "../../../platform/email/email.port.js";
import { DomainError } from "../../../platform/errors/domain-error.js";
import { estExclu } from "../../privacy/index.js";

const METIERS = new Set(TRADES.map((t) => t.id));
export const metierConnu = (m: string): boolean => METIERS.has(m);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Le département lisible « 22 · Côtes-d'Armor ». */
const nomDep = (code: string) => departementConnu(code)?.nom ?? code;

/** Une adresse e-mail à moitié masquée (« g•••@hotmail.fr ») : le journal de l'admin n'a pas besoin de plus. */
export const masquerEmail = (email: string): string => {
  const [nom, domaine] = email.split("@");
  return `${(nom ?? "").slice(0, 1)}•••@${domaine ?? ""}`;
};

/**
 * CHANTIER 05 (Greg, 28 novembre 2026) : la liste d'attente par métier et département, l'annonce d'ouverture aux inscrits
 * (petits lots, une fois chacun, journal), et les invitations entre artisans (le suivi seul, sans récompense).
 */
export class CommunauteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: TransactionalEmailSender,
    private readonly webAppUrl: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Les couples métier et département ouverts par une annonce de l'admin (en plus de ceux du lancement). */
  async ouverturesAnnoncees(): Promise<Ouverture[]> {
    const annonces = await this.prisma.annonceOuverture.findMany({ select: { metier: true, departements: true } });
    return annonces.flatMap((a) => a.departements.map((departement) => ({ metier: a.metier, departement })));
  }

  /** Le métier (le premier de l'entreprise) et le département (celui de la carte, sinon celui de l'adresse). */
  private async situation(companyId: string): Promise<{ metier: string; departement: string | null }> {
    const c = await this.prisma.company.findUnique({ where: { id: companyId }, select: { trades: true, departement: true, address: true } });
    if (!c) throw new DomainError("not_found", "Company not found");
    return { metier: c.trades[0] ?? "other", departement: departementConnu(c.departement)?.code ?? zoneDuCodePostal(c.address) };
  }

  /** Ce que l'accueil montre : l'état de la liste d'attente de l'entreprise, et son lien d'invitation. */
  async etat(companyId: string) {
    const { metier, departement } = await this.situation(companyId);
    const ouvert = estOuvert(metier, departement, await this.ouverturesAnnoncees());
    const ligne = await this.prisma.listeAttenteMetier.findFirst({ where: { companyId, metier }, select: { desinscritLe: true, prevenuLe: true } });
    const inscrit = !!ligne && !ligne.desinscritLe;
    return {
      attente: {
        metier,
        departement: departement ? { code: departement, nom: nomDep(departement) } : null,
        ouvert,
        inscrit,
        prevenu: !!ligne?.prevenuLe,
        phrase: phraseSurLaListe(metier, departement),
        question: questionListeAttente(metier, departement),
        disponibilite: PHRASE_DISPONIBILITE,
        consentement: CONSENTEMENT_LISTE_ATTENTE.texte,
      },
      invitation: await this.invitation(companyId),
    };
  }

  /**
   * L'inscription à la liste d'attente, sur un choix explicite (`consentement`). Une ligne par e-mail et par métier : une
   * deuxième inscription la met à jour, jamais un doublon ; une ancienne désinscription est levée par ce nouveau choix.
   */
  async inscrire(companyId: string, email: string) {
    const { metier, departement } = await this.situation(companyId);
    if (estOuvert(metier, departement, await this.ouverturesAnnoncees())) throw new DomainError("conflict", "Already open", { reason: "deja_ouvert" });
    const adresse = email.trim().toLowerCase();
    const consentement = { consentementLe: this.now(), consentementVersion: CONSENTEMENT_LISTE_ATTENTE.version, desinscritLe: null };
    await this.prisma.listeAttenteMetier.upsert({
      where: { email_metier: { email: adresse, metier } },
      create: { email: adresse, metier, departement, source: "app", companyId, ...consentement },
      update: { companyId, ...(departement ? { departement } : {}), ...consentement },
    });
    return this.etat(companyId);
  }

  /** « Me désinscrire » depuis l'application. */
  async desinscrireCompte(companyId: string) {
    await this.prisma.listeAttenteMetier.updateMany({ where: { companyId, desinscritLe: null }, data: { desinscritLe: this.now() } });
    return this.etat(companyId);
  }

  /** La désinscription en un clic, par le lien de l'e-mail. Toujours la même réponse : un jeton ne se devine pas. */
  async desinscrireParJeton(jeton: string): Promise<void> {
    if (!UUID.test(jeton)) return;
    await this.prisma.listeAttenteMetier.updateMany({ where: { jeton, desinscritLe: null }, data: { desinscritLe: this.now() } });
  }

  /** L'inscription sans compte (l'ancienne liste publique), désormais avec le choix explicite noté. */
  consentementPublic() {
    return { consentementLe: this.now(), consentementVersion: CONSENTEMENT_LISTE_ATTENTE.version, desinscritLe: null };
  }

  // ------------------------------------------------------------------------------------------------ Invitations

  private nouveauCode(): string {
    const octets = randomBytes(10);
    return Array.from(octets, (o) => ALPHABET_INVITATION[o % ALPHABET_INVITATION.length]).join("");
  }

  /** Le lien personnel de l'entreprise, créé à la première demande. */
  async invitation(companyId: string) {
    let ligne = await this.prisma.invitationArtisan.findUnique({ where: { companyId }, select: { code: true } });
    for (let essai = 0; !ligne && essai < 5; essai++) {
      try {
        ligne = await this.prisma.invitationArtisan.create({ data: { companyId, code: this.nouveauCode() }, select: { code: true } });
      } catch {
        // Un code déjà pris (très rare) ou deux onglets au même instant : on relit, puis on retente.
        ligne = await this.prisma.invitationArtisan.findUnique({ where: { companyId }, select: { code: true } });
      }
    }
    if (!ligne) throw new DomainError("internal_error", "No invitation code");
    const lien = `${this.webAppUrl}/invitation/${ligne.code}`;
    return { code: ligne.code, lien, phrase: PHRASE_INVITATION, message: messageInvitation(lien) };
  }

  /**
   * Une entreprise qui vient de s'inscrire par un lien d'invitation. Rien n'est noté si le code est faux, si c'est son
   * propre lien, si elle a déjà été invitée, ou si elle existait déjà depuis plus d'un jour. Aucune récompense.
   */
  async suivreInvitation(companyId: string, code: string): Promise<{ suivi: boolean }> {
    const c = code.trim().toLowerCase();
    if (!codeInvitationValide(c)) return { suivi: false };
    const [lien, invite] = await Promise.all([
      this.prisma.invitationArtisan.findUnique({ where: { code: c }, select: { companyId: true } }),
      this.prisma.company.findUnique({ where: { id: companyId }, select: { createdAt: true } }),
    ]);
    if (!lien || !invite || lien.companyId === companyId) return { suivi: false };
    if (this.now().getTime() - invite.createdAt.getTime() > DELAI_SUIVI_INVITATION_MS) return { suivi: false };
    try {
      await this.prisma.invitationSuivi.create({ data: { inviteurId: lien.companyId, inviteId: companyId, code: c } });
      return { suivi: true };
    } catch {
      return { suivi: false };
    }
  }

  /** L'admin : qui a invité qui (le nom de l'entreprise, sinon l'e-mail de son compte), les plus récents d'abord. */
  async invitations() {
    const lignes = await this.prisma.invitationSuivi.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { createdAt: true, inviteurId: true, inviteur: { select: { name: true, memberships: { where: { role: "owner" }, take: 1, select: { user: { select: { email: true } } } } } }, invite: { select: { name: true, trades: true, departement: true, memberships: { where: { role: "owner" }, take: 1, select: { user: { select: { email: true } } } } } } },
    });
    const nom = (c: { name: string; memberships: { user: { email: string } }[] }) => c.name.trim() || c.memberships[0]?.user.email || "Entreprise sans nom";
    const parInviteur = new Map<string, { inviteur: string; nombre: number }>();
    for (const l of lignes) {
      const v = parInviteur.get(l.inviteurId) ?? { inviteur: nom(l.inviteur), nombre: 0 };
      v.nombre += 1;
      parInviteur.set(l.inviteurId, v);
    }
    return {
      total: await this.prisma.invitationSuivi.count(),
      liensCrees: await this.prisma.invitationArtisan.count(),
      parInviteur: [...parInviteur.values()].sort((a, b) => b.nombre - a.nombre),
      suivis: lignes.map((l) => ({ inviteur: nom(l.inviteur), invite: nom(l.invite), metier: l.invite.trades[0] ?? null, departement: l.invite.departement, le: l.createdAt.toISOString() })),
    };
  }

  // ------------------------------------------------------------------------------------------------ Annonces

  /** Les inscrits qu'une annonce préviendrait : du métier, des départements choisis, inscrits, jamais prévenus. */
  private eligibles(metier: string, departements: readonly string[]) {
    return {
      metier,
      departement: { in: [...departements] },
      desinscritLe: null,
      prevenuLe: null,
      envoi: { is: null },
      // Un inscrit de l'application a toujours son choix noté ; l'ancienne liste publique (sans compte) avait laissé son
      // e-mail exprès pour être prévenue de l'ouverture.
      OR: [{ consentementLe: { not: null } }, { companyId: null }],
    };
  }

  private exemple(metier: string, code: string) {
    return texteAnnonce({
      metier,
      departement: { code, nom: nomDep(code) },
      aUnCompte: true,
      lienAction: `${this.webAppUrl}/connexion`,
      lienDesinscription: `${this.webAppUrl}/liste-attente/desinscription?jeton=…`,
    });
  }

  /** Ce que l'admin voit AVANT de confirmer : combien seront prévenus, par département, et l'e-mail tel qu'il partira. */
  async apercu(metier: string, departements: readonly string[]) {
    const deps = [...new Set(departements.map((d) => departementConnu(d)?.code).filter((d): d is string => !!d))];
    const actifs = await this.prisma.listeAttenteMetier.groupBy({ by: ["departement"], where: { metier, desinscritLe: null }, _count: { _all: true } });
    const [nombre, dejaPrevenus, desinscrits, sansDepartement, annoncees] = await Promise.all([
      deps.length ? this.prisma.listeAttenteMetier.count({ where: this.eligibles(metier, deps) }) : 0,
      deps.length ? this.prisma.listeAttenteMetier.count({ where: { metier, departement: { in: deps }, prevenuLe: { not: null } } }) : 0,
      deps.length ? this.prisma.listeAttenteMetier.count({ where: { metier, departement: { in: deps }, desinscritLe: { not: null } } }) : 0,
      this.prisma.listeAttenteMetier.count({ where: { metier, departement: null, desinscritLe: null } }),
      this.ouverturesAnnoncees(),
    ]);
    const premier = deps[0] ?? "22";
    return {
      metier,
      departements: deps.map((code) => ({ code, nom: nomDep(code), dejaOuvert: estOuvert(metier, code, annoncees) })),
      nombre,
      dejaPrevenus,
      desinscrits,
      sansDepartement,
      parDepartement: actifs
        .filter((a) => a.departement)
        .map((a) => ({ code: a.departement!, nom: nomDep(a.departement!), nombre: a._count._all }))
        .sort((a, b) => b.nombre - a.nombre || a.code.localeCompare(b.code)),
      sujet: sujetAnnonce(metier, { code: premier, nom: nomDep(premier) }),
      texte: this.exemple(metier, premier),
      public: publicDe(metier, deps.length === 1 ? premier : null),
    };
  }

  /**
   * L'admin confirme : l'annonce ouvre le couple métier et département(s) et prépare un envoi par inscrit (jamais deux,
   * `annonce_envoi.liste_attente_id` est unique). Le nombre confirmé doit être celui de l'aperçu, sinon on refait l'aperçu.
   */
  async annoncer(auteur: string, metier: string, departements: readonly string[], nombreConfirme: number) {
    const deps = [...new Set(departements.map((d) => departementConnu(d)?.code).filter((d): d is string => !!d))];
    if (!metierConnu(metier) || deps.length === 0) throw new DomainError("validation_failed", "Unknown trade or department", { reason: "metier_ou_departement" });
    return this.prisma.$transaction(async (tx) => {
      const ids = await tx.listeAttenteMetier.findMany({ where: this.eligibles(metier, deps), select: { id: true } });
      if (ids.length !== nombreConfirme) throw new DomainError("conflict", "The number changed", { reason: "nombre_change", nombre: ids.length });
      const annonce = await tx.annonceOuverture.create({ data: { metier, departements: deps, auteur, total: ids.length, termineeLe: ids.length ? null : this.now() } });
      const crees = await tx.annonceEnvoi.createMany({ data: ids.map((l) => ({ annonceId: annonce.id, listeAttenteId: l.id })), skipDuplicates: true });
      if (crees.count !== ids.length) await tx.annonceOuverture.update({ where: { id: annonce.id }, data: { total: crees.count } });
      return { id: annonce.id, total: crees.count };
    });
  }

  /**
   * Un petit lot d'une annonce (`LOT_ANNONCE` e-mails) : chaque envoi est pris sous condition (`a_envoyer` → `en_cours`),
   * donc deux lots lancés en même temps n'envoient jamais deux fois le même e-mail. Un désinscrit ou un contact exclu entre
   * la confirmation et l'envoi est annulé. Chaque e-mail part seul, à un seul destinataire.
   */
  async lot(annonceId: string) {
    const annonce = await this.prisma.annonceOuverture.findUnique({ where: { id: annonceId } });
    if (!annonce) throw new DomainError("not_found", "Announcement not found");
    const envois = await this.prisma.annonceEnvoi.findMany({
      where: { annonceId, statut: "a_envoyer" },
      orderBy: { createdAt: "asc" },
      take: LOT_ANNONCE,
      include: { listeAttente: true },
    });
    const bilan = { envoyes: 0, echecs: 0, annules: 0 };
    for (const e of envois) {
      const pris = await this.prisma.annonceEnvoi.updateMany({ where: { id: e.id, statut: "a_envoyer" }, data: { statut: "en_cours" } });
      if (pris.count === 0) continue;
      const la = e.listeAttente;
      if (la.desinscritLe || la.prevenuLe || (await estExclu(this.prisma, { email: la.email }))) {
        await this.prisma.annonceEnvoi.update({ where: { id: e.id }, data: { statut: "annule" } });
        bilan.annules += 1;
        continue;
      }
      const code = la.departement ?? annonce.departements[0]!;
      try {
        await this.emails.send({
          to: la.email,
          subject: sujetAnnonce(annonce.metier, { code, nom: nomDep(code) }),
          text: texteAnnonce({
            metier: annonce.metier,
            departement: { code, nom: nomDep(code) },
            aUnCompte: !!la.companyId,
            lienAction: la.companyId ? `${this.webAppUrl}/connexion` : `${this.webAppUrl}/commencer`,
            lienDesinscription: `${this.webAppUrl}/liste-attente/desinscription?jeton=${la.jeton}`,
          }),
          mustDeliver: true,
        });
        const le = this.now();
        await this.prisma.$transaction([
          this.prisma.annonceEnvoi.update({ where: { id: e.id }, data: { statut: "envoye", envoyeLe: le, erreur: null } }),
          this.prisma.listeAttenteMetier.update({ where: { id: la.id }, data: { prevenuLe: le } }),
        ]);
        bilan.envoyes += 1;
      } catch (err) {
        await this.prisma.annonceEnvoi.update({ where: { id: e.id }, data: { statut: "echec", erreur: (err instanceof Error ? err.message : "erreur").slice(0, 200) } });
        bilan.echecs += 1;
      }
    }
    const restants = await this.prisma.annonceEnvoi.count({ where: { annonceId, statut: { in: ["a_envoyer", "en_cours"] } } });
    if (restants === 0 && !annonce.termineeLe) await this.prisma.annonceOuverture.update({ where: { id: annonceId }, data: { termineeLe: this.now() } });
    return { ...bilan, restants };
  }

  /** « Réessayer les échecs » : un e-mail qui n'est pas parti peut repartir (il n'a jamais été reçu). */
  async relancerEchecs(annonceId: string) {
    const r = await this.prisma.annonceEnvoi.updateMany({ where: { annonceId, statut: "echec" }, data: { statut: "a_envoyer" } });
    if (r.count) await this.prisma.annonceOuverture.update({ where: { id: annonceId }, data: { termineeLe: null } });
    return { relances: r.count };
  }

  /** Le journal des annonces : chacune, son public et ce qui est parti ; les envois d'une annonce, adresses masquées. */
  async annonces() {
    const annonces = await this.prisma.annonceOuverture.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    const comptes = await this.prisma.annonceEnvoi.groupBy({ by: ["annonceId", "statut"], where: { annonceId: { in: annonces.map((a) => a.id) } }, _count: { _all: true } });
    return {
      annonces: annonces.map((a) => {
        const par = (s: string) => comptes.find((c) => c.annonceId === a.id && c.statut === s)?._count._all ?? 0;
        return {
          id: a.id,
          metier: a.metier,
          public: publicDe(a.metier, a.departements.length === 1 ? a.departements[0]! : null),
          departements: a.departements.map((code) => ({ code, nom: nomDep(code) })),
          auteur: a.auteur,
          le: a.createdAt.toISOString(),
          termineeLe: a.termineeLe?.toISOString() ?? null,
          total: a.total,
          envoyes: par("envoye"),
          aEnvoyer: par("a_envoyer") + par("en_cours"),
          echecs: par("echec"),
          annules: par("annule"),
        };
      }),
    };
  }

  async journal(annonceId: string) {
    const envois = await this.prisma.annonceEnvoi.findMany({ where: { annonceId }, orderBy: { createdAt: "asc" }, take: 2000, select: { statut: true, envoyeLe: true, erreur: true, listeAttente: { select: { email: true, departement: true } } } });
    return { envois: envois.map((e) => ({ destinataire: masquerEmail(e.listeAttente.email), departement: e.listeAttente.departement, statut: e.statut, envoyeLe: e.envoyeLe?.toISOString() ?? null, erreur: e.erreur })) };
  }
}
