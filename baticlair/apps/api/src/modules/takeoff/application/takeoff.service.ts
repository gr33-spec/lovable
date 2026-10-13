import {
  baseOf,
  AI_ADDITION,
  MISSING_INFO,
  CONSUMABLES_KEY,
  AI_DOUBT,
  FORBIDDEN,
  applyPurchaseOverrides,
  RATIO,
  ORDER_WEIGHT,
  type OrderGap,
  assessTakeoffLine,
  climateZone,
  isCoastal,
  type Referential,
  postalCodeIn,
  DEFAULT_EXTRACTION_POLICY,
  planReading,
  priceTableAt,
  ROOFING_REFERENTIAL,
  REFERENTIALS,
  referentialFor,
  tradeProfile,
  type ArtisanView,
  type EngineAnswer,
  type PurchaseView,
  type SiteFact,
  type CorrectionAction,
  type ExtractionPolicy,
  type RoleProposal,
  type LineSnapshot,
  type LineValidation,
  type TakeoffIssue,
  type TakeoffValidation,
  siteBrief,
  communeOf,
  METIER_NAMES,
  tradeIdOf,
  type SiteBrief,
  normalizeText,
  appliquerRelecture,
  ficheChantier,
  ficheCorrigee,
  type FicheChantier,
  ecranDeLecture,
  ecranParLots,
  LOTS_KEY,
  exportPourLecture,
  ficheAvecBref,
  lectureDepuisLignes,
  lignesDeLecture,
  lotLabel,
  piecewiseParams,
  scopedKey,
  type LectureDevis,
} from "@baticlair/domain";
import { DomainError, notFound, validationFailed } from "../../../platform/errors/domain-error.js";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";
import type { AiUsageRecorder, AnalysisMeter } from "../../ai-usage/index.js";
import type { DocumentAiInput, DocumentRepository, DocumentWithProcessing, PreparedDocument } from "../../documents/index.js";
import type { CompanyMemory, CorrectionJournal } from "../../learning/index.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import { decodeRelecture, doublonDe, FICHE_RELECTURE_PROMPT, type FicheRelecteur, type QuestionPosee, type RelectureQuestion } from "./fiche-relecture.js";
import { LECTURE_PROMPT, type LectureReader } from "./lecture-reader.js";
import type { LineFields, TakeoffRecord, TakeoffRepository } from "./takeoff.repository.js";

/**
 * Lecture d'un devis par l'IA (PD-046) :
 * - un seul appel pour un devis normal ; un très gros devis est lu en blocs
 *   de pages, décidés avant tout appel par le plan de lecture ;
 * - une réponse coupée (trop longue) n'est JAMAIS redemandée à l'identique :
 *   le bloc est relu en deux moitiés ; une page seule trop dense échoue ;
 * - une réponse illisible ou une panne passagère : une seule relance ;
 * - un document dont le coût estimé est anormal pour un devis est refusé
 *   avant tout appel, et le nombre d'appels est plafonné.
 */
export interface ReadingOptions {
  /** Compte autorisé à voir les calculs des règles en brouillon (marqués « provisoire »), pour les valider. */
  isValidator?: (tenant: TenantContext) => Promise<boolean>;
  /** Adresse du chantier (code postal → zone climatique), sans rien demander à l'artisan. */
  projectAddress?: (tenant: TenantContext, projectId: string) => Promise<string | null>;
  /** Infos chantier facultatives : la note de l'artisan (texte libre, commentaires de croquis), lue à chaque calcul. */
  projectNotes?: (tenant: TenantContext, projectId: string) => Promise<string | null>;
  /**
   * Version figée par chantier (plan v3 §3) : le référentiel est enregistré à sa version quand le quantitatif naît,
   * et chaque recalcul relit CETTE version. Sans ce port, le référentiel du jour sert (tests unitaires).
   */
  referentials?: { ensure(ref: Referential): Promise<void>; load(version: string): Promise<Referential | null> };
  /** Mesures de chaque lecture (journal du serveur), en plus de leur enregistrement avec l'analyse. */
  onStats?: (stats: ReadingStats) => void;
  policy?: ExtractionPolicy;
  /** §51.2 : la relecture IA d'une réponse « Autre » (absente : la réponse écrite est gardée telle quelle). */
  relecteur?: FicheRelecteur;
  /**
   * §51.5 : LA LECTURE PAR LE MODÈLE, en un appel (devis complet + référentiel) : fiche, bref, questions, fourniture par
   * ligne. Absent, ou lecteur simulé sans lecture enregistrée pour ce devis : l'ancienne lecture (prompt A) sert encore.
   */
  lecteur?: LectureReader;
  /** Le nom de l'entreprise, injecté dans le prompt B ({nom_entreprise}). */
  companyName?: (tenant: TenantContext) => Promise<string | null>;
  /**
   * Parcours §48 : le chantier créé par le seul dépôt du PDF prend le nom lu dans le devis (« Chantier Dupont »), et
   * l'adresse ou le client s'ils sont vides. Jamais un nom que l'artisan a déjà donné.
   */
  nameProject?: (tenant: TenantContext, projectId: string, read: { client: string | null; address: string | null }) => Promise<void>;
  /** Coût estimé au-delà duquel un document n'est pas un devis normal (micro-dollars). */
  maxAnalysisMicroUsd?: number;
  now?: () => Date;
  /**
   * Lecture longue (gros devis scanné) : au-delà de ce délai, la réponse part (« lecture en cours »)
   * et la lecture continue en arrière-plan ; l'écran suit son état. Audit de lancement, B3.
   */
  answerWithinMs?: number;
  /** Lecture échouée (IA en panne, réponse inutilisable, erreur imprévue) : prévenir l'équipe (B5). */
  onReadingFailed?: (reason: string) => void;
  /**
   * §48 : « Va boire un café, je te préviens quand c'est prêt. » Une lecture ou un calcul trop long pour une réponse
   * (passé en arrière-plan) prévient l'artisan qui l'a lancé quand il finit : questions prêtes, ou liste prête.
   */
  onReady?: (tenant: TenantContext, ready: { step: "questions" | "resultat"; projectId: string }) => Promise<void>;
  /** Garde la lecture en vie après la réponse (Vercel : waitUntil). Par défaut : elle continue seule. */
  keepAlive?: (work: Promise<unknown>) => void;
  /** §45.8 : la mémoire des consommables de l'entreprise (« On ajoute ? »). */
  consumables?: ConsumableHabits;
  /** §47.4 : les règles « à vérifier » confirmées par les artisans ; trois entreprises différentes les valident. */
  rules?: RuleConfirmations;
}

/**
 * §47.4 / §47.5 : « C'est bon » sur une ligne orange (écran) ou une ligne commandée telle quelle (bon de commande)
 * confirme ses règles pour l'entreprise ; validée selon `ruleValidatedBy` (3 écrans, 2 bons, ou 1 bon + 1 autre).
 */
export interface RuleConfirmations {
  /** Parmi ces règles, celles qui sont validées. */
  validated(keys: readonly string[]): Promise<Set<string>>;
  confirm(tenant: TenantContext, keys: readonly string[], source?: "screen" | "order"): Promise<void>;
}

/**
 * §45.8 : ce que l'entreprise a fait des suggestions. Refusée trois chantiers d'affilée : plus proposée ; une ligne
 * ajoutée à la main sur deux chantiers différents devient une suggestion.
 */
export interface ConsumableHabits {
  hidden(tenant: TenantContext): Promise<Set<string>>;
  manual(tenant: TenantContext): Promise<{ key: string; designation: string; quantity: string | null; unit: string | null }[]>;
  answered(tenant: TenantContext, entry: { key: string; designation: string; accepted: boolean; projectId: string }): Promise<void>;
  addedByHand(tenant: TenantContext, entry: { designation: string; quantity: string | null; unit: string | null; projectId: string }): Promise<void>;
}

/** Clé d'une ligne ajoutée à la main (« Bâche de protection 4 × 5 m » → « manual:bache de protection 4 x 5 m »). */
export const manualKey = (designation: string) =>
  `manual:${designation.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/×/g, "x").replace(/\s+/g, " ").trim()}`;

/**
 * La lecture tourne dans la fonction serveur qui a reçu le devis (Vercel : 300 s au plus, puis elle est coupée). Un appel
 * IA ne part que s'il a le temps de finir avant cette limite (`AI_CALL_TIMEOUT_MS`) ; sinon la lecture échoue
 * proprement (« timeout ») au lieu d'être coupée en route.
 */
export const READING_BUDGET_MS = 280 * 1000;
/** Durée maximale d'un appel IA de lecture (le client Anthropic coupe au-delà, sans relance cachée). */
export const AI_CALL_TIMEOUT_MS = 170 * 1000;
/** Une lecture « en cours » depuis plus longtemps a été interrompue (fonction coupée) : elle compte comme échouée. */
export const STALE_READING_MS = 5 * 60 * 1000;
/** Un calcul (appel IA n° 2) commencé depuis plus longtemps a été coupé : il peut repartir. */
export const STALE_CALCUL_MS = 3 * 60 * 1000;

/**
 * Le client et l'adresse lus dans l'en-tête du devis (prompt A, « contexte ») : clés libres, on prend la première qui
 * ressemble (« client », « nom du client », « maître d'ouvrage » ; « adresse », « adresse du chantier »).
 */
export function quoteIdentity(context: Record<string, string> | null): { client: string | null; address: string | null } {
  const entries = Object.entries(context ?? {}).map(([k, v]) => [normalizeText(k), String(v ?? "").trim()] as const).filter(([, v]) => v.length > 0 && v.length <= 160);
  const pick = (re: RegExp) => entries.find(([k]) => re.test(k))?.[1] ?? null;
  return { client: pick(/\b(client|maitre d.?ouvrage|proprietaire|destinataire)\b/), address: pick(/\badresse\b/) };
}

/** Où en est la lecture du devis client d'un chantier, tant que la liste n'existe pas. */
export interface ReadingState {
  status: "reading" | "failed";
  /** Raison de l'échec (« interrupted », « abnormal_size »…), ou null. */
  reason: string | null;
}

export type StartResult = { state: "ready"; result: ReviewedTakeoff } | { state: "reading" };

/** Plafond par défaut (≈ 2,8 €) : environ 5 fois un devis de 500 lignes scanné (≈ 0,6 €). */
export const DEFAULT_MAX_ANALYSIS_MICRO_USD = 3_000_000;

