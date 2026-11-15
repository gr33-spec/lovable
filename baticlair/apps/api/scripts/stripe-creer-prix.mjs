// Crée (ou retrouve) chez Stripe les QUATRE PRIX de l'abonnement Mobiiz (Greg, 15 novembre 2026) :
//   - Pro : 29 € HT par mois (« mobiiz_pro_29_mois ») et 290 € HT par an (« mobiiz_pro_290_an ») ;
//   - Pro Max : 49 € HT par mois (« mobiiz_promax_49_mois ») et 490 € HT par an (« mobiiz_promax_490_an »).
// Des clés de recherche NEUVES : les anciens prix (Essentiel 19,90 €, Pro 39,90 €, mensuel 49 €, annuel 348 €) restent
// tels quels chez Stripe et ne sont plus lus par l'application.
// Puis affiche les quatre identifiants à mettre dans Vercel (STRIPE_PRIX_PRO, STRIPE_PRIX_PROMAX et leurs « _ANNUEL »).
// À NE LANCER QU'AVEC L'ACCORD DE GREG (rien n'est créé chez Stripe sans lui).
//
// Lancer : STRIPE_SECRET_KEY=sk_test_… node scripts/stripe-creer-prix.mjs
// La clé se lit dans l'environnement, jamais dans un fichier ni une conversation. Mode TEST seulement, sauf --reel.
// Relancé, il ne crée rien de plus : il retrouve les prix par leur clé de recherche. Aucune dépendance.

const cle = process.env.STRIPE_SECRET_KEY ?? "";
const reel = process.argv.includes("--reel");
if (!cle.startsWith("sk_test_") && !(reel && cle.startsWith("sk_live_"))) {
  console.error("Il faut STRIPE_SECRET_KEY en mode test (sk_test_…). Pour le mode réel : sk_live_… et --reel.");
  process.exit(1);
}

const PRIX = [
  { cle: "mobiiz_pro_29_mois", centimes: 2900, intervalle: "month", variable: "STRIPE_PRIX_PRO", nom: "Pro, 29 € HT par mois" },
  { cle: "mobiiz_promax_49_mois", centimes: 4900, intervalle: "month", variable: "STRIPE_PRIX_PROMAX", nom: "Pro Max, 49 € HT par mois" },
  { cle: "mobiiz_pro_290_an", centimes: 29000, intervalle: "year", variable: "STRIPE_PRIX_PRO_ANNUEL", nom: "Pro, 290 € HT par an" },
  { cle: "mobiiz_promax_490_an", centimes: 49000, intervalle: "year", variable: "STRIPE_PRIX_PROMAX_ANNUEL", nom: "Pro Max, 490 € HT par an" },
];

const formulaire = (p) =>
  Object.entries(p)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");

async function stripe(methode, chemin, params = {}) {
  const corps = formulaire(params);
  const res = await fetch(`https://api.stripe.com/v1/${chemin}${methode === "GET" && corps ? `?${corps}` : ""}`, {
    method: methode,
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/x-www-form-urlencoded" },
    ...(methode === "GET" ? {} : { body: corps }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe ${chemin} : ${res.status} ${json.error?.message ?? ""}`);
  return json;
}

const existants = await stripe("GET", "prices", { ...Object.fromEntries(PRIX.map((p, i) => [`lookup_keys[${i}]`, p.cle])), active: true });
let produit = existants.data[0]?.product ?? null;
if (!produit) produit = (await stripe("POST", "products", { name: "Abonnement Mobiiz", "metadata[app]": "mobiiz" })).id;

for (const p of PRIX) {
  let prix = existants.data.find((x) => x.lookup_key === p.cle);
  if (prix && (prix.unit_amount !== p.centimes || prix.recurring?.interval !== p.intervalle)) {
    console.error(`Le prix « ${p.cle} » existe avec un autre montant ou une autre période (${prix.unit_amount} / ${prix.recurring?.interval}) : rien n'est changé. Archive-le chez Stripe, puis relance.`);
    process.exit(1);
  }
  if (!prix) {
    prix = await stripe("POST", "prices", {
      product: produit,
      currency: "eur",
      unit_amount: p.centimes,
      "recurring[interval]": p.intervalle,
      tax_behavior: "exclusive",
      lookup_key: p.cle,
      nickname: p.nom,
    });
  }
  console.log(`${p.variable}=${prix.id}`);
}
console.log(`(produit ${produit}, mode ${cle.startsWith("sk_live_") ? "RÉEL" : "test"})`);
