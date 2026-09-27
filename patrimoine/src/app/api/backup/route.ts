import { NextResponse } from "next/server";
import { loadDocument } from "@/lib/server/db";
import { guardApi } from "@/lib/server/guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await guardApi(request);
  if (denied) return denied;
  const doc = await loadDocument();
  const date = new Date().toISOString().slice(0, 10);
  const body = JSON.stringify({ app: "patrimoine", exportedAt: new Date().toISOString(), data: doc.data }, null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="patrimoine-sauvegarde-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
