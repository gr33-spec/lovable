import type { Prisma } from "../../../generated/prisma/client.js";
import type { CompletionRecord, LineRole, QuoteLineReading } from "@baticlair/domain";
import type { PrismaService } from "../../../platform/database/prisma.service.js";
import { isUuid } from "../../../platform/validation/ids.js";
import type { TenantContext } from "../../tenancy/index.js";
import type {
  LineFields,
  NewTakeoff,
  TakeoffRecord,
  TakeoffRepository,
  TakeoffStatus,
} from "../application/takeoff.repository.js";

const INCLUDE = { lines: { orderBy: { position: "asc" as const } } };

type Row = Awaited<ReturnType<PrismaService["takeoff"]["findFirstOrThrow"]>> & {
  lines: Awaited<ReturnType<PrismaService["takeoffLine"]["findFirstOrThrow"]>>[];
};

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const numbers = (v: unknown): number[] => (Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : []);

/** Ce que l'appel IA n° 2 a proposé ; une forme inattendue est ignorée (jamais une erreur, jamais un ajout douteux). */
function completionOf(v: unknown): CompletionRecord | null {
  if (!v || typeof v !== "object") return null;
  const c = v as Partial<CompletionRecord>;
  return { additions: Array.isArray(c.additions) ? c.additions : [], doubts: Array.isArray(c.doubts) ? c.doubts : [] };
}

function toRecord(row: Row): TakeoffRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    documentId: row.documentId,
    source: row.source === "lignes" ? "lignes" : "pdf",
    referentialVersion: row.referentialVersion,
    trade: row.trade,
    status: row.status,
    promptId: row.promptId,
    promptVersion: row.promptVersion,
    model: row.model,
    notes: strings(row.notes),
    context: stringMap(row.context),
    completion: completionOf(row.completion),
    calculStartedAt: row.calculStartedAt,
    calculatedAt: row.calculatedAt,
    analysisId: row.analysisId,
    answers: answers(row.answers),
    createdAt: row.createdAt,
    validatedAt: row.validatedAt,
    lines: row.lines.map((l) => ({
      id: l.id,
      position: l.position,
      designation: l.designation,
      quantityRaw: l.quantityRaw,
      unitRaw: l.unitRaw,
      reference: l.reference,
      sourceRefs: strings(l.sourceRefs),
      sourcePages: numbers(l.sourcePages),
      section: strings(l.section),
      origin: l.origin === "manual" || l.origin === "partner" ? l.origin : "ai",
      edited: l.edited,
      aiDoubt: l.aiDoubt,
      priceRaw: l.priceRaw,
      material: l.material,
      dimensions: stringMap(l.dimensions),
      reading: readingOf(l.reading),
      confirmed: l.confirmedAt !== null,
      role: l.role === "measure" || l.role === "purchase" || l.role === "undetermined" ? l.role : null,
    })),
  };
}

/** La lecture §41.1 d'une ligne, relue depuis la base : ce qui n'a pas la bonne forme est ignoré. */
function readingOf(value: unknown): QuoteLineReading | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const text = (x: unknown) => (typeof x === "string" && x.trim() ? x.trim() : null);
  const role = ["fourniture", "pose", "fourniture_et_pose", "hors_quantitatif"].includes(String(v.role)) ? (v.role as QuoteLineReading["role"]) : null;
  const faconnage = v.faconnage === "artisan" || v.faconnage === "fourni" ? v.faconnage : null;
  const articles = Array.isArray(v.articles)
    ? v.articles.flatMap((a) => {
        if (!a || typeof a !== "object") return [];
        const o = a as Record<string, unknown>;
        const nom = text(o.nom);
        return nom ? [{ nom, materiau: text(o.materiau), quantite: text(o.quantite), unite: text(o.unite), elements: text(o.elements) }] : [];
      })
    : [];
  const manque = Array.isArray(v.manque) ? v.manque.flatMap((m) => (text(m) ? [text(m)!] : [])) : [];
  return { role, articles, faconnage, manque };
}

/** Un objet « clé → texte » lu tel quel depuis la base ; tout le reste est ignoré. */
function stringMap(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) if (typeof v === "string") out[k] = v;
  return Object.keys(out).length > 0 ? out : null;
}

function answers(value: unknown): TakeoffRecord["answers"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: TakeoffRecord["answers"] = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === null) out[k] = null;
    else if (typeof v === "string") out[k] = v;
    else if (v && typeof v === "object" && typeof (v as { value?: unknown }).value === "string" && typeof (v as { unit?: unknown }).unit === "string") {
      out[k] = { value: (v as { value: string }).value, unit: (v as { unit: string }).unit };
    }
  }
  return out;
}

