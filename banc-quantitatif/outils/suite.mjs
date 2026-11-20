// Après la lecture : les questions (posées au couvreur, réponses gardées), la liste finale, la note.
//   node outils/suite.mjs questions <essais>  → pose les questions connues, liste celles qu'il reste à poser au couvreur
//   node outils/suite.mjs integrer            → range les réponses neuves du couvreur
//   node outils/suite.mjs noter <essais>      → compare chaque liste finale à la référence
import fs from "node:fs";
import { ecran } from "./moteur.mjs";
import { essais, dossier, norm } from "./banc.mjs";
const lire = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "")); } catch { return null; } };
const ecrire = (p, o) => { fs.mkdirSync(p.replace(/\/[^/]+$/, ""), { recursive: true }); fs.writeFileSync(p, JSON.stringify(o, null, 1)); };
const SPECS = lire("chantiers/SPECS.json");
export const qid = (q) => `${q.key} ¦ ${q.text}`;
const carnet = (c) => lire(`couvreur/${c}.json`) ?? {};

/** La réponse du couvreur, dans la forme que l'appli attend. */
function versMoteur(q, r) {
  if (!r || r.ne_sait_pas) return null;
  if (r.bouton) { const o = q.options.find((o) => norm(o.label) === norm(r.bouton)); if (o) return { value: o.value, unit: q.unit ?? "u" }; }
  const v = String(r.valeur ?? "").trim(); if (!v) return null;
  const n = v.replace(",", ".").match(/^-?\d+(?:\.\d+)?$/);
  if (n && q.options.length) { const o = q.options.find((o) => parseFloat(o.value) === parseFloat(n[0])); if (o) return { value: o.value, unit: q.unit ?? "u" }; }
  return n ? { value: n[0], unit: r.unite || q.unit || "u" } : v;
}

/** Déroule les questions d'une lecture, tour après tour (tout ce qui est ouvert est posé d'un coup, comme l'appli). */
export function derouler(lecture, c, politique = "tout") {
  const C = carnet(c), answers = {}, posees = [], manquent = [];
  let e = ecran(lecture, answers); const ouverture = e;
  for (let tour = 0; tour < 12; tour++) {
    let ouvertes = e.questions.filter((q) => !posees.some((p) => p.key === q.key));
    if (!ouvertes.length) break;
    if (politique === "une") ouvertes = ouvertes.slice(0, 1);
    for (const q of ouvertes) { const r = C[qid(q)]; if (!r) manquent.push(q); posees.push({ key: q.key, text: q.text, options: q.options.map((o) => o.label), reponse: r ? (r.reponse.ne_sait_pas ? "je ne sais pas" : r.reponse.bouton || `${r.reponse.valeur} ${r.reponse.unite ?? ""}`.trim()) : null }); answers[q.key] = r ? versMoteur(q, r.reponse) : null; }
    if (manquent.length) break;
    e = ecran(lecture, answers);
  }
  return { ouverture, final: e, posees, manquent, answers };
}

const lectureDe = (m, c, e) => (m === "OR" ? lire(`chantiers/${c}/lecture-or.json`) : lire(`${dossier(m, c, e)}/lecture.json`));
const [cmd, ...listes] = process.argv.slice(2);
const tous = listes.flatMap(essais);

if (cmd === "questions") {
  const aPoser = {}; let finis = 0, erreurs = [];
  for (const [m, c, e] of tous) {
    const L = lectureDe(m, c, e); if (!L) { erreurs.push(`${m}-${c}-e${e} : pas de lecture`); continue; }
    try {
      const r = derouler(L, c);
      if (r.manquent.length) { for (const q of r.manquent) (aPoser[c] ??= {})[qid(q)] = q; continue; }
      const f = (x) => ({ liste: x.liste, aChiffrer: x.aChiffrer, suggestions: x.suggestions, sansFourniture: x.sansFourniture, questions: x.questions.map((q) => q.key) });
      ecrire(`${dossier(m, c, e)}/final.json`, { posees: r.posees, ouverture: f(r.ouverture), final: f(r.final) }); finis++;
    } catch (err) { erreurs.push(`${m}-${c}-e${e} : ${err.message.slice(0, 150)}`); }
  }
  for (const [c, qs] of Object.entries(aPoser)) ecrire(`couvreur/a-poser/${c}.json`, Object.entries(qs).map(([id, q]) => ({ id, question: q.text, boutons: q.options.map((o) => o.label), unite: q.unit, aide: q.hint })));
  console.log(`listes finales : ${finis} ; chantiers avec questions à poser au couvreur : ${Object.keys(aPoser).join(",") || "aucun"}${erreurs.length ? `\nERREURS :\n${erreurs.join("\n")}` : ""}`);
}

if (cmd === "integrer") {
  for (const f of fs.existsSync("couvreur/reponses-neuves") ? fs.readdirSync("couvreur/reponses-neuves") : []) {
    const c = f.replace(".json", ""), neuves = lire(`couvreur/reponses-neuves/${f}`), poser = lire(`couvreur/a-poser/${f}`) ?? [], C = carnet(c);
    if (!Array.isArray(neuves)) { console.log(c, "réponses illisibles"); continue; }
    let n = 0; for (const r of neuves) { const q = poser.find((p) => p.id === r.id) ?? { id: r.id }; if (!r.id || C[r.id]) continue; C[r.id] = { question: q, reponse: { bouton: r.bouton ?? "", valeur: r.valeur ?? "", unite: r.unite ?? "", ne_sait_pas: !!r.ne_sait_pas, dit: r.dit ?? "" } }; n++; }
    ecrire(`couvreur/${c}.json`, C); console.log(c, `+${n} réponse(s)`, poser.length - n ? `(${poser.length - n} sans réponse !)` : "");
  }
  fs.rmSync("couvreur/reponses-neuves", { recursive: true, force: true }); fs.rmSync("couvreur/a-poser", { recursive: true, force: true });
}

