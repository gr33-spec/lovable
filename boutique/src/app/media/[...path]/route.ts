import { getFile, storageDriverName } from "@/lib/server/storage";

// Développement uniquement : sert les photos du stockage local.
// En production, les photos sont servies directement par le CDN de Supabase.
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (storageDriverName() !== "local") return new Response("Introuvable", { status: 404 });
  const { path } = await params;
  const key = path.join("/");
  if (!/^images\/[0-9a-f-]{36}\/(\d{2,4}\.webp|og\.jpg)$/.test(key)) return new Response("Introuvable", { status: 404 });
  const file = await getFile("public", key);
  if (!file) return new Response("Introuvable", { status: 404 });
  return new Response(new Uint8Array(file), {
    headers: { "Content-Type": key.endsWith(".jpg") ? "image/jpeg" : "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
