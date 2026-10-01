"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Paywall, useBilling } from "@/components/paywall";
import { BackButton, Button, ErrorNotice, Field, PageTitle } from "@/components/ui";
import { api, ApiError, newActionKey, type Project } from "@/lib/api";
import { useDraft } from "@/lib/draft";

export default function NouveauChantierPage() {
  const router = useRouter();
  const { values, setValues, clear } = useDraft("nouveau-chantier", { name: "", clientName: "", address: "" });
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
        body: { name: values.name, clientName: values.clientName || null, address: values.address || null },
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
        <Button type="submit" pending={pending} className="mt-2">
          Créer le chantier
        </Button>
        <p className="text-center text-[13px] text-muted">Votre saisie est gardée si vous êtes interrompu.</p>
      </form>
    </>
  );
}
