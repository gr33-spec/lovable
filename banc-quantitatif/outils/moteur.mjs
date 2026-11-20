// Pont vers le moteur de calcul de l'appli (copie de lecture, aucune IA) : lecture → questions → liste.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ICI = path.dirname(fileURLToPath(import.meta.url));
export const d = await import(path.join(ICI, "../.moteur/baticlair/packages/domain/dist/index.js"));
export const ref = d.ROOFING_REFERENTIAL;

/** Une question, réduite à ce que voit l'artisan. */
const q2 = (q) => ({ key: q.key, text: q.text, unit: q.unit ?? null, options: (q.options ?? []).map((o) => ({ label: o.label, value: o.value })), hint: q.hint ?? null });

/** La réponse du modèle (format de l'appli, « wire ») relue comme le fait l'appli (decodeLecture). */
const t = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
const rec = (l) => (Array.isArray(l) ? Object.fromEntries(l.filter((x) => x && t(x.cle) && t(String(x.valeur ?? ""))).map((x) => [x.cle.trim(), String(x.valeur).trim()])) : (l ?? {}));
export function decode(w) {
  if (!w || typeof w !== "object") return null;
  return {
    metier: t(w.metier) ?? "roofing", lots: w.lots ?? [],
    fiche: Array.isArray(w.fiche) ? w.fiche.map((f) => ({ ...f, valeur: String(f.valeur ?? "").trim() })) : (w.fiche ?? []),
    bref: w.bref ?? [],
    questions: (w.questions ?? []).map((q) => ({ ...q, boutons: q.boutons ?? [], unite: t(q.unite), ligne: t(q.ligne) })),
    lignes: (w.lignes ?? []).map((l) => ({ ...l, ref: String(l.ref), quantite: t(String(l.quantite ?? "")), unite: t(l.unite), fournitures: (l.fournitures ?? []).map((f) => ({
      nom: f.nom, quantite: t(String(f.quantite ?? "")), unite: t(f.unite), ouvrage: t(f.ouvrage), emplacement: t(f.emplacement), donnees: rec(f.donnees),
      attend: f.attend ?? [], aPreciser: f.a_preciser ?? f.aPreciser ?? [], precision: t(f.precision) })) })),
    contexte: rec(w.contexte), notes: w.notes ?? [],
  };
}

/** L'écran de l'appli pour une lecture et des réponses. */
export function ecran(lectureBrute, answers = {}) {
  const lecture = d.parseLecture(decode(lectureBrute));
  if (!lecture) throw new Error("lecture illisible (parseLecture)");
  const e = d.ecranDeLecture({ ref, lecture, answers, preferences: {} });
  return {
    questions: e.questions.map(q2),
    liste: e.purchase.toBuy.map((b) => ({ label: b.label, quantite: b.order?.count ?? null, unite: b.order?.unit ?? null, affiche: b.quantity, etat: b.state, precision: b.precision ?? null, lignes: b.lineIds ?? [], attend: b.waitsOn ?? [], genre: b.kind })),
    aChiffrer: e.purchase.toQuote.map((c) => ({ label: c.label, raison: c.reason ?? null, lignes: c.lineIds ?? [], attend: c.waitsOn ?? [] , asks: (c.asks ?? []).map((a) => a.key)})),
    hypotheses: (e.purchase.assumptions ?? []).map((a) => ({ key: a.key, label: a.label ?? a.text ?? null, value: a.value ?? null })),
    suggestions: e.suggestions,
    sansFourniture: e.sansFourniture.map((s) => s.label),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const lecture = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const answers = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], "utf8")) : {};
  console.log(JSON.stringify(ecran(Array.isArray(lecture) ? lecture[0] : lecture, answers), null, 1));
}
