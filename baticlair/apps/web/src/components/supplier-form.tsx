"use client";

import { useId, useRef, useState } from "react";
import { Button, ErrorNotice, Field } from "@/components/ui";
import { api, ApiError, newActionKey, type Supplier } from "@/lib/api";
import { fr } from "@/lib/fr";

const FIELD_ERRORS: Record<string, string> = {
  name: "Indiquez le nom de la société.",
  email: "Cette adresse e-mail n'est pas valide.",
};

/**
 * Fiche fournisseur : seuls la société et l'e-mail sont obligatoires.
 * Sert au carnet de fournisseurs et à l'ajout rapide depuis un chantier.
 */
/** « Point.P  Vannes » et « point.p vannes » : même fournisseur probable. */
function sameName(a: string, b: string): boolean {
  const n = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return n(a).length > 0 && n(a) === n(b);
}

export function SupplierForm({
  supplier,
  onDone,
  submitLabel = fr.actions.save,
  others = [],
}: {
  supplier?: Supplier;
  onDone: (s: Supplier | null) => void;
  submitLabel?: string;
  /** Fournisseurs déjà connus : signale un doublon probable (même nom), sans bloquer. */
  others?: Supplier[];
}) {
  const id = useId();
  const [values, setValues] = useState({
    name: supplier?.name ?? "",
    email: supplier?.email ?? "",
    contactName: supplier?.contactName ?? "",
    phone: supplier?.phone ?? "",
    notes: supplier?.notes ?? "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  // Une clé par formulaire : double appui = un seul fournisseur.
  const key = useRef(newActionKey());

  const twin = others.find((o) => o.id !== supplier?.id && sameName(o.name, values.name));
  const fieldError = (path: string) => (error?.details?.some((d) => d.path === path) ? (FIELD_ERRORS[path] ?? "Texte trop long.") : undefined);
  const set = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues({ ...values, [field]: e.target.value });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const body = {
      name: values.name,
      email: values.email,
      contactName: values.contactName || null,
      phone: values.phone || null,
      notes: values.notes || null,
    };
    try {
      onDone(
        supplier
          ? await api<Supplier>(`/v1/suppliers/${supplier.id}`, { method: "PATCH", body })
          : await api<Supplier>("/v1/suppliers", { method: "POST", body, idempotencyKey: key.current }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {error && !error.details ? <ErrorNotice error={error} /> : null}
      <Field id={`${id}-name`} label="Société" placeholder="ex. Point.P Vannes" value={values.name} onChange={set("name")} error={fieldError("name")} autoFocus />
      {twin ? (
        <p role="status" className="-mt-2 text-sm font-semibold text-warn">
          Déjà dans votre carnet : {twin.name} ({twin.email}). Vérifiez que ce n&apos;est pas le même.
        </p>
      ) : null}
      <Field
        id={`${id}-email`}
        label="E-mail pour les demandes de prix"
        type="email"
        inputMode="email"
        autoComplete="off"
        placeholder="ex. devis@fournisseur.fr"
        value={values.email}
        onChange={set("email")}
        error={fieldError("email")}
      />
      <Field id={`${id}-contact`} label="Contact (facultatif)" placeholder="ex. Paul" value={values.contactName} onChange={set("contactName")} error={fieldError("contactName")} />
      <Field id={`${id}-phone`} label="Téléphone (facultatif)" type="tel" value={values.phone} onChange={set("phone")} error={fieldError("phone")} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-notes`} className="text-sm font-bold">
          Notes, spécialités (facultatif)
        </label>
        <textarea
          id={`${id}-notes`}
          rows={2}
          placeholder="ex. Tuiles, zinc, livraison le mardi"
          value={values.notes}
          onChange={set("notes")}
          className="rounded-2xl bg-surface p-4 text-base shadow-card outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-ink"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => onDone(null)} disabled={pending}>
          {fr.actions.cancel}
        </Button>
        <Button type="submit" pending={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