/**
 * MESURES D'UNE LECTURE (télémétrie, PD-046), enregistrées avec l'analyse :
 * de quoi vérifier sur de vrais devis que le découpage ne perd ni ne double
 * rien, et ce que coûte réellement une lecture. Sans effet sur le résultat.
 */
export interface ReadingStats {
  version: 1;
  outcome: "completed" | "failed";
  failure?: string;
  /** « lecture » : la lecture par le modèle en un appel (§51.5). */
  strategy: "single" | "split" | "lecture";
  /** « text » : PDF texte ; « scan » : pages en image (scan, photos) ; « mixed » : les deux. */
  document: "text" | "scan" | "mixed";
  pages: { text: number; scan: number };
  plannedBlocks: number;
  calls: number;
  /** Issue de chaque appel : success, truncated (réponse coupée), timeout, invalid_output, provider_error, refused. */
  callOutcomes: Record<string, number>;
  /** Blocs relus en deux moitiés après une réponse coupée. */
  splits: number;
  linesBeforeMerge: number;
  linesAfterMerge: number;
  droppedOutsideBlock: number;
  droppedDuplicates: number;
  /** Frontières entre blocs scannés où une ligne coupée a pu être relue (constat seulement). */
  scanBoundaryRisks: { pages: [number, number]; signals: string[] }[];
  tokens: { input: number; output: number; cacheRead: number; cacheWrite: number };
  costMicroUsd: number;
  estimatedMicroUsd: number;
  durationMs: number;
}

/** Temps deux : la marque du bilan des réponses (une fois par devis), gardée avec les réponses. */
const BILAN_KEY = "bilan:fait";
const BILAN_QUESTION =
  "Bilan avant de calculer : voici toutes les réponses de l'artisan, et les questions qu'il a retirées. Ses réponses valent des données écrites au devis. Mets la fiche à jour avec ce qu'elles apprennent. Si, réponses comprises, une donnée nécessaire pour commander manque encore, pose UNE seule question (manque) ; sinon rien. Ne repose JAMAIS une question déjà répondue ni une question retirée, même tournée autrement.";

/** Les clés de réponse qui ne sont pas des questions posées (marques, gestes sur la liste). */
const PAS_UNE_QUESTION = /^(lots:|bilan:|a-preciser:|ratio:|role:|precise:|item:|bref:|edit:|label:|quantity:|qty:|nom:)/;

/**
 * Les questions déjà posées à l'artisan sur ce devis, répondues ou retirées (réponse nulle), avec leur phrase et leurs
 * boutons : celles de la lecture, celles du calcul (le Ø des descentes, `param:`), celles qu'une relecture a ouvertes.
 */
function questionsPosees(ref: Referential, takeoff: TakeoffRecord): (QuestionPosee & { valeur: string | null })[] {
  const lecture = takeoff.lecture?.questions ?? [];
  const params = ref.workItems.flatMap((w) => w.params);
  return Object.entries(takeoff.answers).flatMap(([key, v]) => {
    if (v === undefined || PAS_UNE_QUESTION.test(key)) return [];
    const cle = /^(?:param|fiche|unite):([^@]+)/.exec(key)?.[1] ?? (/^product:(.+)$/.exec(key) ? `produit_${/^product:(.+)$/.exec(key)![1]}` : null);
    if (!cle) return [];
    const lue = lecture.find((q) => q.cle === cle);
    const def = params.find((p) => p.key === cle);
    const fiche = takeoff.fiche?.donnees.find((d) => d.cle === cle);
    const text = lue?.texte ?? def?.question ?? fiche?.question ?? null;
    if (!text) return [];
    const options = lue?.boutons.length ? lue.boutons.map((b) => ({ label: b.label, value: b.valeur })) : (def?.choices ?? fiche?.boutons?.map((b) => ({ label: b.label, value: b.valeur })) ?? []).map((c) => ({ label: c.label, value: "value" in c ? c.value : "" }));
    const value = v === null ? null : typeof v === "string" ? v : v.value;
    const valeur = value === null ? null : (options.find((o) => o.value === value)?.label ?? (typeof v === "string" ? v : `${v!.value} ${v!.unit}`));
    return [{ key, text, options, donnee: lue?.donnee ?? def?.label ?? fiche?.libelle ?? null, valeur }];
  });
}

/** §51.2 : la question d'une donnée qu'une relecture a ouverte (« fiche:<donnée> »). */
export const FICHE_KEY = "fiche:";

export interface ReviewedTakeoff {
  takeoff: TakeoffRecord;
  validation: TakeoffValidation;
  /** Rôle de la quantité de chaque ligne, avec sa raison. */
  roles: ReadonlyMap<string, RoleProposal>;
  /** Ce que voit l'artisan : compteurs ✓/⚠/?, décisions regroupées, éléments prêts et leur preuve. */
  view: ArtisanView;
  /** LA LISTE D'ACHATS : à acheter, à faire chiffrer, hypothèses, questions. */
  purchase: PurchaseView;
  /**
   * Lignes exclues par une phrase de la note (§44.2, « garage non compris ») : hors du calcul et du « À commander »,
   * gardées dans le détail sans prix avec la mention « exclu par l'artisan ». Ligne → phrase citée.
   */
  excluded: ReadonlyMap<string, string>;
  /**
   * Deux sources qui se contredisent (§44.3 : devis et document) et dont la question est encore ouverte : rien ne
   * part au fournisseur tant qu'elle l'est (clés des données : « pente »…).
   */
  openContradictions: readonly string[];
  /** Le chantier en bref (§45.3) : les faits confirmés seulement, jamais une hypothèse de l'app. */
  brief: SiteBrief;
  /** §51 : la fiche de chantier (lue, déduite, répondue, manquante), d'où le calcul puise et d'où viennent les questions. */
  fiche: FicheChantier;
  /**
   * Parcours §48 : les habitudes établies de l'entreprise appliquées à ce chantier (« je façonne »), reproposées sur
   * l'écran des questions en « Comme d'habitude ? » ; un tap les confirme ou les change pour ce chantier.
   */
  habits: { key: string; question: string; unit: string; options: { label: string; value: string }[]; value: string }[];
  /** §49.9 : les lignes du devis sans fourniture (heures, forfait, accès, évacuation) : hors de la liste, repliées à part. */
  withoutSupply?: { lineId: string; label: string; measure: string | null }[];
  /** La note de l'artisan sur le chantier (§44), pour le bref de l'écran et de l'envoi (§50.7). */
  siteNotes?: string | null;
  /** §48.4 : ce que l'IA juge utile mais que le devis ne demande pas : bloc « Suggestions », décoché, hors de la liste. */
  aiSuggestions: { key: string; label: string; quantity: string | null; unit: string | null; reason: string }[];
}


type Prepared = PreparedDocument;

/**
 * Quantitatif du devis client : proposé par l'IA, relu par le code, corrigé
 * et validé par l'artisan. Rien n'est commandé ni envoyé à partir d'une
 * liste non validée.
 */
export class TakeoffService {
  constructor(
    private readonly takeoffs: TakeoffRepository,
    private readonly documents: DocumentRepository,
    private readonly meter: AnalysisMeter,
    private readonly recorder: AiUsageRecorder,
    private readonly aiInput: DocumentAiInput,
    private readonly journal: CorrectionJournal,
    private readonly memory: CompanyMemory,
    private readonly onRecordFailure: (error: unknown) => void = () => {},
    private readonly reading: ReadingOptions = {},
  ) {}

  get aiAvailable(): boolean {
    return this.reading.lecteur !== undefined;
  }

  /**
   * Lance la lecture et répond vite : la liste si elle est prête dans le délai, sinon « lecture en
   * cours » (la lecture continue, l'écran interroge `readingState`). Une lecture déjà en cours n'est
   * jamais relancée (double appui, rechargement) : rien n'est payé deux fois.
   */
  async start(tenant: TenantContext, documentId: string): Promise<StartResult> {
    assertCanWrite(tenant);
    const running = await this.meter.current(tenant.companyId, documentId);
    if (running?.status === "started" && !this.stale(running.startedAt)) return { state: "reading" };
    const work = this.extract(tenant, documentId);
    const wait = this.reading.answerWithinMs ?? 8000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<"later">((resolve) => {
      timer = setTimeout(() => resolve("later"), wait);
    });
    try {
      const first = await Promise.race([work.then((result) => ({ result })), timeout]);
      if (first !== "later") return { state: "ready", result: first.result };
    } finally {
      clearTimeout(timer);
    }
    // Trop long pour une réponse : la lecture continue ; son échec éventuel est enregistré avec l'analyse.
    const background = work
      .then((result) => this.ready(tenant, { step: this.phaseOf(result.takeoff) === "resultat" ? "resultat" : "questions", projectId: result.takeoff.projectId }))
      .catch((error: unknown) => this.onRecordFailure(error));
    (this.reading.keepAlive ?? (() => {}))(background);
    return { state: "reading" };
  }

  /**
   * PARCOURS §48, ÉTAPE 4 : les questions de comptoir sont répondues (ou laissées : ligne orange), le calcul part. Le
   * moteur est instantané ; l'appel IA n° 2 complète (ajouts, doutes). Réponse rapide comme la lecture : la liste si elle
   * est prête dans le délai, sinon « calcul en cours » (il continue, l'écran interroge). Un seul départ, jamais deux appels.
   */
  async calculate(tenant: TenantContext, takeoffId: string): Promise<{ state: "ready" | "calculating" }> {
    const takeoff = await this.editable(tenant, await this.takeoffs.findById(tenant, takeoffId));
    if (takeoff.calculatedAt) return { state: "ready" };
    const now = (this.reading.now ?? (() => new Date()))();
    const won = await this.takeoffs.startCalcul(tenant, takeoff.id, now, new Date(now.getTime() - STALE_CALCUL_MS));
    if (!won) return { state: "calculating" };
    const work = (async () => {
      await this.takeoffs.finishCalcul(tenant, takeoff.id, (this.reading.now ?? (() => new Date()))());
    })();
    const wait = this.reading.answerWithinMs ?? 8000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<"later">((resolve) => {
      timer = setTimeout(() => resolve("later"), wait);
    });
    try {
      const first = await Promise.race([work.then(() => "done" as const), timeout]);
      if (first === "done") return { state: "ready" };
    } finally {
      clearTimeout(timer);
    }
    (this.reading.keepAlive ?? (() => {}))(
      work.then(() => this.ready(tenant, { step: "resultat", projectId: takeoff.projectId })).catch((error: unknown) => this.onRecordFailure(error)),
    );
    return { state: "calculating" };
  }