export class PrismaTakeoffRepository implements TakeoffRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByDocument(tenant: TenantContext, documentId: string): Promise<TakeoffRecord | null> {
    if (!isUuid(documentId)) return null;
    const row = await this.prisma.takeoff.findFirst({ where: { documentId, companyId: tenant.companyId }, include: INCLUDE });
    return row ? toRecord(row) : null;
  }

  async findLatestByProject(tenant: TenantContext, projectId: string): Promise<TakeoffRecord | null> {
    if (!isUuid(projectId)) return null;
    const row = await this.prisma.takeoff.findFirst({
      where: { projectId, companyId: tenant.companyId },
      orderBy: { createdAt: "desc" },
      include: INCLUDE,
    });
    return row ? toRecord(row) : null;
  }

  async findById(tenant: TenantContext, id: string): Promise<TakeoffRecord | null> {
    if (!isUuid(id)) return null;
    const row = await this.prisma.takeoff.findFirst({ where: { id, companyId: tenant.companyId }, include: INCLUDE });
    return row ? toRecord(row) : null;
  }

  async findByLine(tenant: TenantContext, lineId: string): Promise<TakeoffRecord | null> {
    if (!isUuid(lineId)) return null;
    const row = await this.prisma.takeoff.findFirst({
      where: { companyId: tenant.companyId, lines: { some: { id: lineId } } },
      include: INCLUDE,
    });
    return row ? toRecord(row) : null;
  }

  async create(tenant: TenantContext, data: NewTakeoff): Promise<TakeoffRecord> {
    const row = await this.prisma.takeoff.create({
      data: {
        companyId: tenant.companyId,
        projectId: data.projectId,
        documentId: data.documentId,
        source: data.source ?? "pdf",
        referentialVersion: data.referentialVersion,
        analysisId: data.analysisId,
        trade: data.trade,
        promptId: data.promptId,
        promptVersion: data.promptVersion,
        model: data.model,
        notes: data.notes,
        context: data.context ?? undefined,
        ...(data.calculated ? { calculStartedAt: new Date(), calculatedAt: new Date() } : {}),
        createdById: tenant.userId,
        lines: {
          create: data.lines.map((l, i) => ({
            position: i + 1,
            designation: l.designation,
            quantityRaw: l.quantityRaw,
            unitRaw: l.unitRaw,
            reference: l.reference,
            sourceRefs: l.sourceRefs,
            sourcePages: l.sourcePages,
            section: l.section,
            aiDoubt: l.aiDoubt,
            priceRaw: l.priceRaw ?? null,
            origin: l.origin ?? "ai",
            material: l.material ?? null,
            dimensions: l.dimensions ?? undefined,
            reading: l.reading ? (l.reading as unknown as Prisma.InputJsonValue) : undefined,
          })),
        },
      },
      include: INCLUDE,
    });
    return toRecord(row);
  }

  async updateLine(tenant: TenantContext, lineId: string, fields: LineFields): Promise<void> {
    await this.prisma.takeoffLine.updateMany({
      where: { id: lineId, takeoff: { companyId: tenant.companyId } },
      data: { ...fields, edited: true, confirmedAt: null },
    });
  }

  async setRoles(tenant: TenantContext, roles: ReadonlyMap<string, LineRole>): Promise<void> {
    if (roles.size === 0) return;
    await this.prisma.$transaction(
      [...roles].map(([id, role]) => this.prisma.takeoffLine.updateMany({ where: { id, takeoff: { companyId: tenant.companyId } }, data: { role } })),
    );
  }

  async setCompletion(tenant: TenantContext, id: string, completion: CompletionRecord): Promise<void> {
    await this.prisma.takeoff.updateMany({ where: { id, companyId: tenant.companyId }, data: { completion: JSON.parse(JSON.stringify(completion)) } });
  }

  async startCalcul(tenant: TenantContext, id: string, at: Date, staleBefore: Date): Promise<boolean> {
    // Un seul départ : pas encore lancé, ou lancé il y a trop longtemps (coupure) et jamais fini.
    const { count } = await this.prisma.takeoff.updateMany({
      where: { id, companyId: tenant.companyId, calculatedAt: null, OR: [{ calculStartedAt: null }, { calculStartedAt: { lt: staleBefore } }] },
      data: { calculStartedAt: at },
    });
    return count === 1;
  }

  async finishCalcul(tenant: TenantContext, id: string, at: Date): Promise<void> {
    await this.prisma.takeoff.updateMany({ where: { id, companyId: tenant.companyId }, data: { calculatedAt: at } });
  }

  async setAnswer(tenant: TenantContext, id: string, key: string, value: string | { value: string; unit: string } | null): Promise<void> {
    const row = await this.prisma.takeoff.findFirst({ where: { id, companyId: tenant.companyId }, select: { answers: true } });
    if (!row) return;
    await this.prisma.takeoff.updateMany({
      where: { id, companyId: tenant.companyId },
      data: { answers: { ...answers(row.answers), [key]: value } },
    });
  }

  async confirmLine(tenant: TenantContext, lineId: string): Promise<void> {
    await this.prisma.takeoffLine.updateMany({
      where: { id: lineId, takeoff: { companyId: tenant.companyId } },
      data: { confirmedAt: new Date() },
    });
  }

  async addLine(tenant: TenantContext, takeoffId: string, fields: LineFields): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const last = await tx.takeoffLine.aggregate({ where: { takeoffId, takeoff: { companyId: tenant.companyId } }, _max: { position: true } });
      await tx.takeoffLine.create({ data: { ...fields, takeoffId, origin: "manual", position: (last._max.position ?? 0) + 1 } });
    });
  }

  async deleteLine(tenant: TenantContext, lineId: string): Promise<void> {
    await this.prisma.takeoffLine.deleteMany({ where: { id: lineId, takeoff: { companyId: tenant.companyId } } });
  }

  async setStatus(tenant: TenantContext, id: string, status: TakeoffStatus): Promise<void> {
    await this.prisma.takeoff.updateMany({
      where: { id, companyId: tenant.companyId },
      data: status === "validated" ? { status, validatedAt: new Date(), validatedById: tenant.userId } : { status, validatedAt: null, validatedById: null },
    });
  }
}