/** Une ligne de liste, pour comparer : article, quantité, unité, état (à commander / à chiffrer). */
const lignesDe = (f) => [...f.liste.map((l) => ({ article: l.label, q: l.quantite, u: l.unite, etat: "liste" })), ...f.aChiffrer.map((l) => ({ article: l.label, q: null, u: null, etat: "à chiffrer" }))];
const memeQ = (a, b) => a.etat === b.etat && String(a.q ?? "") === String(b.q ?? "") && norm(a.u ?? "") === norm(b.u ?? "");
const motsDe = (s) => new Set(norm(s).split(" ").filter((w) => w.length >= 3 || /\d/.test(w)));
const sim = (a, b) => { const A = motsDe(a), B = motsDe(b); const i = [...A].filter((x) => B.has(x)).length; return A.size + B.size ? (2 * i) / (A.size + B.size) : 0; };
export function comparer(ref, lue) {
  const R = lignesDe(ref).map((x) => ({ ...x })), M = lignesDe(lue).map((x) => ({ ...x })), out = { justes: [], quantite: [], manquantes: [], inventees: [], douteux: [] };
  const apparier = (seuil, exactQ) => { for (const r of R) { if (r.pris) continue; let best = null, bs = 0; for (const m of M) { if (m.pris || (exactQ && !memeQ(r, m))) continue; const s = norm(r.article) === norm(m.article) ? 2 : sim(r.article, m.article); if (s > bs) { bs = s; best = m; } } if (best && bs >= seuil) { r.pris = best.pris = true; (memeQ(r, best) ? out.justes : out.quantite).push({ ref: r, lue: best, s: +bs.toFixed(2) }); } } };
  apparier(2, true); apparier(2, false); apparier(0.6, true); apparier(0.6, false);
  // Entre 0,3 et 0,6 de ressemblance : un doute, tranché par le contrôleur.
  for (const r of R) { if (r.pris) continue; let best = null, bs = 0; for (const m of M) { if (m.pris) continue; const s = sim(r.article, m.article) + (memeQ(r, m) ? 0.25 : 0); if (s > bs) { bs = s; best = m; } } if (best && bs >= 0.3) { r.pris = best.pris = true; out.douteux.push({ ref: r, lue: best, s: +bs.toFixed(2) }); } }
  out.manquantes = R.filter((r) => !r.pris); out.inventees = M.filter((m) => !m.pris);
  return out;
}

if (cmd === "noter") {
  const lignes = [];
  for (const [m, c, e] of tous) {
    const ref = lire(`${dossier("OR", c, 1)}/final.json`), lue = lire(`${dossier(m, c, e)}/final.json`);
    if (!ref || !lue) { lignes.push({ m, c, e, absent: true }); continue; }
    const k = comparer(ref.final, lue.final), verdicts = lire(`controle/${c}/doutes.json`) ?? {};
    // Les doutes déjà tranchés par le contrôleur.
    const reste = [];
    for (const d of k.douteux) { const v = verdicts[`${norm(d.ref.article)} ¦ ${norm(d.lue.article)}`]; if (v === undefined) reste.push(d); else if (v) (memeQ(d.ref, d.lue) ? k.justes : k.quantite).push(d); else { k.manquantes.push(d.ref); k.inventees.push(d.lue); } }
    const refQ = new Set(ref.posees.map((q) => q.key)), qInutilesV = lire(`controle/${c}/questions.json`) ?? {};
    const horsRef = lue.posees.filter((q) => !refQ.has(q.key));
    const note = { m, c, e, nRef: lignesDe(ref.final).length, justes: k.justes.length, quantite: k.quantite.length, manquantes: k.manquantes.length, inventees: k.inventees.length, doutes: reste.length,
      questions: lue.posees.length, questionsRef: ref.posees.length, questionsHorsRef: horsRef.length, questionsInutiles: horsRef.filter((q) => qInutilesV[`${q.key} ¦ ${q.text}`] === true).length, questionsNonJugees: horsRef.filter((q) => qInutilesV[`${q.key} ¦ ${q.text}`] === undefined).length,
      questionsOubliees: ref.posees.filter((q) => !lue.posees.some((p) => p.key === q.key)).length,
      detail: { quantite: k.quantite.map((d) => `${d.ref.article} : ${d.ref.q ?? "à chiffrer"} ${d.ref.u ?? ""} attendu, ${d.lue.q ?? "à chiffrer"} ${d.lue.u ?? ""} lu`), manquantes: k.manquantes.map((r) => `${r.article} (${r.q ?? "à chiffrer"} ${r.u ?? ""})`), inventees: k.inventees.map((r) => `${r.article} (${r.q ?? "à chiffrer"} ${r.u ?? ""})`), doutes: reste.map((d) => ({ ref: d.ref.article, lue: d.lue.article })), horsRef: horsRef.map((q) => ({ key: q.key, text: q.text })) } };
    ecrire(`${dossier(m, c, e)}/note.json`, note); lignes.push(note);
  }
  ecrire("resultats/notes.json", lignes);
  const parM = {}; for (const n of lignes) { if (n.absent) { (parM[n.m] ??= { absents: 0 }).absents = (parM[n.m].absents ?? 0) + 1; continue; } const a = (parM[n.m] ??= {}); for (const k of ["nRef", "justes", "quantite", "manquantes", "inventees", "doutes", "questions", "questionsRef", "questionsHorsRef", "questionsInutiles", "questionsNonJugees", "questionsOubliees"]) a[k] = (a[k] ?? 0) + n[k]; a.n = (a.n ?? 0) + 1; }
  console.table(parM);
}