  /** Prévenir l'artisan : une notification qui ne part pas ne casse jamais la lecture ni le calcul. */
  private async ready(tenant: TenantContext, ready: { step: "questions" | "resultat"; projectId: string }): Promise<void> {
    await this.reading.onReady?.(tenant, ready).catch(() => undefined);
  }

  /** Où en est le parcours d'un quantitatif : questions à poser, calcul en cours, ou liste prête. */
  phaseOf(takeoff: TakeoffRecord): "questions" | "calcul" | "resultat" {
    if (takeoff.calculatedAt) return "resultat";
    if (!takeoff.calculStartedAt) return "questions";
    const now = (this.reading.now ?? (() => new Date()))().getTime();
    // Un calcul coupé (serveur arrêté) ne bloque jamais : il se relance au prochain appui.
    return now - takeoff.calculStartedAt.getTime() > STALE_CALCUL_MS ? "questions" : "calcul";
  }

  /** La lecture du devis client du chantier : en cours, échouée, ou rien (pas commencée, ou liste prête). */
  async readingState(tenant: TenantContext, projectId: string): Promise<ReadingState | null> {
    const quote = (await this.documents.listByProject(tenant, projectId)).find((d) => d.purpose === "client_quote");
    return quote ? this.readingStateOf(tenant, quote.id) : null;
  }

  /** La lecture d'un devis précis (porte /v1/quantitatifs) : en cours, échouée, ou rien. */
  async readingStateOf(tenant: TenantContext, documentId: string): Promise<ReadingState | null> {
    const analysis = await this.meter.current(tenant.companyId, documentId);
    if (!analysis || analysis.status === "completed") return null;
    if (analysis.status === "started") return this.stale(analysis.startedAt) ? { status: "failed", reason: "interrupted" } : { status: "reading", reason: null };
    // Le motif enregistré avec la lecture (« nothing_read » : rien trouvé dans le devis), sinon l'échec générique.
    const failure = (analysis.readingStats as { failure?: unknown } | null | undefined)?.failure;
    return { status: "failed", reason: failure === "nothing_read" ? "nothing_read" : "analysis_failed" };
  }

  private stale(startedAt: Date): boolean {
    return (this.reading.now ?? (() => new Date()))().getTime() - startedAt.getTime() > STALE_READING_MS;
  }

  async extract(tenant: TenantContext, documentId: string): Promise<ReviewedTakeoff> {
    assertCanWrite(tenant);
    const doc = await this.documents.findById(tenant, documentId);
    if (!doc) throw notFound("Document");
    if (doc.purpose !== "client_quote") throw validationFailed("Only a client quote gives a materials list");

    const existing = await this.takeoffs.findByDocument(tenant, documentId);
    if (existing) return this.review(tenant, existing);
    if (!this.reading.lecteur) throw new DomainError("ai_unavailable", "AI reading is not configured");

    const prepared = await this.aiInput.prepare(tenant, doc);
    const policy = this.reading.policy ?? DEFAULT_EXTRACTION_POLICY;
    const plan = planReading(prepared.pages, policy, priceTableAt((this.reading.now ?? (() => new Date()))()));
    // Garde-fou : un document au coût anormal pour un devis n'est pas envoyé (rien n'est dépensé ni décompté).
    if (plan.estimate.totalMicroUsd > (this.reading.maxAnalysisMicroUsd ?? DEFAULT_MAX_ANALYSIS_MICRO_USD)) {
      throw new DomainError("unreadable_document", "Estimated reading cost is abnormal for a quote", { reason: "abnormal_size" });
    }
    const begin = await this.meter.begin({
      companyId: tenant.companyId,
      userId: tenant.userId,
      projectId: doc.projectId,
      documentId,
      kind: "client_quote",
    });
    if (begin.status === "already_done") throw new DomainError("conflict", "Analysis already completed for this document");
    const analysisId = begin.analysis.id;
    try {
      // §51.5 : la lecture par le modèle, une fois ; un lecteur qui ne lit pas ce devis est une lecture échouée.
      const lu = await this.readLecture(tenant, doc, prepared, analysisId);
      if (!lu) {
        await this.meter.fail(analysisId);
        throw new DomainError("analysis_failed", "No reader for this quote", { reason: "no_lecture" });
      }
      return lu;
    } catch (error) {
      const known = error instanceof DomainError && error.code === "analysis_failed";
      if (!known) await this.meter.fail(analysisId).catch(() => undefined);
      this.reading.onReadingFailed?.(known ? String((error.details as { reason?: string } | undefined)?.reason ?? "analysis_failed") : "unexpected_error");
      throw error;
    }
  }

  /**
   * §51.5 : UN appel au modèle le plus capable, avec le devis complet (texte et PDF) et l'export du référentiel. La
   * réponse (fiche, bref, questions, fourniture par ligne) est gardée telle quelle avec le quantitatif ; les lignes du
   * quantitatif sont les fournitures nommées, plus les lignes sans fourniture, repliées (§49.9). `null` : ce lecteur ne
   * lit pas ce devis (lecteur simulé sans lecture enregistrée) ; une lecture en échec est une lecture échouée.
   */
  private async readLecture(tenant: TenantContext, doc: DocumentWithProcessing, prepared: Prepared, analysisId: string): Promise<ReviewedTakeoff | null> {
    const lecteur = this.reading.lecteur!;
    const started = Date.now();
    let trade = doc.trade;
    let ref = referentialFor(trade);
    const siteNotes = doc.projectId ? ((await this.reading.projectNotes?.(tenant, doc.projectId)) ?? null) : null;
    // Le devis complet : son texte numéroté (pour citer les lignes) et le PDF entier, toutes pages.
    const content = await this.documents.readContent(tenant, doc.id);
    const pages = prepared.pages.map((p) => p.pageNumber).filter((n): n is number => typeof n === "number");
    const document = { numberedText: prepared.input.numberedText, imagePdf: content?.bytes ?? prepared.input.imagePdf, imagePages: pages };
    const lire = (t: string, r: Referential | null) => lecteur.lire({ document, trade: t, tradeLabel: tradeProfile(t).label, referentiel: r ? exportPourLecture(r) : "Aucun référentiel pour ce métier.", siteNotes });
    let result = await lire(trade, ref);
    if (result === null) return null;
    const counted = { text: prepared.pages.filter((p) => p.route === "text").length, vision: prepared.pages.filter((p) => p.route === "vision").length };
    let cost = await this.record(tenant, doc, counted, prepared.processingId, analysisId, 1, result, LECTURE_PROMPT);
    // MULTIMÉTIER (§52, directive du fondateur, 2026-10-12 : « fais en sorte que l'appli fonctionne en multi métiers ») :
    // le métier est celui que l'IA lit dans le devis, pas celui du compte. Un devis d'électricien déposé chez un couvreur
    // est relu une fois avec le référentiel de l'électricité (un appel de plus, seulement dans ce cas), et calculé avec lui.
    // Un devis à plusieurs lots (électricité, VMC, sanitaire) : relu une fois avec le référentiel de CHAQUE lot, pour que
    // chaque fourniture soit nommée et rattachée à l'ouvrage de son métier (§52 : « une liste par lot, chacun avec son
    // référentiel »).
    const lotsAutres = result.status === "success" && result.output ? metiersDesLots(result.output, trade) : [];
    if (lotsAutres.length > 0) {
      const texte = [trade, ...lotsAutres].map((m) => referentialFor(m)).filter((r): r is Referential => r !== null).map((r) => `=== Référentiel ${tradeProfile(r.trade).label} (${r.trade}) ===\n${exportPourLecture(r)}`).join("\n\n");
      const relu = await lecteur.lire({ document, trade, tradeLabel: tradeProfile(trade).label, referentiel: texte, siteNotes });
      if (relu) {
        cost += await this.record(tenant, doc, counted, prepared.processingId, analysisId, 2, relu, LECTURE_PROMPT);
        if (relu.status === "success" && relu.output && relu.output.lots.length > 1) result = relu;
      }
    }
    const autre = lotsAutres.length === 0 && result.status === "success" && result.output ? metierAutre(result.output, trade) : null;
    if (autre) {
      const relu = await lire(autre, referentialFor(autre));
      if (relu) {
        cost += await this.record(tenant, doc, counted, prepared.processingId, analysisId, 2, relu, LECTURE_PROMPT);
        if (relu.status === "success" && relu.output) {
          result = relu;
          trade = autre;
          ref = referentialFor(autre);
        }
      }
    }
    const scanned = { text: counted.text, scan: counted.vision };
    const stats = (outcome: ReadingStats["outcome"], failure?: string, lines = 0): ReadingStats => ({
      version: 1,
      outcome,
      ...(failure ? { failure } : {}),
      linesBeforeMerge: lines,
      linesAfterMerge: lines,
      droppedOutsideBlock: 0,
      droppedDuplicates: 0,
      scanBoundaryRisks: [],
      strategy: "lecture",
      document: counted.text > 0 && counted.vision > 0 ? "mixed" : counted.vision > 0 ? "scan" : "text",
      pages: scanned,
      plannedBlocks: 1,
      calls: 1,
      callOutcomes: { [result.errorCode === "max_tokens" ? "truncated" : result.status]: 1 },
      splits: 0,
      tokens: { input: result.usage.inputTokens, output: result.usage.outputTokens, cacheRead: result.usage.cacheReadTokens ?? 0, cacheWrite: (result.usage.cacheWrite5mTokens ?? 0) + (result.usage.cacheWrite1hTokens ?? 0) },
      costMicroUsd: cost,
      estimatedMicroUsd: 0,
      durationMs: Date.now() - started,
    });
    if (result.status !== "success" || !result.output) {
      await this.saveStats(analysisId, stats("failed", result.status));
      await this.meter.fail(analysisId);
      throw new DomainError("analysis_failed", "The AI could not read this quote", { reason: result.status });
    }
    const lecture = result.output;
    const lignes = lignesDeLecture(lecture);
    if (lignes.length === 0) {
      await this.saveStats(analysisId, stats("failed", "nothing_read"));
      await this.meter.fail(analysisId);
      throw new DomainError("analysis_failed", "Nothing was read in this quote", { reason: "nothing_read" });
    }
    await this.saveStats(analysisId, stats("completed", undefined, lignes.length));
    if (ref) await this.reading.referentials?.ensure(ref);
    const takeoff = await this.takeoffs.create(tenant, {
      projectId: doc.projectId,
      documentId: doc.id,
      analysisId,
      referentialVersion: ref?.version ?? null,
      trade,
      promptId: LECTURE_PROMPT.id,
      promptVersion: LECTURE_PROMPT.version,
      model: result.model,
      notes: lecture.notes,
      context: lecture.contexte,
      fiche: ficheAvecBref(lecture.fiche, lecture.bref),
      lecture,
      lines: lignes.map((l) => ({
        designation: l.designation.trim(),
        quantityRaw: l.quantity?.trim() || null,
        unitRaw: l.unit?.trim() || null,
        reference: null,
        // Le repère de la ligne dans la lecture (« 1:003 », « 1:003.2 ») : la ligne enregistrée reste reliée à sa lecture.
        sourceRefs: [l.id],
        sourcePages: [],
        section: [],
        aiDoubt: null,
        reading: { role: l.ligne.role, articles: [], faconnage: null, manque: [] },
      })),
    });
    await this.reading.nameProject?.(tenant, doc.projectId, quoteIdentity(lecture.contexte)).catch((error: unknown) => this.onRecordFailure(error));
    await this.meter.complete(analysisId);
    return this.review(tenant, takeoff);
  }

