import { redirect } from "next/navigation";

// Ancienne adresse : le pointage des loyers fait partie de l'onglet Gestion.
export default async function OldLoyers({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { mois } = await searchParams;
  redirect(typeof mois === "string" && /^\d{4}-\d{2}$/.test(mois) ? `/gestion?vue=loyers&mois=${mois}` : "/gestion?vue=loyers");
}
