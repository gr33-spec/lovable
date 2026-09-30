"use client";

import { Mail, Pencil, Phone, Plus, Truck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { SupplierForm } from "@/components/supplier-form";
import { Badge, Button, Card, EmptyState, ErrorNotice, PageTitle, Spinner } from "@/components/ui";
import { api, ApiError, type Supplier } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/** Carnet de fournisseurs : une fiche par société, l'e-mail sert aux demandes de prix. */
export default function FournisseursPage() {
  return (
    <Suspense>
      <Suppliers />
    </Suspense>
  );
}

function Suppliers() {
  // « + » → « Nouveau fournisseur » arrive ici avec ?nouveau.
  const wantsNew = useSearchParams().has("nouveau");
  const fetchSuppliers = useCallback((signal: AbortSignal) => api<{ items: Supplier[] }>("/v1/suppliers?archived=include", { signal }), []);
  const { data, setData, error, reload } = useResource(fetchSuppliers);
  const [creating, setCreating] = useState(wantsNew);
  const [seenWantsNew, setSeenWantsNew] = useState(wantsNew);
  if (wantsNew !== seenWantsNew) {
    setSeenWantsNew(wantsNew);
    if (wantsNew) setCreating(true);
  }
  const [editingId, setEditingId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;

  const items = data.items;
  const saved = (s: Supplier) => {
    const exists = items.some((x) => x.id === s.id);
    const next = exists ? items.map((x) => (x.id === s.id ? s : x)) : [...items, s];
    setData({ items: next.sort((a, b) => a.name.localeCompare(b.name, "fr")) });
  };
  const needle = normalize(q);
  const shown = items
    .filter((s) => !needle || normalize([s.name, s.contactName, s.email, s.notes].join(" ")).includes(needle))
    .sort((a, b) => Number(a.archived) - Number(b.archived));

  return (
    <>
      <PageTitle>Fournisseurs</PageTitle>

      {creating ? (
        <Card className="flex flex-col gap-3 p-4">
          <h2 className="font-display text-xl font-extrabold">Nouveau fournisseur</h2>
          <SupplierForm
            submitLabel="Ajouter"
            onDone={(s) => {
              if (s) saved(s);
              setCreating(false);
            }}
          />
        </Card>
      ) : (
        <Button onClick={() => setCreating(true)}>
          <Plus size={20} aria-hidden="true" />
          Nouveau fournisseur
        </Button>
      )}

      {items.length === 0 && !creating ? (
        <EmptyState icon={<Truck size={40} />} title="Aucun fournisseur">
          <p className="max-w-xs text-[15px] text-muted">
            Ajoutez vos fournisseurs habituels avec leur e-mail : vous les choisirez ensuite depuis un chantier pour leur demander leurs
            prix.
          </p>
        </EmptyState>
      ) : null}

      {items.length > 5 ? (
        <input
          type="search"
          aria-label="Chercher un fournisseur"
          placeholder="Chercher un fournisseur"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-h-13 rounded-2xl bg-surface px-4 text-base shadow-card outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-ink"
        />
      ) : null}

      <ul className="flex flex-col gap-2.5">
        {shown.map((s) => (
          <li key={s.id}>
            {editingId === s.id ? (
              <Card className="flex flex-col gap-3 p-4">
                <SupplierForm
                  supplier={s}
                  onDone={(updated) => {
                    if (updated) saved(updated);
                    setEditingId(null);
                  }}
                />
                <ArchiveButton supplier={s} onChange={saved} />
              </Card>
            ) : (
              <SupplierCard supplier={s} onEdit={() => setEditingId(s.id)} />
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function SupplierCard({ supplier: s, onEdit }: { supplier: Supplier; onEdit: () => void }) {
  return (
    <Card className={`flex flex-col gap-1.5 p-4 ${s.archived ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-[17px] font-extrabold">{s.name}</span>
          {s.contactName ? <span className="text-sm text-muted">{s.contactName}</span> : null}
        </div>
        {s.archived ? <Badge>Archivé</Badge> : null}
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Modifier ${s.name}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ground"
        >
          <Pencil size={18} aria-hidden="true" />
        </button>
      </div>
      <a href={`mailto:${s.email}`} className="inline-flex min-h-9 items-center gap-2 self-start text-sm font-bold text-accent-text">
        <Mail size={16} aria-hidden="true" />
        {s.email}
      </a>
      {s.phone ? (
        <a href={`tel:${s.phone.replace(/\s+/g, "")}`} className="inline-flex min-h-9 items-center gap-2 self-start text-sm font-bold text-accent-text">
          <Phone size={16} aria-hidden="true" />
          {s.phone}
        </a>
      ) : null}
      {s.notes ? <p className="text-sm text-muted">{s.notes}</p> : null}
    </Card>
  );
}

function ArchiveButton({ supplier, onChange }: { supplier: Supplier; onChange: (s: Supplier) => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function toggle() {
    setPending(true);
    setError(null);
    try {
      onChange(await api<Supplier>(`/v1/suppliers/${supplier.id}`, { method: "PATCH", body: { archived: !supplier.archived } }));
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {error ? <ErrorNotice error={error} /> : null}
      <Button variant="ghost" pending={pending} onClick={() => void toggle()}>
        {supplier.archived ? "Réactiver ce fournisseur" : "Archiver (ne plus le proposer)"}
      </Button>
    </>
  );
}