  /**
   * Quantitatif à partir de lignes envoyées par un partenaire (§38) : pas de PDF, rien de décompté. §51.5 : le modèle lit
   * ces lignes comme un devis (fiche, questions, fourniture par ligne) ; sans lecteur, chaque ligne part telle qu'écrite.
   * Le prix suit la ligne, il ne sert à aucun calcul.
   */
  async fromLines(
    tenant: TenantContext,
    projectId: string,
    tradeDuCompte: string,
    lines: readonly { designation: string; quantity: string | null; unit: string | null; price: string | null }[],
  ): Promise<ReviewedTakeoff> {
    assertCanWrite(tenant);
    let trade = tradeDuCompte;
    let ref = referentialFor(trade);
    if (ref) await this.reading.referentials?.ensure(ref);
    const lecteur = this.reading.lecteur;
    let lecture: LectureDevis | null = null;
    if (lecteur) {
      const numberedText = lines.map((l, i) => `[1:${String(i + 1).padStart(3, "0")}] L${i + 1}  ${l.designation.trim()}  ${[l.quantity?.trim(), l.unit?.trim()].filter(Boolean).join(" ")}`).join("\n");
      const siteNotes = (await this.reading.projectNotes?.(tenant, projectId)) ?? null;
      const lire = (t: string, r: Referential | null) => lecteur.lire({ document: { numberedText, imagePdf: null, imagePages: [] }, trade: t, tradeLabel: tradeProfile(t).label, referentiel: r ? exportPourLecture(r) : "Aucun référentiel pour ce métier.", siteNotes });
      let result = await lire(trade, ref);
      // §52 : plusieurs lots : relu une fois avec le référentiel de chaque lot ; un seul autre métier : relu avec le sien.
      const lotsAutres = result && result.status === "success" && result.output ? metiersDesLots(result.output, trade) : [];
      if (lotsAutres.length > 0) {
        const texte = [trade, ...lotsAutres].map((m) => referentialFor(m)).filter((r): r is Referential => r !== null).map((r) => `=== Référentiel ${tradeProfile(r.trade).label} (${r.trade}) ===\n${exportPourLecture(r)}`).join("\n\n");
        const relu = await lecteur.lire({ document: { numberedText, imagePdf: null, imagePages: [] }, trade, tradeLabel: tradeProfile(trade).label, referentiel: texte, siteNotes });
        if (relu && relu.status === "success" && relu.output && relu.output.lots.length > 1) result = relu;
      }
      const autre = lotsAutres.length === 0 && result && result.status === "success" && result.output ? metierAutre(result.output, trade) : null;
      if (autre) {
        const relu = await lire(autre, referentialFor(autre));
        if (relu && relu.status === "success" && relu.output) {
          result = relu;
          trade = autre;
          ref = referentialFor(autre);
          if (ref) await this.reading.referentials?.ensure(ref);
        }
      }
      if (result && result.status === "success" && result.output && lignesDeLecture(result.output).length === lines.length) lecture = result.output;
    }
    const takeoff = await this.takeoffs.create(tenant, {
      projectId,
      documentId: null,
      source: "lignes",
      referentialVersion: ref?.version ?? null,
      analysisId: null,
      trade,
      calculated: true,
      promptId: lecture ? LECTURE_PROMPT.id : "partenaire",
      promptVersion: lecture ? LECTURE_PROMPT.version : 0,
      model: lecture ? "lecture" : "aucun",
      notes: lecture?.notes ?? [],
      ...(lecture ? { fiche: ficheAvecBref(lecture.fiche, lecture.bref), lecture } : {}),
      lines: lines.map((l, i) => ({
        designation: l.designation.trim(),
        quantityRaw: l.quantity?.trim() || null,
        unitRaw: l.unit?.trim() || null,
        reference: null,
        sourceRefs: lecture ? [lignesDeLecture(lecture)[i]!.id] : [],
        sourcePages: [],
        section: [],
        aiDoubt: null,
        priceRaw: l.price?.trim() || null,
        origin: "partner",
      })),
    });
    return this.review(tenant, takeoff);
  }

  /** Le quantitatif d'un devis déposé, s'il est prêt. */
  async forDocument(tenant: TenantContext, documentId: string): Promise<ReviewedTakeoff | null> {
    const takeoff = await this.takeoffs.findByDocument(tenant, documentId);
    return takeoff ? this.review(tenant, takeoff) : null;
  }

  async forProject(tenant: TenantContext, projectId: string): Promise<ReviewedTakeoff | null> {
    const takeoff = await this.takeoffs.findLatestByProject(tenant, projectId);
    return takeoff ? this.review(tenant, takeoff) : null;
  }

  /** La liste d'achats d'un quantitatif (pour la demande de prix), recalculée avec les règles du jour. */
  async reviewed(tenant: TenantContext, takeoffId: string): Promise<ReviewedTakeoff> {
    return this.reload(tenant, takeoffId);
  }

  // Chaque geste de l'artisan est journalisé avec l'AVANT (ce que BatiClair avait compris et
  // montré) et l'APRÈS. Le journal ne touche ni la liste ni le référentiel (PD-045).

  async updateLine(tenant: TenantContext, lineId: string, fields: LineFields, options: { keepStatus?: boolean } = {}): Promise<ReviewedTakeoff> {
    // Depuis l'aperçu avant envoi (§45.9), la ligne de l'artisan ne lève aucun doute : la liste validée le reste.
    const found = await this.takeoffs.findByLine(tenant, lineId);
    const takeoff = options.keepStatus ? await this.itemEditable(tenant, found) : await this.editable(tenant, found);
    const before = await this.review(tenant, takeoff);
    await this.takeoffs.updateLine(tenant, lineId, fields);
    const after = await this.reload(tenant, takeoff.id);
    await this.recordGesture(tenant, "edit", lineId, before, after);
    return after;
  }

  /** « C'est bon » : l'artisan a regardé la ligne douteuse et la garde telle quelle. */
  async confirmLine(tenant: TenantContext, lineId: string): Promise<ReviewedTakeoff> {
    const takeoff = await this.editable(tenant, await this.takeoffs.findByLine(tenant, lineId));
    const before = await this.review(tenant, takeoff);
    await this.takeoffs.confirmLine(tenant, lineId);
    const after = await this.reload(tenant, takeoff.id);
    await this.recordGesture(tenant, "confirm", lineId, before, after);
    return after;
  }

  async deleteLine(tenant: TenantContext, lineId: string): Promise<ReviewedTakeoff> {
    const takeoff = await this.editable(tenant, await this.takeoffs.findByLine(tenant, lineId));
    const before = await this.review(tenant, takeoff);
    await this.takeoffs.deleteLine(tenant, lineId);
    const after = await this.reload(tenant, takeoff.id);
    await this.recordGesture(tenant, "delete", lineId, before, after);
    return after;
  }

  async addLine(tenant: TenantContext, takeoffId: string, fields: LineFields, options: { keepStatus?: boolean } = {}): Promise<ReviewedTakeoff> {
    // « + Ajouter une ligne » de l'aperçu (§45.9) : une ligne de l'artisan, sans doute ; la liste validée le reste.
    const takeoff = options.keepStatus ? await this.itemEditable(tenant, await this.takeoffs.findById(tenant, takeoffId)) : await this.editable(tenant, await this.takeoffs.findById(tenant, takeoffId));
    const known = new Set(takeoff.lines.map((l) => l.id));
    await this.takeoffs.addLine(tenant, takeoff.id, fields);
    const after = await this.reload(tenant, takeoff.id);
    const added = after.takeoff.lines.find((l) => !known.has(l.id));
    if (added) await this.recordGesture(tenant, "add", added.id, null, after);
    // §45.8 : une ligne ajoutée à la main sur deux chantiers devient une suggestion.
    if (added) await this.reading.consumables?.addedByHand(tenant, { designation: added.designation, quantity: added.quantityRaw, unit: added.unitRaw, projectId: takeoff.projectId });
    return after;
  }

  /** Ce que BatiClair avait compris d'une ligne, ou ce que l'artisan en a fait : texte, lecture, état ✓/⚠/?. */
  private snapshot(reviewed: ReviewedTakeoff, lineId: string): LineSnapshot | null {
    const line = reviewed.takeoff.lines.find((l) => l.id === lineId);
    const v = reviewed.validation.lines.find((x) => x.lineId === lineId);
    if (!line || !v) return null;
    const assessment = assessTakeoffLine(v, {
      documentIssues: reviewed.validation.issues,
      confirmedByArtisan: line.confirmed,
      enteredByArtisan: line.origin === "manual" || line.edited,
    });
    return {
      designation: line.designation,
      quantity: line.quantityRaw,
      unit: line.unitRaw,
      reference: line.reference,
      kind: v.kind,
      family: v.family,
      basis: v.basis,
      state: assessment?.state ?? null,
    };
  }

