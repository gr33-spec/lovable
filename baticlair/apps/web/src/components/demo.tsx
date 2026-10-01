"use client";

import { FlaskConical, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorNotice } from "@/components/ui";
import { api, ApiError, type PriceRequest } from "@/lib/api";

/**
 * Mode démo : tester tout le parcours seul, avec un chantier et des
 * fournisseurs fictifs. Les fournisseurs fictifs se reconnaissent à leur adresse.
 */
export const DEMO_EMAIL_DOMAIN = "demo.baticlair.fr";

export function isDemoSupplier(email: string): boolean {
  return email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);
}

const asError = (e: unknown) => (e instanceof ApiError ? e : new ApiError("internal_error", 500));

/** Accueil : crée un chantier fictif (devis client compris) et ouvre sa fiche. */
export function DemoCard() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const { projectId } = await api<{ projectId: string }>("/v1/demo/project", { method: "POST" });
      router.push(`/chantiers/${projectId}`);
    } catch (e) {
      setError(asError(e));
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="demo-title" className="flex flex-col gap-2.5 rounded-3xl border border-dashed border-line bg-surface p-4">
      <h2 id="demo-title" className="flex items-center gap-2 text-[17px] font-extrabold">
        <FlaskConical size={18} aria-hidden="true" />
        Essayer avec un chantier fictif
      </h2>
      <p className="text-sm text-muted">
        Un devis client de toiture et 3 fournisseurs fictifs qui répondent tout seuls : faites tout le parcours, jusqu&apos;à la comparaison. Chaque
        lecture par l&apos;IA compte comme une analyse.
      </p>
      {error ? <ErrorNotice error={error} /> : null}
      <Button variant="secondary" pending={pending} onClick={() => void start()}>
        {pending ? "Préparation du chantier…" : "Créer un chantier de démonstration"}
      </Button>
    </section>
  );
}

/**
 * Fiche chantier : le fournisseur « répond » (test) et son devis PDF est rangé.
 * Gros bouton pour un fournisseur fictif ; simple lien pour un vrai fournisseur.
 */
export function DemoAnswer({ recipientId, discreet = false, onChange }: { recipientId: string; discreet?: boolean; onChange: (r: PriceRequest) => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function answer() {
    setPending(true);
    setError(null);
    try {
      onChange(await api<PriceRequest>(`/v1/demo/recipients/${recipientId}/quote`, { method: "POST" }));
    } catch (e) {
      setError(asError(e));
      setPending(false);
    }
  }

  if (discreet) {
    return (
      <div className="flex flex-col gap-1">
        {error ? <ErrorNotice error={error} /> : null}
        <button
          type="button"
          disabled={pending}
          onClick={() => void answer()}
          className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-bold text-muted disabled:opacity-60"
        >
          <FlaskConical size={16} aria-hidden="true" />
          {pending ? "Création du devis fictif…" : "Test : simuler un devis fictif"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <ErrorNotice error={error} /> : null}
      <Button variant="secondary" pending={pending} onClick={() => void answer()}>
        <Sparkles size={18} aria-hidden="true" />
        {pending ? "Le fournisseur prépare son devis…" : "Simuler sa réponse (démo)"}
      </Button>
    </div>
  );
}
