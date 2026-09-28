import { NextResponse } from "next/server";
import { getDemandesARelancer, relancerDemande } from "@/lib/demandes";

/**
 * Tâche planifiée : relance les fournisseurs n'ayant pas répondu à une
 * demande de devis (étape 7). À appeler ~1 fois par jour. Si CRON_SECRET est
 * configuré, l'appel doit fournir l'en-tête `Authorization: Bearer <secret>`.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const demandes = await getDemandesARelancer();
  await Promise.all(demandes.map(relancerDemande));

  return NextResponse.json({ relancees: demandes.length });
}