  private async recordGesture(
    tenant: TenantContext,
    action: CorrectionAction,
    lineId: string,
    before: ReviewedTakeoff | null,
    after: ReviewedTakeoff,
  ): Promise<void> {
    const line = (before ?? after).takeoff.lines.find((l) => l.id === lineId);
    const source = line && line.sourceRefs.length > 0 && after.takeoff.documentId ? await this.aiInput.sourceLines(tenant, after.takeoff.documentId) : new Map<string, string>();
    await this.journal.record(tenant, {
      projectId: after.takeoff.projectId,
      takeoffId: after.takeoff.id,
      takeoffLineId: lineId,
      action,
      before: before ? this.snapshot(before, lineId) : null,
      after: action === "delete" ? null : this.snapshot(after, lineId),
      documentExcerpt: (line?.sourceRefs ?? []).flatMap((ref) => (source.has(ref) ? [`[${ref}] ${source.get(ref)}`] : [])),
      context: {
        trade: after.takeoff.trade,
        section: line?.section ?? [],
        promptId: after.takeoff.promptId,
        promptVersion: after.takeoff.promptVersion,
        model: after.takeoff.model,
        // §45.6 : une ligne du devis corrigée d'un tap porte aussi les sept champs (règle : la ligne elle-même).
        ...(action === "edit" && line
          ? await this.journalFacts(tenant, after.takeoff, {
              materiau: line.designation,
              calculee: [line.quantityRaw, line.unitRaw].filter(Boolean).join(" ") || null,
              corrigee: (() => {
                const now = after.takeoff.lines.find((l) => l.id === lineId);
                return now ? [now.quantityRaw, now.unitRaw].filter(Boolean).join(" ") || null : null;
              })(),
              regle: "ligne du devis",
            })
          : {}),
      },
    });
  }

  /**
   * UNE décision de l'artisan qui règle toutes les lignes visées en un geste :
   * « Oui, à la pièce » (unité « u » sur les seules lignes SANS unité, puis
   * gardées) ou « Oui, tels qu'écrits » / « C'est bon » (gardées). Chaque ligne
   * est journalisée (avant / après).
   */
  async decide(tenant: TenantContext, takeoffId: string, input: { action: "pieces" | "keep"; lineIds: string[]; pieceLineIds: string[] }): Promise<ReviewedTakeoff> {
    const takeoff = await this.editable(tenant, await this.takeoffs.findById(tenant, takeoffId));
    const before = await this.review(tenant, takeoff);
    const own = new Map(takeoff.lines.map((l) => [l.id, l]));
    const lineIds = [...new Set(input.lineIds)].filter((id) => own.has(id));
    if (lineIds.length === 0) throw notFound("TakeoffLine");
    const pieces = input.action === "pieces" ? [...new Set(input.pieceLineIds)].filter((id) => lineIds.includes(id) && !own.get(id)!.unitRaw?.trim()) : [];
    for (const id of pieces) {
      const l = own.get(id)!;
      await this.takeoffs.updateLine(tenant, id, { designation: l.designation, quantityRaw: l.quantityRaw, unitRaw: "u", reference: l.reference });
    }
    for (const id of lineIds) await this.takeoffs.confirmLine(tenant, id);
    const after = await this.reload(tenant, takeoff.id);
    for (const id of pieces) await this.recordGesture(tenant, "edit", id, before, after);
    for (const id of lineIds) await this.recordGesture(tenant, "confirm", id, before, after);
    return after;
  }

  /**
   * Réponse à une question du calcul, pour CE chantier : elle sert à tous les
   * ouvrages qui en dépendent, et la question n'est plus reposée.
   */
  /**
   * §45.6 : les sept champs d'une entrée du journal (métier, département, matériau, quantité calculée, quantité corrigée,
   * règle utilisée, version du référentiel). Aucun ratio ne bouge : c'est la matière de l'export mensuel, pas une règle.
   */
  private async journalFacts(
    tenant: TenantContext,
    takeoff: TakeoffRecord,
    item: { materiau: string; calculee: string | null; corrigee: string | null; regle: string },
  ): Promise<Record<string, string | null>> {
    const address = (await this.reading.projectAddress?.(tenant, takeoff.projectId)) ?? null;
    const cp = postalCodeIn(address);
    return {
      metier: METIER_NAMES[tradeIdOf(takeoff.trade)] ?? takeoff.trade,
      departement: cp ? (cp.startsWith("97") ? cp.slice(0, 3) : cp.slice(0, 2)) : null,
      materiau: item.materiau,
      quantite_calculee: item.calculee,
      quantite_corrigee: item.corrigee,
      regle: item.regle,
      version_referentiel: takeoff.referentialVersion ?? referentialFor(takeoff.trade)?.version ?? null,
    };
  }

  /**
   * §47.5 RETOUR FOURNISSEUR : ce que l'artisan a réellement commandé, au journal. Chaque écart entre la liste envoyée
   * et le bon de commande est une correction (« correct » : quantité calculée → quantité commandée, 0 pour une ligne
   * retirée ; « add » : une ligne que la liste n'avait pas) ; une ligne commandée telle qu'envoyée est une confirmation.
   * Toutes marquées « bon de commande », de poids 3 (« une correction venue d'une commande réelle vaut trois
   * confirmations d'écran ») : l'export mensuel les compte à part. Aucun ratio ne bouge seul.
   */
  async recordSupplierOrder(
    tenant: TenantContext,
    takeoffId: string,
    order: { priceRequestId: string; supplierId: string; outcome: "as_is" | "modified"; gaps: readonly OrderGap[] },
  ): Promise<number> {
    const takeoff = await this.takeoffs.findById(tenant, takeoffId);
    if (!takeoff) throw notFound("Takeoff");
    const items = (await this.review(tenant, takeoff)).purchase.toBuy;
    let recorded = 0;
    for (const g of order.gaps) {
      const item = items.find((b) => g.designation === b.label || g.designation.startsWith(`${b.label} (`));
      const action = g.kind === "added" ? "add" : g.kind === "same" ? "confirm" : "correct";
      // Une ligne commandée telle qu'envoyée confirme ses règles « à vérifier », avec la preuve d'un bon de commande.
      // L'écart devis / calcul (« local ») est propre au chantier : il ne valide aucune règle.
      const shared = (item?.rules ?? []).filter((r) => !r.local);
      if (g.kind === "same" && shared.length) await this.reading.rules?.confirm(tenant, shared.map((r) => r.key), "order");
      await this.journal.record(tenant, {
        projectId: takeoff.projectId,
        takeoffId: takeoff.id,
        takeoffLineId: null,
        action,
        before: g.kind === "added" ? null : { designation: g.designation, quantity: g.sent, unit: g.unit, reference: null },
        after: g.kind === "removed" ? null : { designation: g.designation, quantity: g.ordered, unit: g.unit, reference: null },
        documentExcerpt: [],
        context: {
          trade: takeoff.trade,
          source: "bon_de_commande",
          poids: ORDER_WEIGHT,
          commande: order.outcome === "as_is" ? "tel quel" : "modifiée",
          demande: order.priceRequestId,
          fournisseur: order.supplierId,
          ecart_pct: g.gapPercent,
          ...(await this.journalFacts(tenant, takeoff, {
            materiau: g.designation,
            calculee: g.sent,
            corrigee: g.kind === "removed" ? "0" : g.ordered,
            regle: item ? item.needIds.join(" + ") || item.key : "commande",
          })),
        },
      });
      recorded++;
    }
    return recorded;
  }

