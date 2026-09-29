"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { resolveIncidentsAction } from "@/app/admin/actions";
import { formatRelative } from "@/lib/format";
import { Notice } from "./ui";

const SOURCE: Record<string, string> = {
  checkout: "Paiement",
  payment: "Paiement",
  webhook: "Confirmation Stripe",
  email: "E-mails",
  refund: "Remboursement",
  stock: "Stock",
  cron: "Tâches automatiques",
  upload: "Photos",
  maintenance: "Maintenance",
  confirmation: "Confirmation",
};

/** Incidents techniques, en langage simple : une panne ne passe jamais inaperçue. */
export function IncidentsCard({
  incidents,
  emailsFailed,
  paymentProblem,
}: {
  incidents: { id: string; level: string; source: string; message: string; created_at: string }[];
  emailsFailed: number;
  paymentProblem: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!incidents.length && !emailsFailed && !paymentProblem) return null;
  return (
    <div className="mb-6 space-y-3">
      {paymentProblem && (
        <Notice tone="danger">
          <strong>Les paiements sont bloqués.</strong> {paymentProblem}
        </Notice>
      )}
      {emailsFailed > 0 && (
        <Notice tone="warning">
          {emailsFailed} e-mail(s) n&apos;ont pas pu être envoyés. Ouvrez la commande concernée pour réessayer.
        </Notice>
      )}
      {incidents.length > 0 && (
        <Notice tone={incidents.some((i) => i.level === "error") ? "danger" : "warning"}>
          <p className="font-semibold">À vérifier</p>
          <ul className="mt-1 space-y-1">
            {incidents.map((i) => (
              <li key={i.id}>
                {SOURCE[i.source] ?? i.source} — {i.message} <span className="opacity-75">({formatRelative(i.created_at)})</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-3 font-semibold underline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await resolveIncidentsAction();
                router.refresh();
              })
            }
          >
            J&apos;ai vu, masquer
          </button>
        </Notice>
      )}
    </div>
  );
}
