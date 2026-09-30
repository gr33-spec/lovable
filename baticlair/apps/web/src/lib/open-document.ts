import { getActiveCompanyId } from "./api";

/** Ouvre le PDF d'origine dans un nouvel onglet (téléchargé avec la session et l'entreprise active). */
export async function openDocument(documentId: string): Promise<void> {
  const win = window.open("", "_blank");
  try {
    const headers: Record<string, string> = {};
    const companyId = getActiveCompanyId();
    if (companyId) headers["x-company-id"] = companyId;
    const res = await fetch(`/v1/documents/${encodeURIComponent(documentId)}/file`, { headers, credentials: "same-origin" });
    if (!res.ok) throw new Error(String(res.status));
    const url = URL.createObjectURL(await res.blob());
    if (win) win.location.href = url;
    else window.location.href = url;
  } catch {
    win?.close();
  }
}
