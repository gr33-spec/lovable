// Les consignes des trois rôles séparés : le couvreur, le contrôleur, le contrôleur du contrôleur.
//   node outils/roles.mjs couvreur            → un travail par chantier qui a des questions à poser
//   node outils/roles.mjs controle <C…>       → le contrôleur recalcule la liste de son côté
//   node outils/roles.mjs comparer <C…>       → le contrôleur compare sa liste à la référence, ligne par ligne
//   node outils/roles.mjs arbitrer <C…>       → le contrôleur du contrôleur tranche les désaccords
import fs from "node:fs";
const B = "/home/user/lovable/banc-quantitatif";
const FICHE = ".moteur/baticlair/referentiels/couverture/fiche-couverture.md";
const ecrire = (p, s) => { fs.mkdirSync(p.replace(/\/[^/]+$/, ""), { recursive: true }); fs.writeFileSync(p, s); };
const lire = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };
const devis = (c) => fs.readdirSync(`entrees/${c}`).sort().map((f) => `\`entrees/${c}/${f}\``).join(" et ");
const [cmd, ...cs] = process.argv.slice(2); const T = [];
const tete = (id, role) => `# Travail ${id}\n\nTu es un sous-agent d'un banc d'essai. Ton rôle, et le seul : ${role}. Dossier de travail : \`${B}\` (les chemins partent de là).\n`;
const regles = `\nRègles du banc : n'ouvre AUCUN autre fichier ni dossier que ceux nommés ici (surtout pas \`resultats/\`, ni les autres fichiers de \`chantiers/\`) ; ne cherche rien ailleurs. Quand le fichier est écrit, réponds seulement : fait.\n`;

