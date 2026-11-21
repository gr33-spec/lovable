/**
 * L'HORLOGE DES TESTS (Greg, 11 novembre 2026 : « tests comportant des dates figées […] dates relatives ou horloge
 * contrôlée »). Seule l'horloge de Node est touchée, jamais celle de PostgreSQL ; le temps continue de s'écouler.
 *
 * 1. `horlogeAu("2026-11-05T09:00:00.000Z")`, en tête d'un fichier de test : ce fichier croit commencer à cette date.
 *    Pour les tests écrits avec des dates en dur (une fenêtre de livraison « du 2 au 20 novembre 2026 ») : ils ne
 *    dépendent plus du jour ni de l'heure où on les lance.
 * 2. `TEST_DECALAGE_JOURS=30 npx vitest run` : tous les AUTRES tests croient être 30 jours plus tard (0.5 = 12 heures).
 *    Un test qui casse ainsi cassera à cette date : à lancer de temps en temps pour le savoir avant.
 * Sans l'un ni l'autre, rien n'est changé.
 */
const Reelle = Date;
const etat = ((globalThis as { __horlogeDesTests?: { decalage: number; posee: boolean } }).__horlogeDesTests ??= { decalage: 0, posee: false });

function poser() {
  if (etat.posee) return;
  etat.posee = true;
  globalThis.Date = new Proxy(Reelle, {
    construct: (cible, args: unknown[]) => (args.length === 0 ? new cible(cible.now() + etat.decalage) : Reflect.construct(cible, args)),
    apply: (cible) => new cible(cible.now() + etat.decalage).toString(),
    get: (cible, cle) => (cle === "now" ? () => cible.now() + etat.decalage : Reflect.get(cible, cle)),
  }) as DateConstructor;
}

/** Ce fichier de test commence à cette date, quels que soient le jour et l'heure réels. */
export function horlogeAu(iso: string) {
  etat.decalage = Reelle.parse(iso) - Reelle.now();
  poser();
}

const jours = Number(process.env.TEST_DECALAGE_JOURS ?? 0);
if (jours) {
  etat.decalage = jours * 86_400_000;
  poser();
}
