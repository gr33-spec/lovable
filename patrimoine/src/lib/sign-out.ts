/**
 * Déconnexion complète : session révoquée côté serveur, état de navigation
 * de l'onglet effacé, puis retour à l'écran de connexion sans pouvoir
 * revenir en arrière sur une page déjà affichée.
 */
export async function signOut(): Promise<void> {
  await fetch("/api/logout", { method: "POST" }).catch(() => undefined);
  try {
    sessionStorage.clear();
  } catch {
    /* stockage indisponible */
  }
  window.location.replace("/connexion");
}
