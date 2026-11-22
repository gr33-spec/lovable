// Le banc : fabrique les travaux des sous-agents (vague par vague), assemble les lectures par le code.
//   node outils/banc.mjs travaux <liste d'essais>   → écrit travaux/*.md, affiche « id|modèle|effort » par ligne
//   node outils/banc.mjs assembler <liste d'essais> → écrit lecture.json pour chaque essai complet
// <liste d'essais> : « M0,M4:C01,C02:1,2 » (méthodes : chantiers : numéros d'essai).
import fs from "node:fs";
import { d, ref, decode } from "./moteur.mjs";
import { groupeDe } from "./prompts.mjs";

const SPECS = JSON.parse(fs.readFileSync("chantiers/SPECS.json", "utf8"));
const spec = (c) => SPECS.find((s) => s.id === c);
const lire = (p) => { try { return extraire(fs.readFileSync(p, "utf8")); } catch { return null; } };
/** Un JSON écrit par un sous-agent : parfois entouré de ```json. */
function extraire(s) { const t = s.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, ""); try { return JSON.parse(t); } catch { const i = t.indexOf("{"), j = t.lastIndexOf("}"); try { return JSON.parse(t.slice(i, j + 1)); } catch { return null; } } }
const ecrire = (p, o) => { fs.mkdirSync(p.replace(/\/[^/]+$/, ""), { recursive: true }); fs.writeFileSync(p, typeof o === "string" ? o : JSON.stringify(o, null, 1)); };
export const dossier = (m, c, e) => `resultats/${m}/${c}/e${e}`;
const fichiersDevis = (c) => fs.readdirSync(`entrees/${c}`).sort().map((f) => `entrees/${c}/${f}`);

// ---------- texte et preuves ----------
export const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/(\d)[  ](\d{3})\b/g, "$1$2").replace(/(\d),(\d)/g, "$1.$2").replace(/[^a-z0-9.]/g, " ").replace(/\.(?!\d)/g, " ").replace(/\s+/g, " ").trim();
const nombres = (s) => new Set([...norm(s).matchAll(/\d+(?:\.\d+)?/g)].map((m) => String(parseFloat(m[0]))));
const mots = (s) => norm(s).split(" ").filter((w) => w.length >= 4 && !/^\d/.test(w));
/** Les mots recopiés sont-ils dans le texte du devis ? Tous les chiffres, et au moins 70 % des mots. */
export function prouve(citation, texte) {
  if (!citation || !String(citation).trim()) return false;
  const N = nombres(texte), W = new Set(norm(texte).split(" "));
  for (const n of nombres(citation)) if (!N.has(n)) return false;
  const w = mots(citation); if (w.length === 0) return nombres(citation).size > 0;
  return w.filter((x) => W.has(x)).length / w.length >= 0.7;
}
/** Le texte du devis pour les contrôles du code : celui du PDF, ou la transcription (méthode 8, même essai) d'une photo. */
function texteDe(c, e) {
  if (spec(c).support !== "photo") return fs.readFileSync(`textes/${c}.txt`, "utf8");
  const t = lire(`${dossier("M8", c, e)}/a.json`); if (!t) return null;
  return [...(t.lignes ?? []).map((l) => `${l.designation}    ${l.quantite ?? ""} ${l.unite ?? ""}`), ...(t.hors_lignes ?? [])].join("\n");
}