  async answer(tenant: TenantContext, takeoffId: string, key: string, value: EngineAnswer): Promise<ReviewedTakeoff> {
    // Une correction d'article (§41.4, §45.8, §45.9 : depuis l'aperçu avant envoi) ne lève aucun doute : la liste validée le reste.
    const itemOnly = /^(quantite|libelle|precision|retire|ajout|bref):/.test(key);
    const takeoff = itemOnly ? await this.itemEditable(tenant, await this.takeoffs.findById(tenant, takeoffId)) : await this.editable(tenant, await this.takeoffs.findById(tenant, takeoffId));
    const previous = takeoff.answers[key];
    // §45.8 : « On ajoute ? » — Oui / Non d'un tap, mémorisé pour l'entreprise.
    if (key.startsWith("ajout:")) {
      const itemKey = key.slice("ajout:".length);
      if (value !== "oui" && value !== "non") throw validationFailed("Answer oui or non", { reason: "invalid_answer" });
      const offered = (await this.review(tenant, takeoff)).purchase.suggestions.find((s) => s.key === itemKey);
      const designation = offered?.label ?? itemKey;
      await this.reading.consumables?.answered(tenant, { key: itemKey, designation, accepted: value === "oui", projectId: takeoff.projectId });
      // Une ligne habituelle de l'entreprise (ajoutée à la main ailleurs) devient une vraie ligne de ce chantier.
      if (itemKey.startsWith("manual:") && value === "oui" && offered) {
        return this.addLine(tenant, takeoff.id, { designation: offered.label, quantityRaw: offered.order?.count ?? null, unitRaw: offered.order?.unit ?? null, reference: null }, { keepStatus: true });
      }
      await this.takeoffs.setAnswer(tenant, takeoff.id, key, value);
      return this.reload(tenant, takeoff.id);
    }
    // §45.6 : une correction d'un tap sur un article calculé (quantité, désignation) va au journal avec ses sept champs ;
    // la « quantité calculée » est celle du moteur, avant toute correction de l'artisan sur cet article.
    const corrected = /^(quantite|libelle|precision|retire):(.+)$/.exec(key);
    if (corrected) {
      const itemKey = corrected[2]!;
      if (corrected[1] === "retire" && value !== "oui" && value !== null) throw validationFailed("Answer oui", { reason: "invalid_answer" });
      const answers = { ...takeoff.answers };
      for (const k of ["quantite", "libelle", "precision", "retire"]) delete answers[`${k}:${itemKey}`];
      const engine = (await this.review(tenant, { ...takeoff, answers })).purchase.toBuy.find((b) => b.key === itemKey);
      await this.takeoffs.setAnswer(tenant, takeoff.id, key, value);
      const after = await this.reload(tenant, takeoff.id);
      const now = after.purchase.toBuy.find((b) => b.key === itemKey);
      if (engine) {
        await this.journal.record(tenant, {
          projectId: takeoff.projectId,
          takeoffId: takeoff.id,
          takeoffLineId: null,
          action: "correct",
          before: { designation: engine.label, quantity: engine.quantity, unit: engine.order?.unit ?? null, reference: null },
          after: { designation: now?.label ?? engine.label, quantity: now?.quantity ?? engine.quantity, unit: now?.order?.unit ?? null, reference: null },
          documentExcerpt: [],
          context: {
            trade: takeoff.trade,
            promptVersion: takeoff.promptVersion,
            ...(await this.journalFacts(tenant, takeoff, {
              materiau: engine.label,
              calculee: engine.quantity,
              // Retirée d'un tap (croix de l'aperçu) : corrigée à zéro.
              corrigee: now ? now.quantity : "0",
              regle: engine.needIds.join(" + ") || itemKey,
            })),
          },
        });
      }
      return after;
    }
    // §47.3 / §47.4 : « C'est bon » sur une quantité calculée avec une règle « à vérifier » : la ligne passe au vert,
    // chaque règle est confirmée pour l'entreprise (trois entreprises différentes la valident), et tout va au journal.
    // Les lignes orange de la vérification : un interdit ou un doute du quantitatif IA (« C'est bon »), un ajout proposé
    // (« Oui, on l'ajoute » : la ligne entre dans la liste ; « non » : elle disparaît). Tout va au journal.
    if (key.startsWith(FORBIDDEN) || key.startsWith(AI_DOUBT) || key.startsWith(AI_ADDITION) || key.startsWith(MISSING_INFO)) {
      if (value !== "ok" && value !== "non") throw validationFailed("Answer ok or non", { reason: "invalid_answer" });
      const current = await this.review(tenant, takeoff);
      // §48.4 : un ajout de l'IA n'est plus une ligne orange mais une suggestion (bloc à part, décoché) ; il se coche ici.
      const aiAdd = current.aiSuggestions.find((a) => a.key === key);
      const decision =
        current.purchase.questions.find((q) => q.key === key) ??
        (aiAdd ? { key, title: aiAdd.label, text: aiAdd.reason, suggestion: { label: aiAdd.label, quantity: aiAdd.quantity, unit: aiAdd.unit } } : undefined);
      if (!decision) throw notFound("Decision");
      const added = key.startsWith(AI_ADDITION) && value === "ok" && decision.suggestion;
      if (added) {
        await this.takeoffs.addLine(tenant, takeoff.id, { designation: decision.suggestion!.label, quantityRaw: decision.suggestion!.quantity, unitRaw: decision.suggestion!.unit, reference: null });
      }
      await this.takeoffs.setAnswer(tenant, takeoff.id, key, value);
      const s = decision.suggestion;
      await this.journal.record(tenant, {
        projectId: takeoff.projectId,
        takeoffId: takeoff.id,
        takeoffLineId: null,
        action: added ? "add" : "confirm",
        before: null,
        after: added && s ? { designation: s.label, quantity: s.quantity, unit: s.unit, reference: null } : null,
        documentExcerpt: [],
        context: {
          trade: takeoff.trade,
          ...(await this.journalFacts(tenant, takeoff, { materiau: s?.label ?? decision.title, calculee: null, corrigee: s?.quantity ?? null, regle: `${key.split(":")[0]} : ${decision.text}`.slice(0, 300) })),
        },
      });
      return this.reload(tenant, takeoff.id);
    }
    if (key.startsWith(RATIO)) {
      const itemKey = key.slice(RATIO.length);
      const item = (await this.review(tenant, takeoff)).purchase.toBuy.find((b) => b.key === itemKey);
      const rules = (item?.toConfirm ?? []).filter((r) => !r.local);
      await this.takeoffs.setAnswer(tenant, takeoff.id, key, "ok");
      if (rules.length > 0) await this.reading.rules?.confirm(tenant, rules.map((r) => r.key));
      await this.journal.record(tenant, {
        projectId: takeoff.projectId,
        takeoffId: takeoff.id,
        takeoffLineId: null,
        action: "confirm",
        before: item ? { designation: item.label, quantity: item.quantity, unit: item.order?.unit ?? null, reference: null } : null,
        after: item ? { designation: item.label, quantity: item.quantity, unit: item.order?.unit ?? null, reference: null } : null,
        documentExcerpt: [],
        context: {
          trade: takeoff.trade,
          ...(await this.journalFacts(tenant, takeoff, { materiau: item?.label ?? itemKey, calculee: item?.quantity ?? null, corrigee: item?.quantity ?? null, regle: rules.map((r) => r.key).join(" + ") || itemKey })),
        },
      });
      return this.reload(tenant, takeoff.id);
    }
    // §52, la carte « Lots repérés » : au moins un lot, chacun un métier (« electrical,plumbing »).
    if (key === LOTS_KEY && (typeof value !== "string" || !/^[a-z0-9_-]{1,40}(,[a-z0-9_-]{1,40})*$/.test(value))) throw validationFailed("Answer the kept lots", { reason: "invalid_answer" });
    await this.takeoffs.setAnswer(tenant, takeoff.id, key, value);
    // Mémoire de l'entreprise : un produit choisi, ou une réponse d'habitude (« je façonne », épaisseur du zinc),
    // compte pour SON entreprise ; établie au deuxième chantier différent, elle n'est plus demandée (dite, modifiable).
    // « param:faconnage@noue » (§48.2, pièce par pièce) : l'habitude reste celle du chantier entier (« je façonne »).
    const [kind, scopedName] = key.split(":") as [string, string];
    const name = scopedName.split("@")[0]!;
    // Un modèle écrit sous « Autre » (« Tuile Romane Canal Monier ») n'est pas au référentiel : jamais une habitude.
    const known = (id: string) => [...(referentialFor(takeoff.trade) ? [referentialFor(takeoff.trade)!] : []), ...REFERENTIALS].some((r) => r.products.some((p) => p.id === id));
    if (kind === "product" && typeof value === "string" && value !== "" && known(value)) {
      await this.memory.recordChoice(tenant, { kind: "product", key: `slot:${name}`, value, projectId: takeoff.projectId });
    }
    if (kind === "param" && value && typeof value === "object") {
      const own = referentialFor(takeoff.trade);
      const def = [...(own ? [own] : []), ...REFERENTIALS].flatMap((r) => r.workItems.flatMap((w) => w.params)).find((p) => p.key === name);
      // Une réponse pour UN lot (« param:faconnage@noue ») fait l'habitude de ce lot seulement (§48.2, lot par lot).
      // §49.4 point 4 : la réponse consommables (oui / non) est une habitude de l'artisan, mémorisée comme les autres.
      // Une pièce écrite au devis (« faconnage@bandes-zinc__<ligne> ») fait l'habitude de son ouvrage, pas d'un chantier.
      if (def?.kind === "artisan_preference" || name === CONSUMABLES_KEY) await this.memory.recordChoice(tenant, { kind: "param", key: `param:${baseOf(scopedName)}`, value: value.value, projectId: takeoff.projectId });
    }
    const after = await this.reload(tenant, takeoff.id);
    const text = (v: EngineAnswer | undefined) => (v === undefined ? null : v === null ? "aucun" : typeof v === "string" ? v : `${v.value} ${v.unit}`);
    await this.journal.record(tenant, {
      projectId: takeoff.projectId,
      takeoffId: takeoff.id,
      takeoffLineId: null,
      action: "answer",
      before: previous === undefined ? null : { designation: key, quantity: null, unit: null, reference: text(previous) },
      after: { designation: key, quantity: null, unit: null, reference: text(value) },
      documentExcerpt: [],
      context: { trade: takeoff.trade, promptVersion: takeoff.promptVersion },
    });
    return after;
  }

  /**
   * L'artisan valide : seulement quand aucune ligne n'est bloquante (quantité
   * absente ou illisible) et que chaque doute a été vu (corrigé ou confirmé).
   * Rien ne part chez un fournisseur avec un doute non levé.
   */
  async validate(tenant: TenantContext, takeoffId: string): Promise<ReviewedTakeoff> {
    const takeoff = await this.editable(tenant, await this.takeoffs.findById(tenant, takeoffId));
    const { validation, purchase, openContradictions } = await this.review(tenant, takeoff);
    // RIEN NE PART VIDE : une lecture qui n'a rien trouvé ne fait jamais une liste à envoyer.
    if (purchase.toBuy.length + purchase.toQuote.length === 0) {
      throw validationFailed("Nothing was read in this quote", { reason: "empty_list" });
    }
    // §44.3 : deux documents qui se contredisent font une question ; rien ne part au fournisseur tant qu'elle est ouverte.
    if (openContradictions.length > 0) {
      throw validationFailed("A contradiction between documents is still open", { reason: "contradiction_open", count: openContradictions.length });
    }
    if (validation.counts.blocking > 0) {
      throw validationFailed("Blocking issues remain", { reason: "blocking_issues", count: validation.counts.blocking });
    }
    if (validation.counts.toVerify > 0) {
      throw validationFailed("Lines to check remain", { reason: "lines_to_check", count: validation.counts.toVerify });
    }
    // Une question qui porte sur une ligne du devis (ambiguïté, article inconnu) attend sa réponse : rien ne part sans elle.
    // Une question du calcul restée sans réponse ne bloque pas : l'article part « à faire chiffrer ».
    if (!purchase.canValidate) {
      const open = purchase.questions.filter((q) => q.lineIds.length > 0).length + purchase.toBuy.filter((b) => b.state !== "ready").length;
      throw validationFailed("Decisions remain", { reason: "decisions_remaining", count: open });
    }
    await this.takeoffs.setStatus(tenant, takeoff.id, "validated");
    // §45.6 : chaque ligne tombée en « à préciser avec vous » est journalisée, avec la raison.
    for (const q of purchase.toQuote) {
      await this.journal.record(tenant, {
        projectId: takeoff.projectId,
        takeoffId: takeoff.id,
        takeoffLineId: q.lineIds[0] ?? null,
        action: "to_quote",
        before: { designation: q.label, quantity: q.measure || null, unit: null, reference: null },
        after: null,
        documentExcerpt: [],
        reason: q.reason,
        context: { trade: takeoff.trade, ...(await this.journalFacts(tenant, takeoff, { materiau: q.label, calculee: null, corrigee: null, regle: q.key })) },
      });
    }
    return this.reload(tenant, takeoff.id);
  }

  async reopen(tenant: TenantContext, takeoffId: string): Promise<ReviewedTakeoff> {
    assertCanWrite(tenant);
    const takeoff = await this.takeoffs.findById(tenant, takeoffId);
    if (!takeoff) throw notFound("Takeoff");
    await this.takeoffs.setStatus(tenant, takeoff.id, "draft");
    return this.reload(tenant, takeoff.id);
  }

