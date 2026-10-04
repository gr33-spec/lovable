import { api } from "@/lib/api";

/**
 * Une requête vers l'API ne dépasse pas 4,5 Mo chez l'hébergeur : au-delà de ce seuil, le fichier part d'abord en
 * morceaux (`PUT /v1/uploads/:id/parts/:n`), puis la requête de dépôt habituelle nomme l'envoi au lieu de le joindre.
 */
const PART_BYTES = 3_000_000;

/** Ajoute le fichier au formulaire de dépôt : joint tel quel s'il est petit, sinon envoyé avant, morceau par morceau. */
export async function attachFile(form: FormData, file: File): Promise<void> {
  if (file.size <= PART_BYTES) {
    form.append("file", file, file.name);
    return;
  }
  const uploadId = crypto.randomUUID();
  const parts = Math.ceil(file.size / PART_BYTES);
  for (let i = 0; i < parts; i++) {
    const part = new FormData();
    part.append("file", file.slice(i * PART_BYTES, (i + 1) * PART_BYTES), "morceau");
    await api<null>(`/v1/uploads/${uploadId}/parts/${i}`, { method: "PUT", body: part });
  }
  form.append("uploadId", uploadId);
  form.append("parts", String(parts));
  form.append("fileName", file.name);
}
