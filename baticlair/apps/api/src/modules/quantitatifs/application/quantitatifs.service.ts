import type { EngineAnswer } from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { BillingService } from "../../billing/index.js";
import type { DocumentsService } from "../../documents/index.js";
import type { ProjectsService } from "../../projects/index.js";
import type { TakeoffService, ReviewedTakeoff } from "../../takeoff/index.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import { quantitatifView } from "./quantitatif-view.js";

export interface LigneEntree {
  libelle: string;
  quantite: string | null;
  unite: string | null;
  prix: string | null;
}

export interface Contexte {
  projetId?: string | undefined;
  reference?: string | undefined;
  /** Adresse ou code postal du chantier : la zone climatique en dépend (jamais demandée). */
  adresse?: string | undefined;
}

type Row = { id: string; projectId: string; source: string; documentId: string | null; takeoffId: string | null; reference: string | null };

/**
 * LA PORTE D'ENTRÉE (§38) : l'app et les partenaires (Rappidos d'abord) passent tous ici. Deux
 * entrées : un PDF (lu par l'IA, en arrière-plan) ou des lignes déjà structurées (aucune IA). Une
 * seule sortie : l'état, les questions, les lignes à commander avec leur explication (§39).
 */
export class QuantitatifsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly billing: BillingService,
    private readonly documents: DocumentsService,
    private readonly takeoffs: TakeoffService,
  ) {}

  async fromPdf(tenant: TenantContext, file: { name: string; bytes: Uint8Array }, ctx: Contexte) {
    const projectId = await this.project(tenant, ctx);
    const upload = await this.documents.upload(tenant, projectId, { purpose: "client_quote", fileName: file.name, bytes: file.bytes }).catch(async (error: unknown) => {
      // Pas un PDF : le chantier créé pour ce devis ne doit pas rester vide.
      if (!ctx.projetId) await this.prisma.project.deleteMany({ where: { id: projectId, companyId: tenant.companyId } });
      throw error;
    });
    const { document } = upload;
    const row = await this.prisma.quantitatif.create({
      data: { companyId: tenant.companyId, projectId, source: "pdf", documentId: document.id, reference: ctx.reference ?? null },
    });
    // Fichier illisible (pas un devis, protégé…) : erreur tout de suite, sans dépenser une lecture.
    const unreadable = document.status === "failed" && document.processing?.status === "failed" && document.processing.errorCode !== "read_failed";
    if (!unreadable) await this.takeoffs.start(tenant, document.id);
    return this.get(tenant, row.id);
  }

  async fromLines(tenant: TenantContext, lignes: readonly LigneEntree[], ctx: Contexte) {
    const projectId = await this.project(tenant, ctx);
    const trade = tenant.trades[0] ?? "roofing";
    const reviewed = await this.takeoffs.fromLines(
      tenant,
      projectId,
      trade,
      lignes.map((l) => ({ designation: l.libelle, quantity: l.quantite, unit: l.unite, price: l.prix })),
    );
    const row = await this.prisma.quantitatif.create({
      data: { companyId: tenant.companyId, projectId, source: "lignes", takeoffId: reviewed.takeoff.id, reference: ctx.reference ?? null },
    });
    return this.view(row, reviewed);
  }

  async get(tenant: TenantContext, id: string) {
    const row = await this.row(tenant, id);
    const reviewed = await this.reviewed(tenant, row);
    if (reviewed) return this.view(row, reviewed);
    const base = this.base(row);
    const document = row.documentId ? await this.documents.get(tenant, row.documentId).then((d) => d.document, () => null) : null;
    if (document && document.status === "failed" && document.processing?.status === "failed" && document.processing.errorCode !== "read_failed") {
      return { ...base, etat: "erreur" as const, erreur: { raison: document.processing.errorCode } };
    }
    const reading = row.documentId ? await this.takeoffs.readingStateOf(tenant, row.documentId) : null;
    if (reading?.status === "failed") return { ...base, etat: "erreur" as const, erreur: { raison: reading.reason ?? "analysis_failed" } };
    return { ...base, etat: "en_cours" as const };
  }

  /** Réponses aux questions : une valeur, « ok » pour garder une ligne telle quelle, null pour « je ne sais pas ». */
  async answer(tenant: TenantContext, id: string, reponses: readonly { question: string; valeur: string | null; unite?: string | undefined }[]) {
    const row = await this.row(tenant, id);
    let reviewed = await this.reviewed(tenant, row);
    if (!reviewed) throw new DomainError("conflict", "Quantitatif not ready", { etat: "en_cours" });
    for (const r of reponses) {
      const decision = reviewed.purchase.questions.find((d) => d.key === r.question);
      if (!decision) throw validationFailed("Unknown question", [{ path: "question", message: r.question }]);
      const q = decision.question;
      if (!q) {
        if (r.valeur !== "ok" || !decision.primary || (decision.primary.action !== "keep" && decision.primary.action !== "pieces")) {
          throw validationFailed("This question takes « ok »", [{ path: "valeur", message: r.question }]);
        }
        reviewed = await this.takeoffs.decide(tenant, reviewed.takeoff.id, { action: decision.primary.action, lineIds: decision.lineIds, pieceLineIds: decision.pieceLineIds ?? [] });
        continue;
      }
      const value: EngineAnswer =
        r.valeur === null ? null : q.kind === "param" ? { value: r.valeur.replace(",", "."), unit: r.unite ?? q.unit ?? "u" } : r.valeur;
      reviewed = await this.takeoffs.answer(tenant, reviewed.takeoff.id, q.key, value);
    }
    return this.view(row, reviewed);
  }

  /** Corrections (§39) : changer une hypothèse (pente, zone, perte…) ou ajouter une ligne libre. */
  async correct(
    tenant: TenantContext,
    id: string,
    correction: { action: "modifier"; cle: string; valeur: string; unite?: string | undefined } | { action: "ajouter"; ligne: LigneEntree },
  ) {
    const row = await this.row(tenant, id);
    const reviewed = await this.reviewed(tenant, row);
    if (!reviewed) throw new DomainError("conflict", "Quantitatif not ready", { etat: "en_cours" });
    if (correction.action === "ajouter") {
      const l = correction.ligne;
      return this.view(row, await this.takeoffs.addLine(tenant, reviewed.takeoff.id, { designation: l.libelle, quantityRaw: l.quantite, unitRaw: l.unite, reference: null }));
    }
    // Une clé modifiable : une hypothèse en cours, ou une valeur déjà choisie (elle porte sa clé dans l'explication).
    const hyp = reviewed.purchase.assumptions.find((a) => a.key === correction.cle);
    const morceau = quantitatifView(this.base(row), reviewed)
      .lignes.flatMap((l) => l.explication.morceaux)
      .find((m) => "cle" in m && m.cle === correction.cle);
    const unit = correction.unite ?? hyp?.unit ?? (morceau && "unite" in morceau ? morceau.unite : undefined);
    if (!correction.cle.startsWith("param:") || (!hyp && !morceau) || !unit) throw validationFailed("Unknown value", [{ path: "cle", message: correction.cle }]);
    const after = await this.takeoffs.answer(tenant, reviewed.takeoff.id, correction.cle, { value: correction.valeur.replace(",", "."), unit });
    return this.view(row, after);
  }

  private async project(tenant: TenantContext, ctx: Contexte): Promise<string> {
    assertCanWrite(tenant);
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

  private async reviewed(tenant: TenantContext, row: Row): Promise<ReviewedTakeoff | null> {
    if (row.takeoffId) return this.takeoffs.reviewed(tenant, row.takeoffId);
    if (!row.documentId) return null;
    const reviewed = await this.takeoffs.forDocument(tenant, row.documentId);
    if (reviewed) await this.prisma.quantitatif.update({ where: { id: row.id }, data: { takeoffId: reviewed.takeoff.id } });
    return reviewed;
  }

  private base(row: Row) {
    return { id: row.id, reference: row.reference, projetId: row.projectId, source: row.source === "lignes" ? ("lignes" as const) : ("pdf" as const) };
  }

  private view(row: Row, reviewed: ReviewedTakeoff) {
    return quantitatifView(this.base(row), reviewed);
  }
}