if (cmd === "couvreur") {
  const n = Date.now().toString(36);
  for (const f of fs.existsSync("couvreur/a-poser") ? fs.readdirSync("couvreur/a-poser") : []) {
    const c = f.replace(".json", ""), id = `couvreur-${c}-${n}`;
    ecrire(`travaux/${id}.md`, `${tete(id, "LE COUVREUR qui a fait ce devis et connaît son chantier")}
1. Lis \`chantiers/${c}/verite.json\` : c'est TOUT ce que tu sais de ton chantier. Tu ne sais rien d'autre.
2. Lis \`couvreur/a-poser/${c}.json\` : les questions que l'application te pose (\`id\`, \`question\`, \`boutons\`, \`unite\`, \`aide\`).
3. Réponds à chacune comme un artisan sur son chantier : bref, sans phrase inutile, uniquement d'après ta fiche.
   - La question a des boutons et l'un dit ta réponse : donne ce bouton, mot pour mot (\`bouton\`).
   - Aucun bouton ne dit ta réponse, ou la question n'a pas de bouton : donne la vraie valeur (\`valeur\` : un nombre seul quand c'est une mesure, sinon quelques mots ; \`unite\` : l'unité de ta valeur).
   - Ta fiche ne le sait pas (absent de la fiche, ou rangé dans \`ne_sait_pas\`) : \`ne_sait_pas: true\`. Tu ne devines jamais, tu ne calcules pas à la place de l'application.
   - Tu réponds à la question posée, pas à une autre ; tu n'ajoutes aucune information qu'on ne te demande pas.
4. Écris dans \`couvreur/reponses-neuves/${c}.json\` un tableau JSON, une entrée par question, dans l'ordre : {"id" (recopié à l'identique), "bouton" ("" si aucun), "valeur" ("" si bouton ou ne sait pas), "unite", "ne_sait_pas" (true/false), "dit" (ce que tu dirais, 8 mots au plus)}.
${regles}`);
    T.push(`${id}|sonnet|medium`);
  }
}
if (cmd === "controle") for (const c of cs) {
  const id = `controle-${c}`;
  ecrire(`travaux/${id}.md`, `${tete(id, "LE CONTRÔLEUR : tu recalcules de ton côté la liste de matériaux à commander pour ce devis, sans voir le résultat d'aucune méthode")}
1. Lis le devis : ${devis(c)}.
2. Lis \`chantiers/${c}/verite.json\` : la fiche vérité du chantier (ce que le couvreur sait). Les données que le devis n'écrit pas, le couvreur les donnera à l'application telles qu'elles sont dans cette fiche ; ce qui est dans \`ne_sait_pas\`, il ne le sait pas.
3. Lis la fiche métier vérifiée \`${FICHE}\` (longue : lis les parties utiles à ce chantier, en cherchant par mots avec Grep puis en lisant autour ; lis en entier les parties des ouvrages du devis).
4. Calcule la liste à commander, À LA MAIN, d'après les règles, ratios, pertes et conditionnements de la fiche métier :
   - seulement les articles ÉCRITS au devis (un article que le devis n'écrit pas ne sort jamais, même s'il est nécessaire ; seule exception : un accessoire que la fiche dit indissociable d'une ligne écrite) ;
   - chaque article avec sa quantité à commander et son unité de commande (pièces, ml, rouleaux, bottes… selon la fiche), arrondie comme la fiche le dit ;
   - un article dont le calcul demande une donnée que le couvreur ne sait pas : pas de quantité, \`a_chiffrer: true\` ;
   - une ligne de main-d'œuvre seule ne donne rien.
5. Écris dans \`controle/${c}/liste-controleur.json\` un tableau JSON : {"article", "quantite" (nombre, ou null), "unite", "a_chiffrer" (true/false), "calcul" (ta règle et ton calcul en une ligne, avec le passage de la fiche utilisé), "ligne_devis"}.
   Si une règle de la fiche te paraît fausse, incomplète ou absente pour un article du devis, calcule quand même au mieux et dis-le dans "calcul" en commençant par « FICHE ? ».
${regles}`);
  T.push(`${id}|opus|high`);
}
const refListe = (c) => { const f = lire(`resultats/OR/${c}/e1/final.json`); return f ? [...f.final.liste.map((l) => ({ article: l.label, quantite: l.quantite, unite: l.unite, detail: l.precision })), ...f.final.aChiffrer.map((l) => ({ article: l.label, a_chiffrer: true, raison: l.raison }))] : null; };
if (cmd === "comparer") for (const c of cs) {
  const id = `comparer-${c}`; fs.mkdirSync(`controle/${c}`, { recursive: true }); fs.writeFileSync(`controle/${c}/liste-reference.json`, JSON.stringify({ liste: refListe(c), questions_posees_au_couvreur: lire(`resultats/OR/${c}/e1/final.json`).posees }, null, 1));
  ecrire(`travaux/${id}.md`, `${tete(id, "LE CONTRÔLEUR : tu compares, ligne par ligne, ta liste recalculée à la liste de référence")}
1. Lis ta liste : \`controle/${c}/liste-controleur.json\`, et la liste de référence (sortie du moteur de calcul) : \`controle/${c}/liste-reference.json\`.
2. Compare ligne par ligne : même article, même quantité, même unité. Deux libellés différents pour le même article du comptoir sont le même article. Une différence de conditionnement qui revient au même (16 ml = 4 longueurs de 4 m) est un accord.
3. Écris dans \`controle/${c}/comparaison.json\` : {"accords": [{"article", "quantite", "unite"}], "desaccords": [{"article", "controleur" (quantité et unité, ou "absent", ou "à chiffrer"), "reference" (idem), "ecart" (en une phrase : quantité, unité, article absent d'un côté…)}]}.
   Tu ne tranches pas : tu constates.
${regles}`);
  T.push(`${id}|sonnet|medium`);
}
if (cmd === "arbitrer") for (const c of cs) {
  const k = lire(`controle/${c}/comparaison.json`); if (!k?.desaccords?.length) continue;
  const id = `arbitrer-${c}`;
  ecrire(`travaux/${id}.md`, `${tete(id, "LE CONTRÔLEUR DU CONTRÔLEUR : deux calculs ne sont pas d'accord, tu retournes aux sources et tu tranches")}
1. Lis les désaccords : \`controle/${c}/comparaison.json\` (champ \`desaccords\`), la liste du contrôleur avec ses calculs \`controle/${c}/liste-controleur.json\`, et la liste de référence \`controle/${c}/liste-reference.json\` (sortie du moteur de calcul de l'application, avec les questions posées au couvreur et ses réponses).
2. Retourne aux sources : le devis ${devis(c)}, la fiche vérité \`chantiers/${c}/verite.json\`, la fiche métier \`${FICHE}\` (cherche par mots avec Grep, lis autour).
3. Pour chaque désaccord, refais le calcul toi-même et tranche. Écris dans \`controle/${c}/arbitrage.json\` un tableau : {"article", "bonne_valeur" (quantité et unité justes selon toi, ou "à chiffrer", ou "ne doit pas sortir"), "qui_a_raison" ("controleur", "reference", "aucun"), "cause" (une de : "erreur du contrôleur", "fiche métier fausse ou incomplète", "moteur de calcul ne suit pas la fiche", "lecture de référence fausse", "réponse du couvreur mal comprise", "simple différence de présentation"), "explication" (deux phrases au plus, avec le passage de la fiche ou du devis)}.
   Si c'est la fiche métier qui est fausse, incomplète ou contradictoire, dis-le clairement : c'est un défaut de la fiche à signaler.
${regles}`);
  T.push(`${id}|opus|high`);
}
console.log(T.join("\n"));