  /**
   * Toute modification d'une liste validée la rouvre : l'artisan la valide à
   * nouveau. Les demandes de prix déjà préparées gardent leur copie figée.
   */
  /** Une correction d'article : la liste reste dans son état (validée ou non). */
  private async itemEditable(tenant: TenantContext, takeoff: TakeoffRecord | null): Promise<TakeoffRecord> {
    assertCanWrite(tenant);
    if (!takeoff) throw notFound("Takeoff");
    return takeoff;
  }

  /**
   * §51.2 : une réponse « Autre » relue par l'IA. La fiche est mise à jour, ce que la réponse règle clairement devient la
   * réponse de ses questions (une ou plusieurs), et une donnée qu'elle ouvre devient une question de plus. Null quand la
   * relecture n'est pas possible (pas d'IA, appel en échec) : l'appelant garde alors la réponse telle qu'écrite.
   */
  async relire(tenant: TenantContext, takeoffId: string, questionKey: string, texte: string): Promise<{ reviewed: ReviewedTakeoff; answered: string[] } | null> {
    const relecteur = this.reading.relecteur;
    if (!relecteur) return null;
    const takeoff = await this.editable(tenant, await this.takeoffs.findById(tenant, takeoffId));
    const reviewed = await this.review(tenant, takeoff);
    const open = reviewed.purchase.questions.filter((d) => d.question);
    const asked = open.find((d) => d.question!.key === questionKey || d.key === questionKey);
    if (!asked) return null;
    const toQuestion = (d: (typeof open)[number]): RelectureQuestion => ({ key: d.question!.key, text: d.question!.text, options: d.question!.options ?? [], unit: d.question!.unit ?? null });
    const input = { tradeLabel: tradeProfile(takeoff.trade).label, fiche: reviewed.fiche, question: toQuestion(asked), texte, ouvertes: open.filter((d) => d !== asked).map(toQuestion) };
    const attempt = await relecteur.relire(input);
    const doc = takeoff.documentId ? await this.documents.findById(tenant, takeoff.documentId) : null;
    if (doc && takeoff.analysisId) await this.record(tenant, doc, { text: 0, vision: 0 }, doc.processing?.id ?? null, takeoff.analysisId, 1, attempt, FICHE_RELECTURE_PROMPT);
    if (attempt.status !== "success" || !attempt.output) return null;
    const relecture = decodeRelecture(attempt.output, input);
    await this.takeoffs.setFiche(tenant, takeoff.id, appliquerRelecture(takeoff.fiche, relecture));
    for (const r of relecture.reponses) {
      await this.takeoffs.setAnswer(tenant, takeoff.id, r.question, r.question.startsWith("param:") ? { value: r.valeur, unit: r.unite ?? "u" } : r.valeur);
    }
    // Une donnée ouverte par une relecture se ferme par la réponse écrite, gardée dans la fiche.
    if (questionKey.startsWith(FICHE_KEY)) await this.takeoffs.setAnswer(tenant, takeoff.id, questionKey, texte);
    return { reviewed: await this.reload(tenant, takeoff.id), answered: relecture.reponses.map((r) => r.question) };
  }

  /**
   * Temps deux (directive du fondateur, 2026-10-12) : « quand tout est répondu, un deuxième appel réanalyse la fiche avec
   * les réponses et peut en poser une de plus ». Une fois par devis : la fiche est mise à jour avec ce que les réponses
   * apprennent, et une donnée qui manque encore pour commander devient UNE question de plus (`fiche:<donnée>`), posée avant
   * le calcul. Null quand il n'y a rien à relire, pas d'IA, ou que le bilan est déjà fait.
   */
  async bilan(tenant: TenantContext, takeoffId: string): Promise<{ reviewed: ReviewedTakeoff; opened: boolean } | null> {
    const relecteur = this.reading.relecteur;
    if (!relecteur) return null;
    const takeoff = await this.editable(tenant, await this.takeoffs.findById(tenant, takeoffId));
    if (!takeoff.lecture || takeoff.answers[BILAN_KEY] !== undefined) return null;
    // Retour du fondateur (2026-10-12) : TOUTES les questions posées, celles du calcul comprises (le Ø des descentes), avec la
    // réponse donnée ou « retirée » : le second appel les lit comme des données écrites et ne les repose jamais.
    const ref = referentialFor(takeoff.trade) ?? ROOFING_REFERENTIAL;
    const posees = questionsPosees(ref, takeoff);
    const lus = posees.map((q) => `- ${q.text} → ${q.valeur ?? "question retirée par l'artisan (ne pas la reposer)"}`);
    if (posees.every((q) => q.valeur === null)) return null;
    // Une seule fois, quoi qu'il arrive (même un appel en échec ne se refait pas à chaque calcul).
    await this.takeoffs.setAnswer(tenant, takeoff.id, BILAN_KEY, "fait");
    const reviewed = await this.review(tenant, takeoff);
    const open = reviewed.purchase.questions.filter((d) => d.question);
    const toQuestion = (d: (typeof open)[number]): RelectureQuestion => ({ key: d.question!.key, text: d.question!.text, options: d.question!.options ?? [], unit: d.question!.unit ?? null });
    const input = { tradeLabel: tradeProfile(takeoff.trade).label, fiche: reviewed.fiche, question: { key: "bilan", text: BILAN_QUESTION, options: [], unit: null }, texte: lus.join("\n"), ouvertes: open.map(toQuestion) };
    const attempt = await relecteur.relire(input);
    const doc = takeoff.documentId ? await this.documents.findById(tenant, takeoff.documentId) : null;
    if (doc && takeoff.analysisId) await this.record(tenant, doc, { text: 0, vision: 0 }, doc.processing?.id ?? null, takeoff.analysisId, 1, attempt, FICHE_RELECTURE_PROMPT);
    if (attempt.status !== "success" || !attempt.output) return null;
    const relecture = decodeRelecture(attempt.output, input);
    // Le bilan met la fiche à jour et peut ouvrir une donnée ; il ne répond jamais à la place de l'artisan. Garde-fou du
    // code : une donnée déjà répondue ou retirée n'est jamais redemandée (§51.2, §51.6).
    const donnees = relecture.donnees.map((d) => ({ ...d, preuve: "Tes réponses, relues" }));
    const manque = relecture.manque && !doublonDe(relecture.manque, [...posees, ...open.map(toQuestion).map((q) => ({ key: q.key, text: q.text, options: q.options }))]) ? relecture.manque : null;
    await this.takeoffs.setFiche(tenant, takeoff.id, appliquerRelecture(takeoff.fiche, { donnees, reponses: [], manque }));
    return { reviewed: await this.reload(tenant, takeoff.id), opened: !!manque };
  }

  private async editable(tenant: TenantContext, takeoff: TakeoffRecord | null): Promise<TakeoffRecord> {
    assertCanWrite(tenant);
    if (!takeoff) throw notFound("Takeoff");
    if (takeoff.status !== "draft") await this.takeoffs.setStatus(tenant, takeoff.id, "draft");
    return takeoff;
  }

  private async reload(tenant: TenantContext, id: string): Promise<ReviewedTakeoff> {
    const takeoff = await this.takeoffs.findById(tenant, id);
    if (!takeoff) throw notFound("Takeoff");
    return this.review(tenant, takeoff);
  }

  /**
   * L'écran, recalculé à chaque lecture avec les règles de sa version (§51.5) : la lecture du modèle, ou, sans lecture
   * (lignes d'un partenaire, ancien quantitatif), chaque ligne telle qu'écrite.
   */
  private async review(tenant: TenantContext, record: TakeoffRecord): Promise<ReviewedTakeoff> {
    return this.reviewLecture(tenant, record, record.lecture ?? lectureDepuisLignes(record.lines.map((l) => ({ id: l.id, designation: l.designation, quantity: l.quantityRaw, unit: l.unitRaw }))));
  }

