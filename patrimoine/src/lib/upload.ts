// Envoi d'un fichier (PDF, JPEG, PNG) par morceaux vers /api/files.

export const ACCEPTED_FILES = "application/pdf,image/jpeg,image/png";

export async function uploadFile(file: File, onProgress?: (pct: number) => void): Promise<string> {
  const mime = file.type || "application/pdf";
  const init = await fetch("/api/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, mime }),
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
