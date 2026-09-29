"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteShippingAction, saveShippingAction } from "@/app/admin/actions";
import { COUNTRY_NAMES, countryName, formatPrice } from "@/lib/format";
import { parseEuros } from "@/lib/validation";
import { useConfirm, useToast } from "./ui";

interface Method {
  id?: string;
  name: string;
  description: string;
  priceCents: number;
  freeOverCents: number | null;
  countries: string[];
  requiresAddress: boolean;
  deliveryEstimate: string;
  isActive: boolean;
}

const euros = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2).replace(".", ",").replace(/,00$/, ""));

function MethodForm({ initial, onDone }: { initial: Method; onDone: () => void }) {
  const [m, setM] = useState(initial);
  const [price, setPrice] = useState(euros(initial.priceCents));
  const [free, setFree] = useState(euros(initial.freeOverCents));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <form
      className="space-y-4 rounded-2xl bg-secondary/60 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const priceCents = price.trim() === "" ? 0 : parseEuros(price);
        const freeOverCents = free.trim() ? parseEuros(free) : null;
        if (priceCents === null) return setError("Prix invalide (exemple : 4,90).");
        if (free.trim() && !freeOverCents) return setError("Seuil de gratuité invalide.");
        start(async () => {
          const res = await saveShippingAction({ ...m, priceCents, freeOverCents });
          if (res.ok) {
            toast("Mode de livraison enregistré.");
            onDone();
            router.refresh();
          } else setError(Object.values(res.fieldErrors ?? {})[0] ?? res.error);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="field-label">Nom affiché</span>
          <input className="input" value={m.name} maxLength={80} required onChange={(e) => setM({ ...m, name: e.target.value })} placeholder="Ex. : Lettre suivie" />
        </label>
        <label className="block">
          <span className="field-label">Prix (€)</span>
          <input className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d,.]/g, ""))} placeholder="0 = gratuit" />
        </label>
        <label className="block">
          <span className="field-label">Offerte dès (€, facultatif)</span>
          <input className="input" inputMode="decimal" value={free} onChange={(e) => setFree(e.target.value.replace(/[^\d,.]/g, ""))} placeholder="Ex. : 50" />
        </label>
        <label className="block">
          <span className="field-label">Délai indicatif</span>
          <input className="input" value={m.deliveryEstimate} maxLength={80} onChange={(e) => setM({ ...m, deliveryEstimate: e.target.value })} placeholder="2 à 4 jours ouvrés" />
        </label>
        <label className="block">
          <span className="field-label">Précision (facultatif)</span>
          <input className="input" value={m.description} maxLength={300} onChange={(e) => setM({ ...m, description: e.target.value })} />
        </label>
      </div>
      <label className="flex items-center gap-3">
        <input type="checkbox" className="h-5 w-5 accent-[var(--c-primary)]" checked={!m.requiresAddress} onChange={(e) => setM({ ...m, requiresAddress: !e.target.checked })} />
        <span>Retrait en main propre (aucune adresse demandée)</span>
      </label>
      <fieldset>
        <legend className="field-label">Pays desservis</legend>
        <div className="flex flex-wrap gap-2">
          {Object.keys(COUNTRY_NAMES).map((c) => (
            <button
              key={c}
              type="button"
              className="chip !min-h-9"
              aria-pressed={m.countries.includes(c)}
              onClick={() => setM({ ...m, countries: m.countries.includes(c) ? m.countries.filter((x) => x !== c) : [...m.countries, c] })}
            >
              {countryName(c)}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-3">
        <input type="checkbox" className="h-5 w-5 accent-[var(--c-primary)]" checked={m.isActive} onChange={(e) => setM({ ...m, isActive: e.target.checked })} />
        <span>Proposé aux clientes (actif)</span>
      </label>
      {error && <p className="field-error">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          Enregistrer
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>
          Annuler
        </button>
      </div>
    </form>
  );
}

export function ShippingManager({ methods }: { methods: Method[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const blank: Method = { name: "", description: "", priceCents: 0, freeOverCents: null, countries: ["FR"], requiresAddress: true, deliveryEstimate: "", isActive: true };
  return (
    <div className="space-y-4">
      {!methods.some((m) => m.isActive) && <p className="rounded-2xl bg-warning-bg p-4 text-sm text-warning">Aucun mode de livraison actif : les clientes ne peuvent pas commander.</p>}
      <ul className="space-y-3">
        {methods.map((m) => (
          <li key={m.id} className="card p-4">
            {editing === m.id ? (
              <MethodForm initial={m} onDone={() => setEditing(null)} />
            ) : (
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {m.name} {!m.isActive && <span className="badge ml-1 bg-soldout-bg text-soldout">Inactif</span>}
                  </p>
                  <p className="text-sm text-text-2">
                    {m.priceCents ? formatPrice(m.priceCents) : "Gratuit"}
                    {m.freeOverCents ? ` · offert dès ${formatPrice(m.freeOverCents)}` : ""} · {m.requiresAddress ? "livraison" : "retrait"} · {m.countries.map(countryName).join(", ")}
                  </p>
                </div>
                <button type="button" className="btn btn-ghost btn-icon" aria-label={`Modifier ${m.name}`} onClick={() => setEditing(m.id!)}>
                  <Pencil size={17} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon text-error"
                  aria-label={`Supprimer ${m.name}`}
                  disabled={pending}
                  onClick={async () => {
                    if (await confirm({ title: `Supprimer « ${m.name} » ?`, message: "Les commandes passées gardent leurs informations de livraison.", confirmLabel: "Supprimer", danger: true }))
                      start(async () => {
                        await deleteShippingAction(m.id!);
                        toast("Supprimé.");
                        router.refresh();
                      });
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {editing === "new" ? (
        <MethodForm initial={blank} onDone={() => setEditing(null)} />
      ) : (
        <button type="button" className="btn btn-outline" onClick={() => setEditing("new")}>
          <Plus size={17} aria-hidden="true" /> Ajouter un mode de livraison
        </button>
      )}
      <p className="text-xs text-text-2">Un transporteur (Colissimo, Mondial Relay…) pourra être branché plus tard sans changer la commande : chaque mode dispose déjà d&apos;un emplacement prévu pour cela.</p>
    </div>
  );
}
