import { AI_ADDITION, AI_DOUBT, FORBIDDEN, METIER_NAMES, RATIO, REFERENTIALS, referentialFor, tradeIdOf, type EngineAnswer } from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { BillingService } from "../../billing/index.js";
import type { DocumentsService } from "../../documents/index.js";
import type { ProjectsService } from "../../projects/index.js";
import { takeoffDto, type ReviewedTakeoff, type TakeoffService } from "../../takeoff/index.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import { quantitatifView } from "./quantitatif-view.js";

export interface LigneEntree {
  libelle: string;
  quantite: string | null;
  unite: string | null;
  prix: string | null;
  reference?: string | null;
}

export interface Contexte {
  projetId?: string | undefined;
  reference?: string | undefined;
  /** Adresse ou code postal du chantier : la zone climatique en dépend (jamais demandée). */
  adresse?: string | undefined;
  /** Infos chantier facultatives : texte libre de l'artisan (mesures nommées, contexte). Remplace la note du chantier. */
  infos?: string | undefined;
  /** Métier du devis (« couverture », « platrerie ») : choisit le référentiel (§22). Absent : le métier de l'entreprise. */
  metier?: string | undefined;
  /** Clé API partenaire à l'origine de l'appel : le quantitatif lui est compté (quota mensuel). */
  apiKey?: { id: string; monthlyQuota: number } | undefined;
}

/** `ecran` : l'appli reçoit en plus le détail de son écran (lignes lues, décisions, preuves). */
export interface Rendu {
  ecran?: boolean | undefined;
}

export type Correction =
  | { action: "modifier"; cle: string; valeur: string; unite?: string | undefined }
  | { action: "ajouter"; ligne: LigneEntree; depuisApercu?: boolean }
  | { action: "modifier_ligne"; id: string; ligne: LigneEntree; depuisApercu?: boolean }
  | { action: "retirer"; id: string }
  | { action: "confirmer"; id: string }
  // § 41.4 : une ligne du quantitatif (champ `lignes`) réécrite par l'artisan.
  | { action: "renommer"; id: string; libelle: string }
  | { action: "fixer_quantite"; id: string; quantite: string; unite: string }
  // §45.9 : précision et croix de l'aperçu ; §45.8 : « On ajoute ? ».
  | { action: "preciser"; id: string; precision: string }
  | { action: "retirer_article"; id: string }
  | { action: "suggestion"; id: string; reponse: "oui" | "non" };

type Row = { id: string; companyId: string; projectId: string; source: string; documentId: string | null; takeoffId: string | null; reference: string | null };

/**
 * LA PORTE D'ENTRÉE (§38) : l'app et les partenaires (Rappidos d'abord) passent tous ici. Trois
 * entrées : un PDF (lu par l'IA, en arrière-plan), un devis déjà déposé sur le chantier, ou des
 * lignes déjà structurées (aucune IA). Une seule sortie : l'état, les questions, les lignes à
 * commander avec leur explication (§39).
 */
