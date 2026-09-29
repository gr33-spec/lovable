// Envoi d'un fichier (PDF, JPEG, PNG) par morceaux vers /api/files.

export const ACCEPTED_FILES = "application/pdf,image/jpeg,image/png";

/** Empreinte SHA-256 du contenu (hexadécimal), pour reconnaître un fichier déjà déposé. */
export async function fileSha256(file: Blob): Promise<string | undefined> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return undefined; // contexte non sécurisé : pas d'empreinte, l'envoi continue
  }
}

/** Fichiers déjà stockés avec ce contenu. */
export async function findStoredCopies(sha256: string): Promise<{ id: string; name: string }[]> {
  const res = await fetch("/api/files/empreinte", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sha256 }) });
  if (!res.ok) return [];
  return ((await res.json()) as { files: { id: string; name: string }[] }).files;
}

export async function uploadFile(file: File, onProgress?: (pct: number) => void, sha256?: string): Promise<string> {
  const mime = file.type || "application/pdf";
  const hash = sha256 ?? (await fileSha256(file));
  const init = await fetch("/api/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, mime, sha256: hash }),
  });
  const meta = await init.json();
  if (!init.ok) throw new Error(meta.error ?? "Envoi impossible");
  const { id, chunkSize } = meta as { id: string; chunkSize: number };
  const count = Math.max(1, Math.ceil(file.size / chunkSize));
  for (let i = 0; i < count; i++) {
    const part = file.slice(i * chunkSize, Math.min(file.size, (i + 1) * chunkSize));
    const res = await fetch(`/api/files/${id}?i=${i}`, { method: "PUT", body: part });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Envoi interrompu");
    onProgress?.(Math.round(((i + 1) / count) * 100));
  }
  return id;
}
