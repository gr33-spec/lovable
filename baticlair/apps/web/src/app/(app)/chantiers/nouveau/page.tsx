"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Paywall, useBilling } from "@/components/paywall";
import { BackButton, Button, ErrorNotice, Field, PageTitle } from "@/components/ui";
import { api, ApiError, newActionKey, type Project } from "@/lib/api";
import { useDraft } from "@/lib/draft";
import { useSession } from "@/lib/session";
import { TRADES } from "@/lib/trades";

export default function NouveauChantierPage() {
  const router = useRouter();
  const { company } = useSession();
  const { values, setValues, clear } = useDraft("nouveau-chantier", { name: "", clientName: "", address: "", trade: "" });
  // Le métier du chantier : celui de l'entreprise par défaut ; changé d'un appui quand le devis est d'un autre métier.
  const companyTrade = company?.trades.find((t) => t !== "other") ?? "";
  const trade = values.trade || companyTrade;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  // Une clé par formulaire : double appui ou nouvelle tentative = un seul chantier.
  const key = useRef(newActionKey());
  const billing = useBilling();

  const fieldError = (path: string) =>
    error?.details?.some((d) => d.path === path) ? (path === "name" ? "Donnez un nom au chantier." : "Texte trop long.") : undefined;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const project = await api<Project>("/v1/projects", {
        method: "POST",
        body: { name: values.name, clientName: values.clientName || null, address: values.address || null, trade: trade || null },
        idempotencyKey: key.current,
      });
      clear();
      // replace : « Retour » depuis la fiche ramène à la liste, pas au formulaire.
      router.replace(`/chantiers/${project.id}`);
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError("internal_error", 500);
      // Limite de la formule atteinte : on montre les formules, sans perdre la saisie.
      if (err.code === "plan_limit_reached") billing.reload();
      else setError(err);
      setPending(false);
    }
  }

  if (billing.data?.limitReached) {
    return (
      <>
        <BackButton fallback="/chantiers" />
        <Paywall status={billing.data} onChange={billing.setData} />
      </>
    );
  }

  return (
    <>
      <BackButton fallback="/chantiers" />
      <PageTitle>Nouveau chantier</PageTitle>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && !error.details ? <ErrorNotice error={error} /> : null}
        <Field
          id="name"
          label="Nom du chantier"
          placeholder="ex. Toiture Dupont"
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          error={fieldError("name")}
          required
          autoFocus
        />
        <Field
          id="clientName"
          label="Client (facultatif)"
          placeholder="ex. M. Dupont"
          value={values.clientName}
          onChange={(e) => setValues({ ...values, clientName: e.target.value })}
          error={fieldError("clientName")}
          autoComplete="off"
        />
        <Field
          id="address"
          label="Adresse du chantier (facultatif)"
          placeholder="ex. 12 rue des Ardoisiers, Vannes"
          value={values.address}
          onChange={(e) => setValues({ ...values, address: e.target.value })}
          error={fieldError("address")}
          autoComplete="street-address"
        />
        <TradeChoice value={trade} onChange={(t) => setValues({ ...values, trade: t })} />
        <Button type="submit" pending={pending} className="mt-2">
          Créer le chantier
        </Button>
        <p className="text-center text-[13px] text-muted">Votre saisie est gardée si vous êtes interrompu.</p>
      </form>
    </>
  );
}

/** Métier du chantier : un appui (le devis ne le dit pas toujours). Les métiers de l'entreprise d'abord. */
function TradeChoice({ value, onChange }: { value: string; onChange: (trade: string) => void }) {
  const [all, setAll] = useState(false);
  const { company } = useSession();
  const mine = TRADES.filter((t) => t.id !== "other" && company?.trades.includes(t.id));
  const shown = all || mine.length === 0 ? TRADES.filter((t) => t.id !== "other") : [...mine, ...TRADES.filter((t) => t.id === value && !mine.includes(t))];
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-bold">Métier du chantier</legend>
      <div className="flex flex-wrap gap-2">
        {shown.map((t) => {
          const on = t.id === value;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(t.id)}
              className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold transition ${on ? "bg-ink text-white" : "bg-surface text-ink shadow-card"}`}
            >
              {t.label}
            </button>
          );
        })}
        {!all && mine.length > 0 ? (
          <button type="button" onClick={() => setAll(true)} className="inline-flex min-h-11 items-center px-2 text-sm font-bold text-accent-text">
            Autre métier…
          </button>
        ) : null}
      </div>
    </fieldset>
  );
}