// ---------- méthode 2 : les mesures relevées par le code ----------
const RE_MESURE = /(\d{2,3}\s?[x×]\s?\d{2,3}(?:\s?[x×]\s?\d{1,3})?)|([Øø]\s?\d{2,3})|(\d+(?:[  ]\d{3})*(?:[.,]\d+)?)(?:([ \t]{0,10})(m²|m2|M2|ml|ML|Ml|mm|cm|m|M|u|U|unités?|unite|pièces?|pces?|pc|ens|ENS|forfait|°|%|ép|kg)(?![A-Za-zÀ-ÿ0-9]))?/g;
export function etiqueter(texte) {
  const mesures = []; let n = 0;
  const out = texte.replace(RE_MESURE, (tout, dim, dia, nb, esp, unite, pos, src) => {
    const suite = src.slice(pos + tout.length, pos + tout.length + 3);
    if (/^\s?€/.test(suite) || /^[.,]?\d/.test(suite)) return tout;                 // un prix, ou le milieu d'un nombre
    if (pos > 0 && /[A-Za-zÀ-ÿ\d/-]/.test(src[pos - 1]) && !dia) return tout;       // un numéro collé à un mot (« D-2026 », « HP10 »)
    const id = `m${++n}`;
    if (dim) mesures.push({ id, brut: tout, valeur: dim.replace(/\s/g, "").replace("×", "x"), unite: "" });
    else if (dia) mesures.push({ id, brut: tout, valeur: dia.replace(/[Øø\s]/g, ""), unite: "" });
    else mesures.push({ id, brut: tout, valeur: nb.replace(/[  ]/g, "").replace(",", "."), unite: (unite ?? "").trim() });
    return `${tout}[${id}]`;
  });
  return { texte: out, mesures };
}

// ---------- les méthodes ----------
const S = (x) => `methodes/systemes/${x}.txt`;
/** Les étapes d'une méthode pour un essai : celles qui restent à faire et peuvent l'être maintenant (leurs entrées existent). */
function etapes(m, c, e) {
  const R = dossier(m, c, e), a = `${R}/a.json`, photo = spec(c).support === "photo";
  const devis = fichiersDevis(c);
  const fait = (p) => lire(p) !== null;
  const T = []; const job = (etape, systeme, modele, effort, entrees, plus = "") => { if (!fait(`${R}/${etape}.json`)) T.push({ id: `${m}-${c}-e${e}-${etape}`, etape, systeme, modele, effort, entrees, plus, sortie: `${R}/${etape}.json` }); };
  const copie = (de) => { if (!fait(a) && fait(de)) ecrire(a, fs.readFileSync(de, "utf8")); return fait(a); };
  switch (m) {
    case "M0": job("a", S("m0"), "opus", "high", devis); break;
    case "M1": if (copie(`${dossier("M0", c, e)}/a.json`)) { const l1 = `${R}/premiere-lecture.json`; ecrire(l1, { lignes: lire(a).lignes }); job("b", S("relecture"), "opus", "high", devis, `La première lecture à relire : \`${l1}\`.`); } break;
    case "M2": { const t = texteDe(c, e); if (t) { const { texte } = etiqueter(t); ecrire(`${R}/texte-etiquete.txt`, texte); job("a", S("m2"), "sonnet", "medium", [`${R}/texte-etiquete.txt`]); } break; }
    case "M3": job("a", S("m3-tri"), "haiku", "low", devis);
      if (fait(a)) for (const g of ["toiture", "evacuation", "raccords"]) { const refs = (lire(a).lignes ?? []).filter((l) => l.partie === g).map((l) => l.ref); if (refs.length) job(`b-${g}`, S(`m3-${g}`), "sonnet", "medium", devis, `Les repères des lignes à rendre (numérotées dans l'ordre du devis, en-tête et totaux exclus) : ${refs.join(", ")}. Leur texte, pour te repérer : ${JSON.stringify((lire(a).lignes).filter((l) => refs.includes(l.ref)).map((l) => `${l.ref} = ${String(l.designation).slice(0, 60)}`))}.`); }
      break;
    case "M4": job("a", S("m4"), "opus", "high", devis); break;
    // Lectures seules déjà faites par un autre modèle, notées à part sans appel en plus : S4 = Sonnet (1re lecture de la méthode 6), H4 = Haiku (méthode 5 avant contrôle).
    case "S4": copie(`${dossier("M6", c, e)}/a.json`); break;
    case "S4b": copie(`${dossier("M6", c, e)}/b.json`); break;
    case "H4": copie(`${dossier("M5", c, e)}/a.json`); break;
    // Méthode 11 (la onzième) : la lecture seule du modèle moyen (1re lecture de la méthode 6), plus les garde-fous du code, sans appel en plus.
    case "M11": case "M12": copie(`${dossier("M6", c, e)}/a.json`); break;
    case "M5": job("a", S("m4"), "haiku", "medium", devis);
      if (fait(a) && texteDe(c, e) && fait(`${dossier("M8", c, e)}/a.json`)) { const al = alertesM5(lire(a), c, e); ecrire(`${R}/alertes.json`, al); if (al.length) { ecrire(`${R}/premiere-lecture.json`, { lignes: lire(a).lignes }); job("b", S("relecture"), "sonnet", "medium", devis, `La première lecture à relire : \`${R}/premiere-lecture.json\`. Le contrôle par le code y a relevé ces points, à vérifier d'abord (certains peuvent être de fausses alertes) :\n${al.map((x) => `- ${x}`).join("\n")}`); } }
      break;
    case "M6": job("a", S("m4"), "sonnet", "medium", devis); job("b", S("m4"), "sonnet", "medium", devis); break;
    case "M7": job("a", S("m7"), "sonnet", "medium", devis); break;
    case "M8": job("a", S("transcription"), "haiku", "low", devis); break;
    case "M9": if (copie(`${dossier("M8", c, e)}/a.json`)) { const l1 = `${R}/premiere-lecture.json`; ecrire(l1, { lignes: lectureDuCode(lire(a)).lignes }); job("b", S("relecture"), "sonnet", "medium", devis, `La première lecture à relire (faite par le code, d'après les mots de la fiche) : \`${l1}\`.`); } break;
    case "M10": job("a", S("m10"), "sonnet", "medium", devis); break;
    default: throw new Error("méthode inconnue " + m);
  }
  return T;
}