  /**
   * §51.5 : l'écran à partir de la lecture du modèle : le calcul (ratios, conversions) puise dans la fiche et les données
   * lues, la liste suit l'ordre du devis sous les noms du modèle, les questions sont celles du modèle. Les faits du
   * chantier que le code connaît sans rien demander (la zone par le code postal) s'ajoutent.
   */
  private async reviewLecture(tenant: TenantContext, takeoff: TakeoffRecord, lecture: LectureDevis): Promise<ReviewedTakeoff> {
    const notes = (await this.reading.projectNotes?.(tenant, takeoff.projectId)) ?? null;
    const current = referentialFor(takeoff.trade) ?? ROOFING_REFERENTIAL;
    const ref = (takeoff.referentialVersion && takeoff.referentialVersion !== current.version ? await this.reading.referentials?.load(takeoff.referentialVersion) : null) ?? current;
    const address = (await this.reading.projectAddress?.(tenant, takeoff.projectId)) ?? null;
    const zone = climateZone(postalCodeIn(address));
    const extraFacts: SiteFact[] = zone ? [{ key: "zone", value: String(zone), unit: "u", evidence: `Code postal du chantier (${postalCodeIn(address)})`, origin: "document" }] : [];
    if (isCoastal(postalCodeIn(address))) {
      extraFacts.push({ key: "diametre_crochet", value: "2.7", unit: "mm", evidence: `Département littoral (${postalCodeIn(address)}) : crochet inox 2,7 mm`, origin: "document" });
    }
    // Les lignes enregistrées, reliées à la lecture par leur repère (« 1:003 »), ou par leur rang pour un chantier d'avant :
    // chaque fourniture (ou ligne sans fourniture) a son identifiant ; une ligne supprimée par l'artisan ne se lit plus.
    const stored = takeoff.lines.filter((l) => l.origin !== "manual");
    const byRef = stored.some((l) => l.sourceRefs.length > 0);
    const keys = lignesDeLecture(lecture).map((l) => l.id);
    const ids = new Map<string, string>();
    keys.forEach((k, i) => {
      const line = byRef ? stored.find((l) => l.sourceRefs[0] === k) : stored[i];
      if (line) ids.set(k, line.id);
    });
    // Les lignes ajoutées à la main (§45.9) : telles qu'écrites, à la suite du devis.
    const manual = lectureDepuisLignes(takeoff.lines.filter((l) => l.origin === "manual").map((l) => ({ id: l.id, designation: l.designation, quantity: l.quantityRaw, unit: l.unitRaw })));
    // §50.7, §51.4 : la fiche corrigée sur le document (« Rampant : 6,5 m ») l'est pour le calcul aussi.
    const ficheLue = ficheCorrigee(takeoff.fiche ?? ficheAvecBref(lecture.fiche, lecture.bref), takeoff.answers) ?? lecture.fiche;
    const lue: LectureDevis = { ...lecture, fiche: ficheLue, lignes: [...lignesGardees(lecture, keys, ids), ...manual.lignes] };
    const lines = new Map(takeoff.lines.map((l) => [l.id, { confirmed: l.confirmed, enteredByArtisan: l.origin !== "ai" || l.edited, ...(l.edited ? { designation: l.designation, quantity: l.quantityRaw, unit: l.unitRaw } : {}) }]));
    const preferences = await this.memory.forEngine(tenant);
    const input = { ref, lecture: lue, answers: takeoff.answers, preferences, options: { acceptDraft: true }, extraFacts, ids, lines };
    // §47.1 : une règle « à vérifier » sort orange (« Quantité à confirmer »), « C'est bon » la passe au vert ;
    // §47.4 : une règle validée par trois entreprises est verte partout ; l'écran est rejoué avec ces règles.
    // §52 : un devis à plusieurs lots se calcule lot par lot, chacun avec le tiroir de son métier (une section par lot).
    const ecran = (v: ReadonlySet<string>) => (lue.lots.length > 1 ? ecranParLots({ ...input, validated: v, refDe: (m) => referentialFor(m) }) : ecranDeLecture({ ...input, validated: v }));
    let e = ecran(new Set<string>());
    const ruleKeys = [...new Set(e.purchase.toBuy.flatMap((b) => (b.rules ?? []).filter((r) => !r.local).map((r) => r.key)))];
    const validated = ruleKeys.length > 0 ? ((await this.reading.rules?.validated(ruleKeys)) ?? new Set<string>()) : new Set<string>();
    if (validated.size > 0) e = ecran(validated);
    // §41.4 : les mots de l'artisan (libellé, quantité, précision réécrits d'un tap) remplacent ceux de BatiClair.
    const purchase = applyPurchaseOverrides(e.purchase, takeoff.answers);
    const brief = siteBrief({ ref, plan: e.plan, answers: takeoff.answers, lines: e.lignes.map((l) => ({ id: l.id, designation: l.designation, quantity: l.quantity, unit: l.unit })), context: takeoff.context ?? {}, ville: communeOf(address) });
    const shown = ficheChantier({ ref, ai: ficheCorrigee(takeoff.fiche, takeoff.answers), plan: e.plan, answers: takeoff.answers, questions: purchase.questions.flatMap((d) => (d.question ? [d.question] : [])), lignes: new Map(takeoff.lines.map((l) => [l.id, `ligne ${l.position}`])) });
    const fiche = ficheCorrigee(shown, takeoff.answers) ?? shown;
    // §51.2 : une donnée qu'une relecture (« Autre ») a ouverte est UNE question de plus, posée avant le calcul, à laquelle
    // l'artisan répond en écrivant (relue à son tour).
    // Garde-fou (retour du fondateur, 2026-10-12) : une donnée déjà répondue ou retirée, ou déjà demandée à l'écran, n'est
    // jamais redemandée ; un choix fermé a ses boutons (et « Autre »), jamais une case libre (§51.2).
    const posees = questionsPosees(ref, takeoff);
    for (const d of fiche.donnees) {
      const key = `${FICHE_KEY}${d.cle}`;
      if (d.origine !== "manquante" || !d.question || takeoff.answers[key] !== undefined || purchase.questions.some((q) => q.question?.key === `param:${d.cle}` || q.text === d.question)) continue;
      const ouvertes = purchase.questions.flatMap((q) => (q.question ? [{ key: q.question.key, text: q.question.text, options: q.question.options ?? [] }] : []));
      if (doublonDe({ donnee: d.libelle, question: d.question, boutons: d.boutons ?? [] }, [...posees.filter((p) => p.key !== key), ...ouvertes])) continue;
      const options = (d.boutons ?? []).map((b) => ({ label: b.label, value: b.valeur }));
      purchase.questions.push({ key, state: "missing", title: d.question, text: d.question, lineIds: [], primary: null, secondary: [], question: { key, kind: "choose", text: d.question, ...(options.length > 0 ? { options } : {}), named: true } });
    }
    // « Comme d'habitude ? » : une habitude établie (paramètre d'entreprise) d'un ouvrage de ce devis, pas encore répondue
    // sur ce chantier ; lot par lot (§48.2) quand plusieurs ouvrages du devis en dépendent, avec le nom du lot.
    const used = new Set(e.plan.inputs.map((i) => baseOf(i.workItemId)));
    const piecewise = new Set(piecewiseParams(ref, e.plan));
    const habits = [
      ...new Map(
        ref.workItems
          .filter((w) => used.has(w.id))
          .flatMap((w) => w.params.map((d) => ({ w, d })))
          .filter(({ w, d }) => d.kind === "artisan_preference" && d.question && (d.choices?.length ?? 0) > 0 && (preferences.params?.[`${d.key}@${w.id}`] ?? preferences.params?.[d.key]) !== undefined && takeoff.answers[`param:${d.key}`] === undefined)
          .map(({ w, d }) => {
            const perLot = piecewise.has(`param:${d.key}`);
            const usual = (perLot ? preferences.params?.[`${d.key}@${w.id}`] : undefined) ?? preferences.params![d.key]!;
            const key = perLot ? scopedKey(d.key, w.id) : `param:${d.key}`;
            const question = perLot ? `${lotLabel(w.label)} : tu façonnes toi-même ou tu commandes façonné ?` : d.question!;
            return [key, { key, question, unit: d.unit, options: d.choices!.map((c) => ({ label: c.label, value: c.value })), value: usual }] as const;
          })
          .filter(([key]) => takeoff.answers[key] === undefined),
      ).values(),
    ];
    return {
      takeoff,
      validation: e.validation,
      roles: e.roles,
      view: e.view,
      purchase,
      excluded: new Map(),
      openContradictions: [],
      brief,
      fiche,
      habits,
      aiSuggestions: [],
      withoutSupply: e.sansFourniture,
      siteNotes: notes,
    };
  }

  private async record(
    tenant: TenantContext,
    doc: DocumentWithProcessing,
    pages: { text: number; vision: number },
    processingId: string | null,
    analysisId: string,
    attempt: number,
    result: Pick<ReadAttempt<unknown>, "provider" | "model" | "usage" | "status" | "errorCode" | "durationMs">,
    prompt: { id: string; version: number },
  ): Promise<number> {
    try {
      const { costMicroUsd } = await this.recorder.record({
        companyId: tenant.companyId,
        projectId: doc.projectId,
        documentId: doc.id,
        processingId,
        analysisId,
        userId: tenant.userId,
        task: prompt.id,
        route: pages.vision > 0 ? "vision" : "text",
        provider: result.provider,
        model: result.model,
        promptId: prompt.id,
        promptVersion: prompt.version,
        attempt,
        pagesText: pages.text,
        pagesVision: pages.vision,
        usage: result.usage,
        status: result.status,
        errorCode: result.errorCode,
        durationMs: result.durationMs,
      });
      return costMicroUsd;
    } catch (error) {
      // La mesure du coût ne doit jamais faire perdre une lecture réussie ; l'écart est journalisé.
      this.onRecordFailure(error);
      return 0;
    }
  }

  /** Mesures de la lecture : enregistrées avec l'analyse et journalisées ; jamais bloquantes. */
  private async saveStats(analysisId: string, stats: ReadingStats): Promise<void> {
    try {
      await this.meter.recordReading(analysisId, stats);
      this.reading.onStats?.(stats);
    } catch (error) {
      this.onRecordFailure(error);
    }
  }
}

export type { LineValidation, TakeoffIssue };

/** Les lignes de la lecture dont la ligne enregistrée existe encore : une ligne supprimée par l'artisan ne se lit plus (§49.1 : lui seul retire une ligne). */
function lignesGardees(lecture: LectureDevis, keys: readonly string[], ids: ReadonlyMap<string, string>): LectureDevis["lignes"] {
  return lecture.lignes.flatMap((ligne) => {
    const own = keys.filter((k) => k === ligne.ref || k.startsWith(`${ligne.ref}.`));
    if (own.length === 0) return [ligne];
    if (own.length === 1) return ids.has(own[0]!) ? [ligne] : [];
    // Plusieurs fournitures écrites sur la ligne (« 1:003.1 », « 1:003.2ʼ ») : seules celles qui existent encore.
    const written = ligne.fournitures.filter((f) => f.quantite !== null);
    const listed = written.length > 0 ? written : ligne.fournitures;
    const kept = listed.filter((_, i) => ids.has(`${ligne.ref}.${i + 1}`));
    if (kept.length === 0) return [];
    return [{ ...ligne, fournitures: [...kept, ...(written.length > 0 ? ligne.fournitures.filter((f) => f.quantite === null) : [])] }];
  });
}

/**
 * §52 : le métier que la lecture a lu dans le devis, quand il diffère de celui qu'on lui a donné et qu'il a un tiroir ;
 * sinon null. Un devis à plusieurs lots garde le métier du chantier (une liste par lot viendra avec ses référentiels).
 */
export function metierAutre(lecture: LectureDevis, tradeDonne: string): string | null {
  if (!lecture.metier || lecture.lots.length > 1) return null;
  const lu = tradeIdOf(lecture.metier);
  const donne = referentialFor(tradeDonne)?.trade ?? tradeIdOf(tradeDonne.split(",")[0] ?? "");
  if (lu === donne || donne === "general") return null;
  // Un artisan multi-métiers (« roofing,electrical ») : le métier lu fait partie des siens, il est pris tel quel.
  return referentialFor(lu)?.trade === lu ? lu : null;
}

/** §52 : les métiers des lots d'un devis à plusieurs lots qui ont un tiroir et ne sont pas celui donné à la lecture. */
export function metiersDesLots(lecture: LectureDevis, tradeDonne: string): string[] {
  if (lecture.lots.length < 2) return [];
  const donne = referentialFor(tradeDonne)?.trade ?? tradeIdOf(tradeDonne.split(",")[0] ?? "");
  if (donne === "general") return [];
  return [...new Set(lecture.lots.map((l) => tradeIdOf(l.metier)))].filter((m) => m !== donne && referentialFor(m)?.trade === m);
}
