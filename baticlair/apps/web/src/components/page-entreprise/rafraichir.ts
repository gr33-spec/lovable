import { getActiveCompanyId } from "@/lib/api";

/** Régénère tout de suite la page publique de l'entreprise active (cache du site), après un changement. Jamais bloquant. */
export async function rafraichirPagePublique(): Promise<void> {
  const companyId = getActiveCompanyId();
  await fetch("/api/pages-entreprises/rafraichir", { method: "POST", headers: { "content-type": "application/json", ...(companyId ? { "x-company-id": companyId } : {}) }, body: "{}" }).catch(() => undefined);
}