function consigne(j) {
  return `# Travail ${j.id}

Tu es un sous-agent d'un banc d'essai de lecture de devis. Tu joues un seul rôle : celui que décrivent tes consignes système. Dossier de travail : \`/home/user/lovable/banc-quantitatif\` (tous les chemins ci-dessous partent de là).

1. Lis EN ENTIER \`${j.systeme}\` (en plusieurs fois avec offset/limit si l'outil le coupe) : ce sont tes consignes système, à suivre à la lettre.
2. Lis le devis : ${j.entrees.map((f) => `\`${f}\``).join(" et ")}.${j.plus ? `\n3. ${j.plus}` : ""}
${j.plus ? 4 : 3}. Écris ta réponse (l'objet JSON demandé par tes consignes, et rien d'autre : ni commentaire, ni balise) dans \`${j.sortie}\` avec l'outil Write.

Règles du banc : n'ouvre AUCUN autre fichier ni dossier que ceux nommés ici ; ne lance aucune commande ; ne cherche rien ailleurs. Quand le fichier est écrit, réponds seulement : fait.
`;
}

// ---------- assemblage par le code ----------
const vide = (f) => ({ nom: f.nom ?? "", quantite: f.quantite ?? "", unite: f.unite ?? "", ouvrage: f.ouvrage ?? "", emplacement: f.emplacement ?? "", donnees: f.donnees ?? [], attend: [], a_preciser: f.a_preciser ?? [], precision: f.precision ?? "" });
const ligne = (l) => ({ ref: String(l.ref), designation: l.designation ?? "", quantite: String(l.quantite ?? ""), unite: l.unite ?? "", role: l.role ?? "fourniture", fournitures: (l.fournitures ?? []).map(vide) });
const lecture = (lignes) => ({ metier: "roofing", lots: [], fiche: [], bref: [], questions: [], lignes: lignes.map(ligne), contexte: [], notes: [] });
const W = (id) => ref.workItems.find((w) => w.id === id);

/** Méthodes 1, 5 et 9 : les corrections du relecteur, appliquées par le code. Une ligne corrigée garde l'ouvrage du relecteur. */
function corriger(lignes, b) {
  const tient = (l) => ({ ...l, role: (l.fournitures ?? []).some((f) => f.ouvrage) && l.role === "fourniture_et_pose" ? "fourniture" : l.role });
  const retirees = new Set((b.lignes_retirees ?? []).map(String));
  const corr = new Map((b.lignes_corrigees ?? []).map((l) => [String(l.ref), tient(l)]));
  let out = lignes.filter((l) => !retirees.has(String(l.ref))).map((l) => corr.get(String(l.ref)) ?? l);
  for (const l of b.lignes_ajoutees ?? []) { const i = out.findIndex((x) => String(x.ref) === String(l.apres ?? "")); out.splice(i + 1, 0, tient({ ...l, ref: `${l.apres ?? "0"}+` })); }
  return out;
}

