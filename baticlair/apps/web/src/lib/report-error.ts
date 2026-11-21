/**
 * Un écran qui casse chez un artisan doit se savoir (audit avant commercialisation, 2026-10-11) : l'erreur part à l'API
 * (`POST /v1/client-errors`), qui prévient l'équipe. Jamais bloquant : un signalement qui échoue est ignoré.
 */
export function reportError(error: Error & { digest?: string }): void {
  try {
    void fetch("/v1/client-errors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify({ message: String(error?.message || error).slice(0, 2000), digest: error?.digest, path: window.location.pathname }),
    }).catch(() => undefined);
  } catch {
    // Rien : le signalement ne doit jamais casser l'écran de secours.
  }
}
