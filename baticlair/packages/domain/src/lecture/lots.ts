import type { Referential } from "../referential/model.js";
import { referentialFor, tradeIdOf } from "../referential/registry.js";
import { tradeProfile } from "../trades/index.js";
import { POINTS_ELECTRIQUES } from "./electricite.js";
import type { EcranDeLecture, LectureDevis, LectureLot } from "./lecture.js";
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
  const retenus = lotsRetenus(lecture, input.answers?.[LOTS_KEY], refDe);
  const lots = retenus.filter((l) => l.lignes.length > 0);
  // L'artisan n'a gardé qu'un lot : une seule liste, calculée avec le tiroir de ce lot.
  if (lots.length === 1 && retenus !== lecture.lots) {
    const ref = refDe(lots[0]!.metier) ?? input.ref;
    return { ...ecranDeLecture({ ...input, ref, lecture: { ...lecture, metier: lots[0]!.metier, lots: [] } }), lots: [] };
  }
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

/** §52 : la réponse de la carte « Lots repérés » : les métiers des lots gardés et ajoutés, séparés par des virgules. */
export const LOTS_KEY = "lots:confirmes";

const memeMetier = (a: string, b: string) => a === b || tradeIdOf(a) === tradeIdOf(b);

/** Les ouvrages qu'un tiroir sait calculer (les points électriques compris), pour ranger une ligne dans un lot ajouté. */
function ouvragesDe(ref: Referential | null): ReadonlySet<string> {
  if (!ref) return new Set();
  return new Set([...ref.workItems.map((w) => w.id), ...(ref.trade === "electrical" ? POINTS_ELECTRIQUES.map((p) => p.id) : [])]);
}

/**
 * §52, LA CARTE « LOTS REPÉRÉS » (directive du fondateur, 2026-10-13) : après la lecture, l'artisan voit les lots que
 * l'IA a repérés (« Électricité · VMC · Sanitaire »), en retire un ou en ajoute un, puis « C'est bon ». Les lots retenus :
 * - sans réponse, ceux de la lecture, tels quels ;
 * - un lot retiré : ses lignes vont au lot principal (celui du métier du devis, sinon le premier gardé) ;
 * - un lot ajouté (un métier qui a un tiroir) prend les lignes dont l'ouvrage, nommé par le modèle, est un ouvrage de
 *   son tiroir et pas de celui de leur lot : jamais un mot cherché dans la désignation (§51.5).
 */
export function lotsRetenus(lecture: LectureDevis, reponse: unknown, refDe: (metier: string) => Referential | null = referentialFor): LectureLot[] {
  if (typeof reponse !== "string" || reponse.trim() === "") return lecture.lots;
  const ids = [...new Set(reponse.split(",").map((x) => x.trim()).filter(Boolean))];
  const gardes = lecture.lots.filter((l) => ids.some((id) => memeMetier(l.metier, id))).map((l) => ({ ...l, lignes: [...l.lignes] }));
  const ajoutes = ids.filter((id) => !lecture.lots.some((l) => memeMetier(l.metier, id))).map((id) => ({ metier: tradeIdOf(id), libelle: libelleDuMetier(id), lignes: [] as string[] }));
  for (const lot of ajoutes) {
    const siens = ouvragesDe(refDe(lot.metier));
    for (const ligne of lecture.lignes) {
      const ouvrages = ligne.fournitures.flatMap((f) => (f.ouvrage ? [f.ouvrage] : []));
      if (ouvrages.length === 0 || !ouvrages.every((o) => siens.has(o))) continue;
      const base = ligne.ref.split(/[.:]/)[0]!;
      const avant = gardes.find((l) => l.lignes.some((x) => x === ligne.ref || x === base));
      if (avant && ouvrages.some((o) => ouvragesDe(refDe(avant.metier)).has(o))) continue;
      if (avant) avant.lignes = avant.lignes.filter((x) => x !== ligne.ref && x !== base);
      lot.lignes.push(ligne.ref);
    }
  }
  return [...gardes, ...ajoutes];
}

/** Le nom d'un métier tel que l'artisan le lit (« Électricité ») ; l'identifiant quand le métier n'a pas de profil. */
export function libelleDuMetier(metier: string): string {
  const id = tradeIdOf(metier);
  return referentialFor(id)?.trade === id ? tradeProfile(id).label : metier;
}