/** Une mesure écrite dans le texte d'une ligne au forfait (« Surface : 120 m² », « 4 rives de 7,50 m », « 2 x 6 m ») : de l'arithmétique, aucun métier. */
function mesureDansLeTexte(l) {
  const u = norm(l.unite), q = norm(l.quantite);
  if (!(u === "" || /^(ens|ensemble|forfait|ft|fft|f)$/.test(u) || (/^(u|unite|unites)$/.test(u) && q === "1"))) return l;
  const t = String(l.designation).replace(/(\d),(\d)/g, "$1.$2");
  const prod = [...t.matchAll(/(\d+)\s*(?:x|×|\*|[a-zà-ÿ]+s? de)\s*(\d+(?:\.\d+)?)\s*(ml|m)\b(?!²|2)/gi)];
  const simples = [...t.matchAll(/(\d+(?:\.\d+)?)\s*(m²|m2|ml|m)\b/gi)].filter((m) => !prod.some((p) => p.index <= m.index && m.index < p.index + p[0].length));
  if (prod.length === 1 && simples.length === 0) return { ...l, quantite: String(+(parseFloat(prod[0][1]) * parseFloat(prod[0][2])).toFixed(2)), unite: "ml" };
  if (prod.length === 0 && simples.length === 1) return { ...l, quantite: simples[0][1], unite: /m[²2]/i.test(simples[0][2]) ? "m²" : "ml" };
  return l;
}
/** Méthodes 8 et 9 : la transcription, comprise par le code seul (les mots de la fiche, `lectureParLeCode` de l'appli). */
function lectureDuCode(t) {
  const lignes = (t.lignes ?? []).map((l0) => {
    const l = mesureDansLeTexte(l0);
    const achat = l.role === "fourniture" || l.role === "fourniture_et_pose";
    return { ref: l.ref, designation: l.designation, quantite: l.quantite, unite: l.unite, role: achat ? "fourniture_et_pose" : l.role, fournitures: achat ? [{ nom: l.designation, quantite: l.quantite, unite: l.unite }] : [] };
  });
  (t.hors_lignes ?? []).forEach((h, i) => lignes.push({ ref: `note${i + 1}`, designation: h, quantite: "", unite: "", role: "hors_quantitatif", fournitures: [] }));
  const brute = lecture(lignes);
  // Ce que le code en comprend, montré au relecteur de la méthode 9 (les lignes rattachées à la fiche).
  const lue = d.lectureParLeCode(ref, d.parseLecture(decode(brute)));
  return { brute, lignes: lue.lignes.map((l) => ({ ref: l.ref, designation: l.designation, quantite: l.quantite ?? "", unite: l.unite ?? "", role: l.role, fournitures: l.fournitures.map((f) => ({ nom: f.nom, quantite: f.quantite ?? "", unite: f.unite ?? "", ouvrage: f.ouvrage ?? "", emplacement: f.emplacement ?? "", donnees: Object.entries(f.donnees ?? {}).map(([cle, valeur]) => ({ cle, valeur })), a_preciser: f.aPreciser ?? [], precision: f.precision ?? "" })) })) };
}

