import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { etiquettePage } from "@/lib/page-entreprise";

/**
 * RÉGÉNÉRER UNE PAGE PUBLIQUE TOUT DE SUITE (« tout changement s'applique immédiatement »). Le site ne décide rien seul :
 * il demande à l'API, AVEC LA SESSION de l'appelant, quelles adresses il a le droit de rafraîchir (les siennes ; pour
 * l'admin, la page qu'il vient de masquer), puis vide leur cache. Sans session valable : rien n'est fait.
 */
const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export async function POST(req: NextRequest) {
  const corps = (await req.json().catch(() => ({}))) as { admin?: unknown };
  const entetes: Record<string, string> = { accept: "application/json", cookie: req.headers.get("cookie") ?? "" };
  const entreprise = req.headers.get("x-company-id");
  if (entreprise) entetes["x-company-id"] = entreprise;
  const adresseAdmin = typeof corps.admin === "string" && /^[a-z0-9-]{3,60}$/.test(corps.admin) ? corps.admin : null;
  // L'admin : l'API ne rend les adresses qu'à un admin vérifié (sinon 403) ; l'artisan : les siennes seulement.
  const res = adresseAdmin
    ? await fetch(`${API_URL}/v1/admin/pages-publiques/${adresseAdmin}/adresses`, { headers: entetes, cache: "no-store" }).catch(() => null)
    : await fetch(`${API_URL}/v1/ma-page/adresses`, { headers: entetes, cache: "no-store" }).catch(() => null);
  if (!res?.ok) return NextResponse.json({ rafraichi: [] }, { status: res?.status === 401 || res?.status === 403 ? res.status : 200 });
  const { adresses } = (await res.json()) as { adresses?: string[] };
  const valables = (adresses ?? []).filter((a) => /^[a-z0-9-]{3,60}$/.test(a));
  for (const a of valables) revalidateTag(etiquettePage(a), { expire: 0 });
  return NextResponse.json({ rafraichi: valables });
}
