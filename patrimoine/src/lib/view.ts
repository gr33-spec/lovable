// Vue affichée pour le propriétaire : application complète ou espace gestion
// locative (aperçu de ce que voit l'accès gestion). Simple préférence
// d'affichage : les droits restent ceux de la session.

export type View = "patrimoine" | "gestion";
export const VIEW_COOKIE = "patrimoine_vue";

/** Change de vue (propriétaire uniquement) puis ouvre l'accueil de cette vue. */
export function switchView(view: View) {
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${VIEW_COOKIE}=${view}; path=/; max-age=31536000; samesite=lax${secure}`;
  window.location.href = view === "gestion" ? "/gestion" : "/";
}