const sim = (a, b) => { const A = new Set(mots(a)), B = new Set(mots(b)); const i = [...A].filter((x) => B.has(x)).length; return A.size + B.size === 0 ? 0 : (2 * i) / (A.size + B.size); };
/** Méthode 5 : le contrôle par le code d'une lecture du petit modèle. */
function alertesM5(a, c, e) {
  const texte = texteDe(c, e), N = nombres(texte), al = [];
  for (const l of a.lignes ?? []) for (const f of l.fournitures ?? []) {
    const w = f.ouvrage ? W(f.ouvrage) : null;
    if (f.ouvrage && !w) al.push(`ligne ${l.ref}, « ${f.nom} » : l'ouvrage « ${f.ouvrage} » n'existe pas dans la fiche.`);
    if (w && f.emplacement && !w.slots.some((s) => s.key === f.emplacement)) al.push(`ligne ${l.ref}, « ${f.nom} » : l'emplacement « ${f.emplacement} » n'existe pas dans l'ouvrage « ${f.ouvrage} ».`);
    for (const n of nombres(f.quantite)) if (!N.has(n)) al.push(`ligne ${l.ref}, « ${f.nom} » : la quantité ${f.quantite} n'est pas écrite dans le devis.`);
    for (const x of f.donnees ?? []) {
      const p = w?.params.find((p) => p.key === x.cle);
      if (w && !p) { al.push(`ligne ${l.ref}, « ${f.nom} » : la donnée « ${x.cle} » n'est pas une donnée de l'ouvrage « ${f.ouvrage} ».`); continue; }
      const choix = p?.choices?.some((ch) => ch.value === String(x.valeur).trim());
      for (const n of nombres(x.valeur)) if (!N.has(n) && !(choix && parseFloat(n) < 10)) al.push(`ligne ${l.ref}, « ${f.nom} » : la donnée ${x.cle} = ${x.valeur} n'est pas écrite dans le devis.`);
    }
  }
  // Les lignes du devis (recopiées à part) que la lecture n'a pas : un oubli possible.
  const t = lire(`${dossier("M8", c, e)}/a.json`);
  for (const l of t?.lignes ?? []) if (l.role !== "hors_quantitatif" && !(a.lignes ?? []).some((x) => sim(x.designation, l.designation) >= 0.5)) al.push(`ligne du devis peut-être oubliée : « ${String(l.designation).slice(0, 120)} » (${l.quantite} ${l.unite}).`);
  return [...new Set(al)];
}

/** Méthode 6 : deux lectures comparées. Ce qui concorde est gardé ; ce qui diverge est retiré, et le code le demande. */
function fusion(a, b, texte) {
  const journal = [], B = [...(b.lignes ?? [])], out = [];
  for (const la of a.lignes ?? []) {
    let best = -1, bs = 0; B.forEach((lb, i) => { const s = sim(la.designation, lb.designation); if (s > bs) { bs = s; best = i; } });
    if (best < 0 || bs < 0.5) { journal.push(`ligne « ${la.designation.slice(0, 50)} » : lue une seule fois (gardée : elle est dans le devis).`); out.push(la); continue; }
    const lb = B.splice(best, 1)[0], fb = [...(lb.fournitures ?? [])], fs2 = [];
    for (const fa of la.fournitures ?? []) {
      let j = fb.findIndex((x) => (x.ouvrage || "") === (fa.ouvrage || "") && (x.emplacement || "") === (fa.emplacement || "") && (fa.ouvrage || sim(x.nom, fa.nom) >= 0.5));
      if (j < 0) j = fb.findIndex((x) => sim(x.nom, fa.nom) >= 0.6);
      if (j < 0) { // un article lu une seule fois : gardé tel qu'écrit s'il est bien dans le devis, sans calcul
        if (prouve(fa.nom, texte ?? la.designation)) { fs2.push({ ...fa, ouvrage: "", emplacement: "", donnees: [] }); journal.push(`ligne ${la.ref} : « ${fa.nom} » lu une seule fois, gardé tel qu'écrit.`); } else journal.push(`ligne ${la.ref} : « ${fa.nom} » lu une seule fois et absent du texte, retiré.`);
        continue;
      }
      const x = fb.splice(j, 1)[0], f = { ...fa };
      if ((x.ouvrage || "") !== (fa.ouvrage || "") || (x.emplacement || "") !== (fa.emplacement || "")) { f.ouvrage = ""; f.emplacement = ""; f.donnees = []; journal.push(`ligne ${la.ref} : « ${fa.nom} » rangé différemment (${fa.ouvrage}/${fa.emplacement} contre ${x.ouvrage}/${x.emplacement}), gardé tel qu'écrit.`); }
      if (norm(x.quantite) !== norm(fa.quantite) || norm(x.unite).replace("m2", "m²") !== norm(fa.unite).replace("m2", "m²")) { if (norm(x.quantite) !== norm(fa.quantite)) { f.quantite = ""; f.unite = ""; f.a_preciser = [...(f.a_preciser ?? []), "quantité"]; journal.push(`ligne ${la.ref} : « ${fa.nom} » deux quantités (${fa.quantite} contre ${x.quantite}), à demander.`); } }
      const db = new Map((x.donnees ?? []).map((v) => [v.cle, norm(v.valeur)]));
      f.donnees = (f.donnees ?? []).filter((v) => { const ok = db.get(v.cle) === norm(v.valeur); if (!ok) journal.push(`ligne ${la.ref} : donnée ${v.cle} divergente (${v.valeur} contre ${db.get(v.cle) ?? "rien"}), retirée : le code la demandera.`); return ok; });
      fs2.push(f);
    }
    for (const x of fb) { if (prouve(x.nom, texte ?? la.designation)) { fs2.push({ ...x, ouvrage: "", emplacement: "", donnees: [] }); journal.push(`ligne ${la.ref} : « ${x.nom} » lu une seule fois, gardé tel qu'écrit.`); } }
    out.push({ ...la, role: la.role === lb.role ? la.role : (fs2.length ? "fourniture" : la.role), fournitures: fs2 });
  }
  for (const lb of B) { journal.push(`ligne « ${String(lb.designation).slice(0, 50)} » : lue une seule fois (gardée).`); out.push(lb); }
  return { lignes: out, journal };
}

