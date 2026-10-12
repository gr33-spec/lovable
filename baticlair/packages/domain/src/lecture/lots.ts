import type { Referential } from "../referential/model.js";
import type { EcranDeLecture, LectureDevis } from "./lecture.js";
import { ecranDeLecture } from "./lecture.js";

type Entree = Parameters<typeof ecranDeLecture>[0];

/** Un lot du devis tel que l'écran le montre : son métier, son nom, et le référentiel qui l'a calculé. */
export interface LotCalcule {
  metier: string;
  libelle: string;
  /** Le métier du tiroir qui a calculé le lot (celui du chantier quand le lot n'a pas de tiroir). */
  trade: string;
}

/**
 * MULTIMÉTIER, UNE LISTE PAR LOT (§52, décision du 11 octobre ; directive du fondateur, 2026-10-12 : « on y va franco,
 * fais en sorte que l'appli fonctionne en multi métiers ») : « Un devis multi-lots donne une liste par lot, chacun avec
 * son référentiel. » Chaque lot de la lecture est calculé à part, avec le tiroir de son métier (l'électricité avec ses
 * points et ses couronnes, la plomberie avec la sienne), puis les listes sont réunies : une section par lot à l'écran,
 * dans l'ordre du devis ; les questions de tous les lots sur le même écran, une seule fois chacune. Une ligne qu'aucun lot
 * ne cite va au lot du métier principal. Un devis d'un seul lot passe par `ecranDeLecture`, sans rien changer.
 */
export function ecranParLots(input: Entree & { refDe: (metier: string) => Referential | null }): EcranDeLecture & { lots: LotCalcule[] } {
  const { lecture, refDe } = input;
  const lots = lecture.lots.filter((l) => l.lignes.length > 0);
  if (lots.length < 2) return { ...ecranDeLecture(input), lots: [] };
  const principal = Math.max(0, lots.findIndex((l) => l.metier === lecture.metier));
  const lotDe = (ref: string) => {
    const base = ref.split(/[.:]/)[0]!;
    const i = lots.findIndex((l) => l.lignes.some((x) => x === ref || x === base));
    return i >= 0 ? i : principal;
  };
  const attendue = (i: number, cle: string) => lecture.lignes.some((l) => lotDe(l.ref) === i && l.fournitures.some((f) => f.attend.includes(cle)));
  const parLot = lots.map((lot, i) => {
    const sous: LectureDevis = {
      ...lecture,
      metier: lot.metier,
      lots: [],
      lignes: lecture.lignes.filter((l) => lotDe(l.ref) === i),
      questions: lecture.questions.filter((q) => (q.ligne ? lotDe(q.ligne) === i : attendue(i, q.cle) || (i === principal && !lots.some((_, j) => attendue(j, q.cle))))),
    };
    const ref = refDe(lot.metier) ?? input.ref;
    return { lot, ref, e: ecranDeLecture({ ...input, ref, lecture: sous }) };
  });
  const tous = parLot.map((x) => x.e);
  const unique = <T>(xs: T[], key: (x: T) => string) => [...new Map(xs.map((x) => [key(x), x])).values()];
  const questionsEcran = unique(tous.flatMap((e) => e.purchase.questions), (d) => d.key);
  const groups = parLot.map(({ lot, e }, i) => ({ key: `lot:${i}:${lot.metier}`, label: lot.libelle, measure: null, kind: "autres" as const, rows: e.purchase.screen.groups.flatMap((g) => g.rows) }));
  const p0 = tous[principal]!;
  const purchase = {
    ...p0.purchase,
    understood: tous.flatMap((e) => e.purchase.understood),
    toBuy: tous.flatMap((e) => e.purchase.toBuy),
    groups: tous.flatMap((e) => e.purchase.groups),
    toQuote: tous.flatMap((e) => e.purchase.toQuote),
    assumptions: unique(tous.flatMap((e) => e.purchase.assumptions), (a) => a.key),
    questions: questionsEcran,
    suggestions: tous.flatMap((e) => e.purchase.suggestions),
    canValidate: tous.every((e) => e.purchase.canValidate),
    screen: { groups, total: groups.reduce((n, g) => n + g.rows.length, 0), toCheck: groups.reduce((n, g) => n + g.rows.filter((r) => r.status === "check").length, 0) },
    warnings: [...new Set(tous.flatMap((e) => e.purchase.warnings))],
  };
  const ordre = new Map(lecture.lignes.map((l, i) => [l.ref, i]));
  const rang = (id: string) => ordre.get(id.split(/[.:]/)[0]!) ?? Number.MAX_SAFE_INTEGER;
  return {
    plan: { ...p0.plan, lines: tous.flatMap((e) => e.plan.lines), inputs: tous.flatMap((e) => e.plan.inputs), conflicts: tous.flatMap((e) => e.plan.conflicts) },
    validation: { ...p0.validation, lines: tous.flatMap((e) => e.validation.lines), issues: tous.flatMap((e) => e.validation.issues) },
    roles: new Map(tous.flatMap((e) => [...e.roles])),
    view: {
      ...p0.view,
      counts: { verified: 0, to_confirm: 0, missing: 0, ...Object.fromEntries((["verified", "to_confirm", "missing"] as const).map((k) => [k, tous.reduce((n, e) => n + (e.view.counts[k] ?? 0), 0)])) },
      decisions: questionsEcran,
      measures: tous.map((e) => e.view.measures).find((m) => m !== null) ?? null,
      items: tous.flatMap((e) => e.view.items),
      ouvrages: tous.flatMap((e) => e.view.ouvrages),
    },
    purchase,
    questions: unique(tous.flatMap((e) => e.questions), (q) => q.key),
    lignes: tous.flatMap((e) => e.lignes).sort((a, b) => rang(a.ligne.ref) - rang(b.ligne.ref)),
    sansFourniture: tous.flatMap((e) => e.sansFourniture),
    lots: parLot.map(({ lot, ref }) => ({ metier: lot.metier, libelle: lot.libelle, trade: ref.trade })),
  };
}
