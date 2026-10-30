/**
 * « BESOIN D'UN COUP DE MAIN ? » (Greg, 30 octobre 2026, « évolution stratégique », point 10) : avant de déposer un devis
 * ou une photo, l'artisan sait que la lecture est une aide, pas une garantie, et qu'il vérifie sa liste. Ses mots, mot
 * pour mot. Un encadré, jamais une fenêtre de plus à fermer : le parcours ne change pas.
 */
export function CoupDeMainIa() {
  return (
    <section aria-labelledby="coup-de-main-ia" className="rounded-2xl border border-line bg-surface p-4 text-[15px] leading-relaxed">
      <h2 id="coup-de-main-ia" className="text-[17px] font-extrabold">
        Besoin d&apos;un coup de main ?
      </h2>
      <p className="mt-1 text-muted">
        L&apos;IA peut t&apos;aider à extraire les matériaux de ton devis, mais le résultat dépend de la qualité et de la précision du document. Certaines informations peuvent être manquantes ou
        incorrectes. Pense à toujours vérifier et corriger ta liste avant de l&apos;utiliser.
      </p>
    </section>
  );
}