/** Méthode 11 : les garde-fous du code sur une lecture seule. Rien n'est ajouté : ce qui ne tient pas est retiré, et le code le demandera. */
function garder(lignes, texte, journal) {
  const N = texte ? nombres(texte) : null;
  return lignes.map((l) => ({ ...l, fournitures: (l.fournitures ?? []).map((f0) => {
    const f = { ...f0 }, w = f.ouvrage ? W(f.ouvrage) : null;
    if (f.ouvrage && !w) { journal.push(`ligne ${l.ref} : ouvrage « ${f.ouvrage} » inconnu de la fiche, article gardé tel qu'écrit.`); f.ouvrage = ""; f.emplacement = ""; f.donnees = []; }
    if (w && f.emplacement && !w.slots.some((s) => s.key === f.emplacement)) { journal.push(`ligne ${l.ref} : emplacement « ${f.emplacement} » inconnu de « ${f.ouvrage} », article gardé tel qu'écrit.`); f.ouvrage = ""; f.emplacement = ""; f.donnees = []; }
    if (N && [...nombres(f.quantite)].some((n) => !N.has(n))) { journal.push(`ligne ${l.ref} : quantité ${f.quantite} de « ${f.nom} » absente du devis, retirée (à demander).`); f.quantite = ""; f.unite = ""; f.a_preciser = [...(f.a_preciser ?? []), "quantité"]; }
    f.donnees = (f.donnees ?? []).filter((x) => {
      const p = W(f.ouvrage)?.params.find((p) => p.key === x.cle);
      if (f.ouvrage && !p) { journal.push(`ligne ${l.ref} : donnée « ${x.cle} » inconnue de « ${f.ouvrage} », retirée.`); return false; }
      const choix = p?.choices?.some((ch) => ch.value === String(x.valeur).trim());
      if (N && [...nombres(x.valeur)].some((n) => !N.has(n) && !(choix && parseFloat(n) < 10))) { journal.push(`ligne ${l.ref} : donnée ${x.cle} = ${x.valeur} absente du devis, retirée (le code la demandera).`); return false; }
      return true;
    });
    return f;
  }) }));
}

