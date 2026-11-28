"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { loadDemoAction, removeDemoAction } from "@/app/admin/actions";
import { useConfirm, useToast } from "./ui";

/** Découvrir la boutique remplie avec des exemples, puis les retirer d'un clic. */
export function DemoCard({ mode }: { mode: "load" | "remove" }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  if (mode === "load") {
    return (
      <section className="card mb-6 flex flex-wrap items-center gap-4 p-5">
        <Sparkles className="text-accent" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm">
          <strong className="block text-base">Voir la boutique remplie</strong>
          Ajoute 4 créations d&apos;exemple (dont une épuisée) pour découvrir le rendu. Elles se retirent ensuite d&apos;un clic.
        </p>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await loadDemoAction();
              if (res.ok) {
                toast(`${res.count} créations d'exemple ajoutées.`);
                router.refresh();
              } else toast(res.error, "error");
            })
          }
        >
          {pending ? "Ajout en cours…" : "Ajouter les exemples"}
        </button>
      </section>
    );
  }
  return (
    <section className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-info-bg p-4 text-sm text-info">
      <p className="min-w-0 flex-1">Des créations d&apos;exemple sont visibles dans la boutique. Retirez-les avant l&apos;ouverture.</p>
      <button
        type="button"
        className="btn btn-sm bg-surface text-text"
        disabled={pending}
        onClick={async () => {
          if (await confirm({ title: "Retirer les créations d'exemple ?", message: "Vos propres créations ne sont pas touchées.", confirmLabel: "Retirer" }))
            start(async () => {
              const res = await removeDemoAction();
              if (res.ok) {
                toast("Exemples retirés.");
                router.refresh();
              } else toast(res.error, "error");
            });
        }}
      >
        Retirer les exemples
      </button>
    </section>
  );
}
