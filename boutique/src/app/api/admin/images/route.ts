import { uploadImage } from "@/lib/server/admin-catalog";
import { currentAdmin } from "@/lib/server/auth";
import { MAX_UPLOAD_BYTES } from "@/lib/server/images";
import { json, sameOrigin } from "@/lib/server/http";
import { hit } from "@/lib/server/rate-limit";

export const maxDuration = 30;

// Import d'une photo par la créatrice. Le fichier est entièrement décodé et
// réencodé côté serveur : seules de vraies images, redimensionnées et sans
// métadonnées, sont conservées. Aucun nom ni chemin fourni n'est utilisé.
export async function POST(request: Request) {
  const admin = await currentAdmin();
  if (!admin) return json({ error: "Session expirée : reconnectez-vous." }, 401);
  if (!sameOrigin(request)) return json({ error: "Origine refusée." }, 403);
  const limit = await hit(`upload:${admin.id}`, 120, 10 * 60);
  if (!limit.allowed) return json({ error: "Trop d'imports d'un coup : patientez quelques minutes." }, 429);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64_000) return json({ error: "Photo trop lourde (4 Mo maximum)." }, 413);
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Envoi invalide." }, 400);
  }
  const file = form.get("file");
  const kind = form.get("kind") === "brand" ? "brand" : "product";
  if (!(file instanceof File)) return json({ error: "Aucune photo reçue." }, 400);
  if (file.size > MAX_UPLOAD_BYTES) return json({ error: "Photo trop lourde (4 Mo maximum)." }, 413);
  try {
    const res = await uploadImage(Buffer.from(await file.arrayBuffer()), kind, admin.id);
    return res.ok ? json({ image: res.image }) : json({ error: res.error }, 422);
  } catch (err) {
    console.error("[upload]", err);
    return json({ error: "Erreur du serveur pendant l'enregistrement de la photo. Réessayez dans un instant." }, 500);
  }
}
