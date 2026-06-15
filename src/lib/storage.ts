import "server-only";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "demandes";

interface AttachmentInput {
  filename: string;
  contentType: string;
  data: Buffer;
}

/**
 * Stocke une pièce jointe reçue par e-mail dans Supabase Storage et renvoie
 * son chemin. Sans SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY (dev sans infra de
 * stockage), renvoie simplement le nom du fichier.
 */
export async function storeAttachment(demandeId: string, attachment: AttachmentInput): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return attachment.filename;
  }

  const path = `${demandeId}/${Date.now()}-${attachment.filename}`;

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": attachment.contentType,
    },
    body: new Uint8Array(attachment.data),
  });

  if (!res.ok) {
    throw new Error(`Échec de l'upload Supabase : ${await res.text()}`);
  }

  return path;
}