export class QuantitatifsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly billing: BillingService,
    private readonly documents: DocumentsService,
    private readonly takeoffs: TakeoffService,
  ) {}

  get iaDisponible(): boolean {
    return this.takeoffs.aiAvailable;
  }

  /**
   * Quota d'une clé API partenaire : tant de quantitatifs créés par mois civil. Au-delà, 429 ; les lectures ne
   * comptent pas. Vérifié avant toute création (chantier, document, lecture IA).
   */
  private async assertQuota(tenant: TenantContext, ctx: Contexte): Promise<void> {
    if (!ctx.apiKey) return;
    const now = new Date();
    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const used = await this.prisma.quantitatif.count({ where: { companyId: tenant.companyId, apiKeyId: ctx.apiKey.id, createdAt: { gte: since } } });
    if (used >= ctx.apiKey.monthlyQuota) throw new DomainError("too_many_requests", "Partner API key monthly quota reached", { quota: ctx.apiKey.monthlyQuota, utilises: used });
  }

  /**
   * Le métier du devis et son tiroir (§22) : celui demandé, sinon le premier métier de l'entreprise qui a un référentiel.
   * Pas de tiroir ouvert pour ce métier : erreur claire (422 « no_referential »), jamais les règles d'un autre métier.
   */
  private tradeFor(tenant: TenantContext, ctx: Contexte): string {
    const trade = ctx.metier ? tradeIdOf(ctx.metier) : (tenant.trades.find((t) => referentialFor(t)) ?? tenant.trades[0] ?? "roofing");
    if (!referentialFor(trade)) {
      const disponibles = REFERENTIALS.map((r) => METIER_NAMES[r.trade] ?? r.trade);
      throw new DomainError("no_referential", `No referential for trade « ${ctx.metier ?? trade} »`, {
        metier: METIER_NAMES[trade] ?? ctx.metier ?? trade,
        disponibles,
        message: `BatiClair ne calcule pas encore les matériaux de ce métier. Métiers disponibles : ${disponibles.join(", ")}.`,
      });
    }
    return trade;
  }

  async fromPdf(tenant: TenantContext, file: { name: string; bytes: Uint8Array }, ctx: Contexte, rendu: Rendu = {}) {
    this.tradeFor(tenant, ctx);
    await this.assertQuota(tenant, ctx);
    const projectId = await this.project(tenant, ctx);
    const upload = await this.documents.upload(tenant, projectId, { purpose: "client_quote", fileName: file.name, bytes: file.bytes }).catch(async (error: unknown) => {
      // Pas un PDF : le chantier créé pour ce devis ne doit pas rester vide.
      if (!ctx.projetId) await this.prisma.project.deleteMany({ where: { id: projectId, companyId: tenant.companyId } });
      throw error;
    });
    const { document } = upload;
    const row = await this.prisma.quantitatif.create({
      data: { companyId: tenant.companyId, projectId, source: "pdf", documentId: document.id, reference: ctx.reference ?? null, apiKeyId: ctx.apiKey?.id ?? null },
    });
    // Fichier illisible (pas un devis, protégé…) : erreur tout de suite, sans dépenser une lecture.
    const unreadable = document.status === "failed" && document.processing?.status === "failed" && document.processing.errorCode !== "read_failed";
    if (!unreadable) await this.takeoffs.start(tenant, document.id);
    return this.get(tenant, row.id, rendu);
  }

  /** Un devis déjà déposé sur le chantier (le chat de l'appli) : même quantitatif s'il existe, lecture sinon. */
  async fromDocument(tenant: TenantContext, documentId: string, ctx: Contexte, rendu: Rendu = {}) {
    assertCanWrite(tenant);
    this.tradeFor(tenant, ctx);
    await this.assertQuota(tenant, ctx);
    if (!/^[0-9a-f-]{36}$/i.test(documentId)) throw notFound("Document");
    const { document } = await this.documents.get(tenant, documentId);
    if (ctx.projetId && ctx.projetId !== document.projectId) throw validationFailed("Document of another project", [{ path: "documentId", message: "not in projetId" }]);
    const existing = await this.prisma.quantitatif.findFirst({ where: { companyId: tenant.companyId, documentId }, orderBy: { createdAt: "desc" } });
    const row =
      existing ??
      (await this.prisma.quantitatif.create({
        data: { companyId: tenant.companyId, projectId: document.projectId, source: "pdf", documentId, reference: ctx.reference ?? null, apiKeyId: ctx.apiKey?.id ?? null },
      }));
    // Déjà lu : rien n'est relu ni décompté. Lecture en cours : elle n'est pas relancée.
    await this.takeoffs.start(tenant, documentId);
    return this.get(tenant, row.id, rendu);
  }

  async fromLines(tenant: TenantContext, lignes: readonly LigneEntree[], ctx: Contexte, rendu: Rendu = {}) {
    const trade = this.tradeFor(tenant, ctx);
    await this.assertQuota(tenant, ctx);
    const projectId = await this.project(tenant, ctx);
    const reviewed = await this.takeoffs.fromLines(
      tenant,
      projectId,
      trade,
      lignes.map((l) => ({ designation: l.libelle, quantity: l.quantite, unit: l.unite, price: l.prix })),
    );
    const row = await this.prisma.quantitatif.create({
      data: { companyId: tenant.companyId, projectId, source: "lignes", takeoffId: reviewed.takeoff.id, reference: ctx.reference ?? null, apiKeyId: ctx.apiKey?.id ?? null },
    });
    return this.view(row, reviewed, rendu);
  }

  /**
   * Le quantitatif le plus récent d'un chantier. Une liste préparée avant la porte (ou par la démo)
   * reçoit son identifiant de quantitatif à la première lecture.
   */
  async forProject(tenant: TenantContext, projectId: string, rendu: Rendu = {}) {
    if (!/^[0-9a-f-]{36}$/i.test(projectId)) throw notFound("Project");
    await this.projects.get(tenant, projectId);
    let row = await this.prisma.quantitatif.findFirst({ where: { companyId: tenant.companyId, projectId }, orderBy: { createdAt: "desc" } });
    // Le devis lu a été retiré (puis un autre déposé) : sa liste n'existe plus, le chantier repart de zéro.
    if (row && !(await this.alive(row))) row = null;
    const latest = await this.takeoffs.forProject(tenant, projectId);
    if (latest && (!row || (row.takeoffId !== latest.takeoff.id && row.documentId !== latest.takeoff.documentId))) {
      row = await this.prisma.quantitatif.create({
        data: {
          companyId: tenant.companyId,
          projectId,
          source: latest.takeoff.source,
          documentId: latest.takeoff.documentId,
          takeoffId: latest.takeoff.id,
          reference: null,
        },
      });
    }
    return row ? [await this.get(tenant, row.id, rendu)] : [];
  }

  async get(tenant: TenantContext, id: string, rendu: Rendu = {}) {
    const row = await this.row(tenant, id);
    const reviewed = await this.reviewed(tenant, row);
    if (reviewed) return this.view(row, reviewed, rendu);
    const base = this.base(row);
    const document = row.documentId ? await this.documents.get(tenant, row.documentId).then((d) => d.document, () => null) : null;
    if (document && document.status === "failed" && document.processing?.status === "failed" && document.processing.errorCode !== "read_failed") {
      return { ...base, etat: "erreur" as const, erreur: { raison: document.processing.errorCode } };
    }
    const reading = row.documentId ? await this.takeoffs.readingStateOf(tenant, row.documentId) : null;
    if (reading?.status === "failed") return { ...base, etat: "erreur" as const, erreur: { raison: reading.reason ?? "analysis_failed" } };
    return { ...base, etat: "en_cours" as const };
  }

  /**
   * Réponses : à une question (son `id`), ou une valeur du calcul réglée directement (« param:pente »,
   * « product:ardoise », « role:<ligne> »). Une valeur, « ok » pour garder une ligne telle quelle,
   * null pour « je ne sais pas ».
   */
  async answer(tenant: TenantContext, id: string, reponses: readonly { question: string; valeur: string | null; unite?: string | undefined }[], rendu: Rendu = {}) {
    const row = await this.row(tenant, id);
    let reviewed = await this.ready(tenant, row);
    // « Tout est bon » : les lignes gardées telles qu'écrites (ou comptées à la pièce) se confirment en une fois, avec
    // une entrée au journal par ligne, au lieu d'un recalcul par ligne.
    const together = reponses.filter((r) => {
      const d = reviewed.purchase.questions.find((x) => x.key === r.question);
      return r.valeur === "ok" && d !== undefined && !d.question && !d.key.startsWith(RATIO) && ![FORBIDDEN, AI_DOUBT, AI_ADDITION].some((p) => d.key.startsWith(p)) && (d.primary?.action === "keep" || d.primary?.action === "pieces");
    });
    if (together.length > 1) {
      const decisions = together.map((r) => reviewed.purchase.questions.find((x) => x.key === r.question)!);
      for (const action of ["keep", "pieces"] as const) {
        const own = decisions.filter((d) => d.primary!.action === action);
        if (own.length === 0) continue;
        reviewed = await this.takeoffs.decide(tenant, reviewed.takeoff.id, { action, lineIds: own.flatMap((d) => d.lineIds), pieceLineIds: own.flatMap((d) => d.pieceLineIds ?? []) });
      }
    }
    const done = new Set(together.length > 1 ? together.map((r) => r.question) : []);
    for (const r of reponses) {
      if (done.has(r.question)) continue;
      const decision = reviewed.purchase.questions.find((d) => d.key === r.question);
      const q = decision?.question;
      // §47.3 : « C'est bon » sur une quantité calculée avec une règle « à vérifier ».
      // Les lignes orange de la vérification (interdits du code, doutes et ajouts du quantitatif IA) : « ok » ou « non ».
      if (decision && [FORBIDDEN, AI_DOUBT, AI_ADDITION].some((p) => decision.key.startsWith(p))) {
        if (r.valeur !== "ok" && r.valeur !== "non") throw validationFailed("This question takes « ok » or « non »", [{ path: "valeur", message: r.question }]);
        reviewed = await this.takeoffs.answer(tenant, reviewed.takeoff.id, decision.key, r.valeur);
        continue;
      }
      if (decision && decision.key.startsWith(RATIO)) {
        if (r.valeur !== "ok") throw validationFailed("This question takes « ok »", [{ path: "valeur", message: r.question }]);
        reviewed = await this.takeoffs.answer(tenant, reviewed.takeoff.id, decision.key, "ok");
        continue;
      }
      if (decision && !q) {
        if (r.valeur !== "ok" || !decision.primary || (decision.primary.action !== "keep" && decision.primary.action !== "pieces")) {
          throw validationFailed("This question takes « ok »", [{ path: "valeur", message: r.question }]);
        }
        reviewed = await this.takeoffs.decide(tenant, reviewed.takeoff.id, { action: decision.primary.action, lineIds: decision.lineIds, pieceLineIds: decision.pieceLineIds ?? [] });
        continue;
      }
      const key = q?.key ?? r.question.replace(/^engine:/, "");
      if (!/^(?:(?:product|param):[a-z0-9_]{1,40}|(?:role|precise):[0-9a-f-]{36})$/.test(key)) throw validationFailed("Unknown question", [{ path: "question", message: r.question }]);
      if (key.startsWith("role:") && r.valeur !== "measure" && r.valeur !== "purchase") throw validationFailed("Role answer must be measure or purchase", [{ path: "valeur", message: r.question }]);
      let value: EngineAnswer;
      if (r.valeur === null || !key.startsWith("param:")) value = r.valeur;
      else {
        const unit = r.unite ?? q?.unit ?? reviewed.purchase.assumptions.find((a) => a.key === key)?.unit;
        if (!unit) throw validationFailed("Missing unit", [{ path: "unite", message: r.question }]);
        if (!/^\d+(?:[.,]\d+)?$/.test(r.valeur.trim())) throw validationFailed("Not a number", [{ path: "valeur", message: r.question }]);
        value = { value: r.valeur.trim().replace(",", "."), unit };
      }
      reviewed = await this.takeoffs.answer(tenant, reviewed.takeoff.id, key, value);
    }
    return this.view(row, reviewed, rendu);
  }

  /**
   * PARCOURS §48 : les réponses aux questions de comptoir (toutes d'un coup, facultatives) puis le calcul. Une question
   * laissée sans réponse ne bloque rien : sa ligne sort orange. Jamais de deuxième vague de questions après.
   */
  async calculate(
    tenant: TenantContext,
    id: string,
    reponses: readonly { question: string; valeur: string | null; unite?: string | undefined }[],
    rendu: Rendu = {},
    ajouts: readonly { id: string; reponse: "oui" | "non" }[] = [],
  ) {
    const row = await this.row(tenant, id);
    if (reponses.length > 0) await this.answer(tenant, id, reponses);
    for (const a of ajouts) await this.correct(tenant, id, { action: "suggestion", id: a.id, reponse: a.reponse });
    const reviewed = await this.ready(tenant, row);
    await this.takeoffs.calculate(tenant, reviewed.takeoff.id);
    return this.view(row, await this.takeoffs.reviewed(tenant, reviewed.takeoff.id), rendu);
  }

  /** Corrections (§39) : changer une valeur (pente, zone, perte…), ajouter, modifier, retirer ou confirmer une ligne du devis. */
  async correct(tenant: TenantContext, id: string, correction: Correction, rendu: Rendu = {}) {
    const row = await this.row(tenant, id);
    const reviewed = await this.ready(tenant, row);
    const fields = (l: LigneEntree) => ({ designation: l.libelle, quantityRaw: l.quantite, unitRaw: l.unite, reference: l.reference ?? null });
    const line = (lineId: string) => {
      // Une ligne d'un autre quantitatif n'existe pas pour celui-ci.
      if (!reviewed.takeoff.lines.some((l) => l.id === lineId)) throw notFound("Line");
      return lineId;
    };
    switch (correction.action) {
      case "ajouter":
        return this.view(row, await this.takeoffs.addLine(tenant, reviewed.takeoff.id, fields(correction.ligne), { keepStatus: correction.depuisApercu === true }), rendu);
      case "preciser":
      case "retirer_article": {
        if (!reviewed.purchase.toBuy.some((b) => b.key === correction.id)) throw notFound("Line");
        const after =
          correction.action === "preciser"
            ? await this.takeoffs.answer(tenant, reviewed.takeoff.id, `precision:${correction.id}`, correction.precision)
            : await this.takeoffs.answer(tenant, reviewed.takeoff.id, `retire:${correction.id}`, "oui");
        return this.view(row, after, rendu);
      }
      case "suggestion": {
        if (!reviewed.purchase.suggestions.some((s) => s.key === correction.id)) throw notFound("Line");
        return this.view(row, await this.takeoffs.answer(tenant, reviewed.takeoff.id, `ajout:${correction.id}`, correction.reponse), rendu);
      }
      case "modifier_ligne":
        return this.view(row, await this.takeoffs.updateLine(tenant, line(correction.id), fields(correction.ligne), { keepStatus: correction.depuisApercu === true }), rendu);
      case "retirer":
        return this.view(row, await this.takeoffs.deleteLine(tenant, line(correction.id)), rendu);
      case "confirmer":
        return this.view(row, await this.takeoffs.confirmLine(tenant, line(correction.id)), rendu);
      case "renommer":
      case "fixer_quantite": {
        // Une suggestion (§45.8) se corrige comme une ligne de la liste.
        if (!reviewed.purchase.toBuy.some((b) => b.key === correction.id) && !reviewed.purchase.suggestions.some((s) => s.key === correction.id)) throw notFound("Line");
        // Une ligne reprise du devis : c'est la ligne du devis qu'on corrige. Une ligne calculée : les mots de l'artisan passent devant.
        const direct = correction.id.startsWith("line:") ? reviewed.takeoff.lines.find((l) => l.id === correction.id.slice("line:".length)) : undefined;
        if (direct) {
          const fields = { designation: direct.designation, quantityRaw: direct.quantityRaw, unitRaw: direct.unitRaw, reference: direct.reference };
          const next = correction.action === "renommer" ? { ...fields, designation: correction.libelle } : { ...fields, quantityRaw: correction.quantite, unitRaw: correction.unite };
          return this.view(row, await this.takeoffs.updateLine(tenant, direct.id, next), rendu);
        }
        const after =
          correction.action === "renommer"
            ? await this.takeoffs.answer(tenant, reviewed.takeoff.id, `libelle:${correction.id}`, correction.libelle)
            : await this.takeoffs.answer(tenant, reviewed.takeoff.id, `quantite:${correction.id}`, { value: correction.quantite.replace(",", "."), unit: correction.unite });
        return this.view(row, after, rendu);
      }
      case "modifier": {
        // Une clé modifiable : une hypothèse en cours, ou une valeur déjà choisie (elle porte sa clé dans l'explication).
        const hyp = reviewed.purchase.assumptions.find((a) => a.key === correction.cle);
        const morceau = quantitatifView(this.base(row), reviewed)
          .lignes.flatMap((l) => l.explication.morceaux)
          .find((m) => "cle" in m && m.cle === correction.cle);
        const unit = correction.unite ?? hyp?.unit ?? (morceau && "unite" in morceau ? morceau.unite : undefined);
        if (!correction.cle.startsWith("param:") || (!hyp && !morceau) || !unit) throw validationFailed("Unknown value", [{ path: "cle", message: correction.cle }]);
        const after = await this.takeoffs.answer(tenant, reviewed.takeoff.id, correction.cle, { value: correction.valeur.replace(",", "."), unit });
        return this.view(row, after, rendu);
      }
    }
  }

  /** L'artisan valide la liste : elle peut partir chez les fournisseurs (demande de prix). */
  async validate(tenant: TenantContext, id: string, rendu: Rendu = {}) {
    const row = await this.row(tenant, id);
    const reviewed = await this.ready(tenant, row);
    return this.view(row, await this.takeoffs.validate(tenant, reviewed.takeoff.id), rendu);
  }

  /** Rouvrir une liste validée pour la corriger. */
  async reopen(tenant: TenantContext, id: string, rendu: Rendu = {}) {
    const row = await this.row(tenant, id);
    const reviewed = await this.ready(tenant, row);
    return this.view(row, await this.takeoffs.reopen(tenant, reviewed.takeoff.id), rendu);
  }

  private async project(tenant: TenantContext, ctx: Contexte): Promise<string> {
    assertCanWrite(tenant);
    const id = await this.projectId(tenant, ctx);
    if (ctx.infos !== undefined) await this.projects.update(tenant, id, { siteNotes: ctx.infos });
    return id;
  }

  private async projectId(tenant: TenantContext, ctx: Contexte): Promise<string> {
    if (ctx.projetId) {
      const project = await this.projects.get(tenant, ctx.projetId).catch(() => null);
      if (!project) throw notFound("Project");
      return project.id;
    }
    // Un quantitatif sans chantier en crée un : la formule limite les nouveaux chantiers, comme dans l'app.
    await this.billing.assertCanCreateProject(tenant);
    const day = new Date().toISOString().slice(0, 10);
    const project = await this.projects.create(tenant, { name: ctx.reference?.trim() || `Devis du ${day}`, address: ctx.adresse ?? null });
    return project.id;
  }

  private async row(tenant: TenantContext, id: string): Promise<Row> {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("Quantitatif");
    const row = await this.prisma.quantitatif.findFirst({ where: { id, companyId: tenant.companyId } });
    if (!row) throw notFound("Quantitatif");
    return row;
  }

  private async ready(tenant: TenantContext, row: Row): Promise<ReviewedTakeoff> {
    const reviewed = await this.reviewed(tenant, row);
    if (!reviewed) throw new DomainError("conflict", "Quantitatif not ready", { etat: "en_cours" });
    return reviewed;
  }

  private async reviewed(tenant: TenantContext, row: Row): Promise<ReviewedTakeoff | null> {
    if (row.takeoffId) return this.takeoffs.reviewed(tenant, row.takeoffId);
    if (!row.documentId) return null;
    const reviewed = await this.takeoffs.forDocument(tenant, row.documentId);
    if (reviewed) await this.prisma.quantitatif.update({ where: { id: row.id }, data: { takeoffId: reviewed.takeoff.id } });
    return reviewed;
  }

  private async alive(row: Row): Promise<boolean> {
    if (row.takeoffId) return (await this.prisma.takeoff.count({ where: { id: row.takeoffId } })) > 0;
    if (row.documentId) return (await this.prisma.document.count({ where: { id: row.documentId } })) > 0;
    return true;
  }

  private base(row: Row) {
    return { id: row.id, reference: row.reference, projetId: row.projectId, source: row.source === "lignes" ? ("lignes" as const) : ("pdf" as const) };
  }

  private async view(row: Row, reviewed: ReviewedTakeoff, rendu: Rendu) {
    // Les infos chantier (note, croquis) voyagent avec le quantitatif : l'artisan voit ce qui a servi au calcul.
    const [project, croquis] = await Promise.all([
      this.prisma.project.findFirst({ where: { id: row.projectId, companyId: row.companyId }, select: { siteNotes: true } }),
      this.prisma.document.findMany({ where: { projectId: row.projectId, companyId: row.companyId, purpose: "sketch" }, select: { id: true, originalName: true, itemKey: true, note: true, createdAt: true }, orderBy: { createdAt: "asc" } }),
    ]);
    return {
      ...quantitatifView(this.base(row), reviewed),
      // Parcours §48 : questions de comptoir (avant le calcul), calcul en cours (appel IA n° 2), ou liste prête.
      phase: this.takeoffs.phaseOf(reviewed.takeoff),
      // Un croquis du chantier, ou celui d'un article (« article » : la clé de la ligne de la liste, avec la précision de l'artisan).
      infos: { texte: project?.siteNotes ?? null, croquis: croquis.map((c) => ({ id: c.id, nom: c.originalName, ...(c.itemKey ? { article: c.itemKey, commentaire: c.note } : {}) })) },
      ...(rendu.ecran ? { ecran: takeoffDto(reviewed) } : {}),
    };
  }

  /** Infos chantier facultatives : la note, remplacée telle que tapée (null pour l'effacer). */
  async setNotes(tenant: TenantContext, projectId: string, texte: string | null) {
    await this.projects.get(tenant, projectId);
    await this.projects.update(tenant, projectId, { siteNotes: texte });
  }

  /**
   * Un croquis (photo, PDF) avec son commentaire : la photo est gardée telle quelle, jamais lue par l'IA
   * (docs/infos-chantier-facultatives.md) ; le commentaire rejoint la note, précédé de « Croquis : ».
   */
  async addSketch(tenant: TenantContext, projectId: string, file: { name: string; bytes: Uint8Array }, commentaire: string | undefined, article?: string) {
    const project = await this.projects.get(tenant, projectId);
    // Le croquis d'un article (dimensions d'une couvertine…) reste à sa ligne : sa précision ne devient jamais une
    // mesure du chantier (« dév. 330 » sur une couvertine ne règle pas le développé de toutes les bandes).
    if (article) {
      const doc = await this.documents.storeSketch(tenant, projectId, { fileName: file.name, bytes: file.bytes, itemKey: article, note: commentaire ?? null });
      return { id: doc.id, nom: doc.originalName, article, commentaire: commentaire?.trim() || null };
    }
    const doc = await this.documents.storeSketch(tenant, projectId, { fileName: file.name, bytes: file.bytes });
    const line = commentaire?.trim() ? `Croquis (${doc.originalName}) : ${commentaire.trim()}` : null;
    if (line) await this.projects.update(tenant, projectId, { siteNotes: [project.siteNotes?.trim(), line].filter(Boolean).join("\n") });
    return { id: doc.id, nom: doc.originalName };
  }
}