/** Assemble la lecture d'un essai (format de l'appli) ; null tant qu'il manque une étape. */
function assembler(m, c, e) {
  const R = dossier(m, c, e), a = lire(`${R}/a.json`), b = lire(`${R}/b.json`), texte = texteDe(c, e), journal = [];
  if (etapes(m, c, e).length || !a) return null;
  let L;
  switch (m) {
    case "M0": L = a; break;
    case "M4": case "S4": case "S4b": case "H4": L = lecture(a.lignes ?? []); break;
    case "M11": L = lecture(garder(a.lignes ?? [], spec(c).support === "photo" ? null : texte, journal)); break;
    // Méthode 12 : la 11, et le NOM d'un article rangé dans la fiche est écrit par le code (le nom de la fiche), jamais par l'IA.
    case "M12": L = lecture(garder(a.lignes ?? [], spec(c).support === "photo" ? null : texte, journal).map((l) => ({ ...l, fournitures: l.fournitures.map((f) => { const sl = W(f.ouvrage)?.slots.find((x) => x.key === f.emplacement); return sl ? { ...f, nom: sl.label, precision: "", a_preciser: [] } : f; }) }))); break;
    case "M1": if (!b) return null; L = { ...a, lignes: corriger(a.lignes ?? [], b) }; journal.push(`relecture : ${b.lignes_corrigees?.length ?? 0} corrigée(s), ${b.lignes_ajoutees?.length ?? 0} ajoutée(s), ${b.lignes_retirees?.length ?? 0} retirée(s)`); break;
    case "M5": L = lecture(b ? corriger(a.lignes ?? [], b) : a.lignes ?? []); journal.push(`alertes du code : ${(lire(`${R}/alertes.json`) ?? []).length}`); break;
    case "M9": if (!b) return null; L = lecture(corriger(lectureDuCode(a).lignes, b)); journal.push(`relecture : ${b.lignes_corrigees?.length ?? 0} corrigée(s), ${b.lignes_ajoutees?.length ?? 0} ajoutée(s), ${b.lignes_retirees?.length ?? 0} retirée(s)`); break;
    case "M8": L = lectureDuCode(a).brute; break;
    case "M6": { if (!b) return null; const f = fusion(a, b, texte); journal.push(...f.journal); L = lecture(f.lignes); break; }
    case "M10": {
      if (!texte) return null;
      L = lecture((a.lignes ?? []).map((l) => ({ ...l, fournitures: (l.fournitures ?? []).filter((f) => { const ok = prouve(f.preuve, texte); if (!ok) journal.push(`ligne ${l.ref} : « ${f.nom} » sans preuve dans le devis (« ${f.preuve ?? ""} »), retiré.`); return ok; }).map((f) => ({ ...f, donnees: (f.donnees ?? []).filter((x) => { const ok = prouve(x.preuve, texte); if (!ok) journal.push(`ligne ${l.ref} : donnée ${x.cle} = ${x.valeur} sans preuve (« ${x.preuve ?? ""} »), retirée.`); return ok; }) })) })));
      break;
    }
    case "M3": {
      const tri = a.lignes ?? [], parRef = new Map();
      for (const g of ["toiture", "evacuation", "raccords"]) for (const l of lire(`${R}/b-${g}.json`)?.lignes ?? []) if (!parRef.has(String(l.ref))) parRef.set(String(l.ref), l);
      L = lecture(tri.map((t) => parRef.get(String(t.ref)) ?? { ref: t.ref, designation: t.designation, quantite: t.quantite, unite: t.unite, role: "hors_quantitatif", fournitures: [] }));
      break;
    }
    case "M2": {
      if (!texte) return null;
      const M = new Map(etiqueter(texte).mesures.map((x) => [x.id, x])), mes = (id) => M.get(String(id ?? "").replace(/[\[\]\s]/g, ""));
      L = lecture((a.lignes ?? []).map((l) => { const q = mes(l.mesure); return { ref: l.ref, designation: l.designation, quantite: q?.valeur ?? "", unite: q?.unite ?? "", role: l.role, fournitures: (l.fournitures ?? []).map((f) => { const fq = mes(f.mesure); return { ...f, quantite: fq?.valeur ?? "", unite: fq?.unite ?? "", donnees: (f.donnees ?? []).map((x) => { const t = mes(x.etiquette); if (t) return { cle: x.cle, valeur: `${t.valeur}${t.unite ? ` ${t.unite}` : ""}` }; if (x.choix && prouve(x.mots, texte)) return { cle: x.cle, valeur: String(x.choix) }; journal.push(`ligne ${l.ref} : donnée ${x.cle} sans étiquette ni mots prouvés, retirée.`); return null; }).filter(Boolean) }; }) }; }));
      break;
    }
    case "M7": {
      if (!texte) return null;
      const lignes = []; let n = 0;
      for (const o of a.ouvrages ?? []) {
        const w = W(o.ouvrage); if (!w) { journal.push(`ouvrage inconnu « ${o.ouvrage} », gardé tel qu'écrit.`); lignes.push({ ref: String(++n), designation: o.libelle, quantite: o.mesure?.quantite ?? "", unite: o.mesure?.unite ?? "", role: "fourniture", fournitures: [{ nom: o.libelle, quantite: o.mesure?.quantite ?? "", unite: o.mesure?.unite ?? "" }] }); continue; }
        const mesureOk = o.mesure?.quantite && prouve(`${o.mesure.quantite} ${o.mesure.mots ?? ""}`, texte);
        if (o.mesure?.quantite && !mesureOk) journal.push(`${o.ouvrage} : mesure ${o.mesure.quantite} sans preuve, retirée.`);
        const donnees = (o.donnees ?? []).filter((x) => { const ok = w.params.some((p) => p.key === x.cle) && prouve(x.mots, texte); if (!ok) journal.push(`${o.ouvrage} : donnée ${x.cle} = ${x.valeur} sans preuve ou hors fiche, retirée.`); return ok; }).map((x) => ({ cle: x.cle, valeur: x.valeur }));
        const arts = (o.articles ?? []).filter((x) => { const ok = w.slots.some((s) => s.key === x.emplacement) && prouve(x.mots, texte); if (!ok) journal.push(`${o.ouvrage} : article ${x.emplacement} sans preuve ou hors fiche, retiré.`); return ok; });
        const principal = w.slots[0].key, q = mesureOk ? String(o.mesure.quantite) : "", u = mesureOk ? o.mesure.unite ?? "" : "";
        const fournitures = [];
        const p = arts.find((x) => x.emplacement === principal);
        fournitures.push({ nom: p?.nom ?? w.slots[0].label, quantite: p?.quantite || q, unite: p?.quantite ? p.unite : u, ouvrage: w.id, emplacement: principal, donnees });
        for (const x of arts) if (x.emplacement !== principal) fournitures.push({ nom: x.nom, quantite: x.quantite ?? "", unite: x.unite ?? "", ouvrage: w.id, emplacement: x.emplacement, donnees: [] });
        // « fourniture » : c'est le formulaire de l'IA, vérifié, qui range ; le code de l'appli ne le refait pas.
        lignes.push({ ref: String(++n), designation: o.libelle, quantite: q, unite: u, role: "fourniture", fournitures });
      }
      for (const h of a.hors_fiche ?? []) { if (!prouve(`${h.mots ?? h.nom}`, texte)) { journal.push(`hors fiche « ${h.nom} » sans preuve, retiré.`); continue; } lignes.push({ ref: String(++n), designation: h.nom, quantite: h.quantite ?? "", unite: h.unite ?? "", role: "fourniture", fournitures: [{ nom: h.nom, quantite: h.quantite ?? "", unite: h.unite ?? "", precision: h.precision ?? "" }] }); }
      for (const s of a.sans_fourniture ?? []) lignes.push({ ref: String(++n), designation: String(s), quantite: "", unite: "", role: "hors_quantitatif", fournitures: [] });
      L = lecture(lignes);
      break;
    }
  }
  ecrire(`${R}/lecture.json`, L); ecrire(`${R}/journal.json`, journal);
  return L;
}

// ---------- ligne de commande ----------
export function essais(liste) { const [ms, cs, es] = liste.split(":"); const out = []; for (const m of ms.split(",")) for (const c of cs.split(",")) for (const e of (es ?? "1").split(",")) out.push([m, c, +e]); return out; }
if (process.argv[1].endsWith("banc.mjs")) {
  const [cmd, ...listes] = process.argv.slice(2);
  const tous = listes.flatMap(essais);
  if (cmd === "travaux") {
    const T = tous.flatMap(([m, c, e]) => etapes(m, c, e));
    for (const j of T) ecrire(`travaux/${j.id}.md`, consigne(j));
    console.log(T.map((j) => `${j.id}|${j.modele}|${j.effort}`).join("\n"));
  } else if (cmd === "assembler") {
    let ok = 0, non = [];
    for (const [m, c, e] of tous) { try { if (assembler(m, c, e)) ok++; else non.push(`${m}-${c}-e${e}`); } catch (err) { non.push(`${m}-${c}-e${e} (${err.message})`); } }
    console.log(`assemblés : ${ok} ; en attente : ${non.join(", ") || "aucun"}`);
  }
}
