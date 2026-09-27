import { loadDocument } from "@/lib/server/db";
import { guardApi } from "@/lib/server/guard";
import { buildWorkbook } from "@/lib/server/excel";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  const doc = await loadDocument();
  const file = await buildWorkbook(doc.data);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="patrimoine-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