// Le contrôleur tranche les doutes de la comparaison par le code (deux libellés : même article ?) et les questions hors référence (l'information est-elle déjà au devis ?).
if (cmd === "juger") {
  const notes = lire("resultats/notes.json") ?? [], n = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/(\d),(\d)/g, "$1.$2").replace(/[^a-z0-9.]/g, " ").replace(/\.(?!\d)/g, " ").replace(/\s+/g, " ").trim();
  const par = {};
  for (const x of notes) { if (x.absent) continue; const p = (par[x.c] ??= { doutes: {}, questions: {} }); for (const d of x.detail.doutes) p.doutes[`${n(d.ref)} ¦ ${n(d.lue)}`] = { reference: d.ref, lue: d.lue }; for (const q of x.detail.horsRef) p.questions[`${q.key} ¦ ${q.text}`] = q.text; }
  for (const [c, p] of Object.entries(par)) {
    const dj = lire(`controle/${c}/doutes.json`) ?? {}, qj = lire(`controle/${c}/questions.json`) ?? {};
    const doutes = Object.entries(p.doutes).filter(([k]) => dj[k] === undefined).map(([id, v]) => ({ id, ...v })), questions = Object.entries(p.questions).filter(([k]) => qj[k] === undefined).map(([id, question]) => ({ id, question }));
    if (!doutes.length && !questions.length) continue;
    fs.mkdirSync(`controle/${c}`, { recursive: true }); fs.writeFileSync(`controle/${c}/a-juger.json`, JSON.stringify({ doutes, questions }, null, 1));
    const id = `juger-${c}-${Date.now().toString(36)}`;
    ecrire(`travaux/${id}.md`, `${tete(id, "LE CONTRÔLEUR : tu tranches des doutes de comparaison, sans savoir de quelle méthode ils viennent")}
1. Lis le devis : ${devis(c)}. Lis \`controle/${c}/a-juger.json\`.
2. \`doutes\` : pour chaque paire, « reference » est une ligne de la liste de référence, « lue » une ligne d'une liste à noter. Dis si c'est LE MÊME ARTICLE du comptoir issu de la même ligne du devis (même chose à commander, même si le libellé diffère ou si l'un est le nom calculé et l'autre la phrase du devis) : true ; sinon false.
3. \`questions\` : des questions posées au couvreur. Pour chacune, dis si l'information demandée est DÉJÀ ÉCRITE dans le devis (n'importe où : ligne, descriptif, note) : true = déjà écrite (question inutile) ; false = le devis ne le dit pas.
4. Écris dans \`controle/${c}/jugements.json\` : {"doutes": {"<id recopié à l'identique>": true|false, …}, "questions": {"<id recopié à l'identique>": true|false, …}}.
${regles}`);
    console.log(`${id}|sonnet|medium`);
  }
}
if (cmd === "ranger-jugements") for (const c of fs.readdirSync("controle")) {
  const j = lire(`controle/${c}/jugements.json`); if (!j) continue;
  fs.writeFileSync(`controle/${c}/doutes.json`, JSON.stringify({ ...(lire(`controle/${c}/doutes.json`) ?? {}), ...(j.doutes ?? {}) }, null, 1));
  fs.writeFileSync(`controle/${c}/questions.json`, JSON.stringify({ ...(lire(`controle/${c}/questions.json`) ?? {}), ...(j.questions ?? {}) }, null, 1));
  fs.rmSync(`controle/${c}/jugements.json`); fs.rmSync(`controle/${c}/a-juger.json`, { force: true });
}
