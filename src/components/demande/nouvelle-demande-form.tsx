"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import type { SupplierItem } from "@/lib/suppliers";

interface NouvelleDemandeFormProps {
  suppliers: SupplierItem[];
}

/** Formulaire d'envoi d'une demande de devis à plusieurs fournisseurs (étape 7). */
export function NouvelleDemandeForm({ suppliers }: NouvelleDemandeFormProps) {
  const router = useRouter();
  const [objet, setObjet] = useState("");
  const [produitsText, setProduitsText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [autresEmails, setAutresEmails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleSupplier(email: string) {
    setSelected((prev) => (prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]));
  }

  const canSubmit = objet.trim() !== "" && produitsText.trim() !== "" && !submitting;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const autres = autresEmails
      .split(/[\n,;]/)
      .map((email) => email.trim())
      .filter(Boolean);
    const emails = Array.from(new Set([...selected, ...autres]));

    if (emails.length === 0) {
      setError("Sélectionne au moins un fournisseur ou ajoute une adresse e-mail.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/demande", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objet, produitsText, emails }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Une erreur est survenue. Réessaie.");
        setSubmitting(false);
        return;
      }

      router.push(`/demande/${data.demandeId}`);
    } catch {
      setError("Connexion impossible. Vérifie ta connexion internet et réessaie.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="objet" className="font-sans text-sm font-semibold">
          Objet de la demande
        </label>
        <Input
          id="objet"
          value={objet}
          onChange={(e) => setObjet(e.target.value)}
          required
          placeholder="Ex : Carrelage salle de bain"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="produits" className="font-sans text-sm font-semibold">
          Produits ou prestations
        </label>
        <Textarea
          id="produits"
          value={produitsText}
          onChange={(e) => setProduitsText(e.target.value)}
          required
          rows={5}
          placeholder={"Ex :\n20 m² de carrelage 30x30\nColle à carrelage\nJoints"}
        />
      </div>

      {suppliers.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="font-sans text-sm font-semibold">Tes fournisseurs</p>
          <Card className="flex flex-col divide-y divide-line">
            {suppliers.map((supplier) => (
              <label key={supplier.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <input
                  type="checkbox"
                  checked={selected.includes(supplier.email)}
                  onChange={() => toggleSupplier(supplier.email)}
                  className="h-5 w-5 shrink-0 accent-accent"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-sans text-sm font-semibold">{supplier.nom}</span>
                  <span className="block truncate font-sans text-xs text-muted">{supplier.email}</span>
                </span>
              </label>
            ))}
          </Card>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="autres" className="font-sans text-sm font-semibold">
          Autres destinataires
        </label>
        <Textarea
          id="autres"
          value={autresEmails}
          onChange={(e) => setAutresEmails(e.target.value)}
          rows={2}
          placeholder="Une adresse e-mail par ligne"
        />
      </div>

      {error ? (
        <Card className="flex items-start gap-2 bg-red/10">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red" aria-hidden="true" />
          <p className="font-sans text-sm">{error}</p>
        </Card>
      ) : null}

      <Button type="submit" fullWidth disabled={!canSubmit}>
        Envoyer la demande
      </Button>
    </form>
  );
}
