import { currentAdmin } from "@/lib/server/auth";
import { createBackup, exportCustomerData, exportOrdersCsv, exportProductsCsv, exportStockCsv } from "@/lib/server/backup";
import { json } from "@/lib/server/http";
import { audit } from "@/lib/server/monitoring";
import { emailSchema } from "@/lib/validation";

export const maxDuration = 60;

// Exports réservés à l'administration : la boutique n'est jamais prisonnière
// d'un prestataire (sauvegarde complète, tableurs, données d'une cliente).
export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const admin = await currentAdmin();
  if (!admin) return json({ error: "Non connecté" }, 401);
  const { kind } = await params;
  const date = new Date().toISOString().slice(0, 10);
  const file = (body: string, name: string, type: string) =>
    new Response(body, {
      headers: { "Content-Type": type, "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" },
    });
  await audit(admin.id, "export", "export", kind);
  switch (kind) {
    case "sauvegarde":
      return file(JSON.stringify(await createBackup()), `sauvegarde-boutique-${date}.json`, "application/json");
    case "produits":
      return file(await exportProductsCsv(), `produits-${date}.csv`, "text/csv; charset=utf-8");
    case "commandes": {
      const url = new URL(request.url);
      const valid = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
      return file(await exportOrdersCsv(valid(url.searchParams.get("du")), valid(url.searchParams.get("au"))), `ventes-${date}.csv`, "text/csv; charset=utf-8");
    }
    case "stock":
      return file(await exportStockCsv(), `mouvements-stock-${date}.csv`, "text/csv; charset=utf-8");
    case "cliente": {
      const email = emailSchema.safeParse(new URL(request.url).searchParams.get("email") ?? "");
      if (!email.success) return json({ error: "E-mail invalide" }, 400);
      return file(JSON.stringify(await exportCustomerData(email.data), null, 2), `donnees-cliente-${date}.json`, "application/json");
    }
    default:
      return json({ error: "Export inconnu" }, 404);
  }
}
