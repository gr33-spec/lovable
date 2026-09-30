"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveSettingsAction } from "@/app/admin/actions";
import { RESERVATION_HOURS, RESERVATION_MODE } from "@/lib/sales-mode";
import { Notice, useToast, useUnsavedGuard } from "./ui";

interface Settings {
  contactEmail: string;
  notificationEmail: string;
  lowStockThreshold: number;
  ordersOpen: boolean;
  closedMessage: string;
  allowPromotionCodes: boolean;
  reservationAutoExpire: boolean;
  vatRegime: "franchise" | "assujetti" | null;
  vatRateBp: number;
  addressRetentionMonths: number | null;
  legal: { name: string; status: string; siret: string; registration: string; vatNumber: string; address: string; publisher: string; host: string; mediator: string };
}

const LEGAL_FIELDS: { key: keyof Settings["legal"]; label: string; hint?: string; multiline?: boolean }[] = [
  { key: "name", label: "Nom ou raison sociale", hint: "Tel qu'il figure sur votre avis de situation (INSEE)." },
  { key: "status", label: "Statut juridique", hint: "Ex. : entrepreneur individuel (micro-entreprise), EURL…" },
  { key: "siret", label: "Numéro SIRET" },
  { key: "registration", label: "Immatriculation (facultatif)", hint: "Ex. : RNE / Répertoire des métiers de… — selon votre situation." },
  { key: "vatNumber", label: "N° de TVA intracommunautaire (si vous en avez un)" },
  { key: "address", label: "Adresse de l'entreprise", multiline: true },
  { key: "publisher", label: "Directeur·rice de la publication", hint: "En général : vous-même." },
  { key: "host", label: "Hébergeur du site", hint: "Nom, adresse et téléphone de l'hébergeur (voir le guide de mise en ligne).", multiline: true },
  { key: "mediator", label: "Médiateur de la consommation", hint: "Nom et site internet du médiateur auquel vous adhérez.", multiline: true },
];

export function SettingsForm({ initial }: { initial: Settings }) {
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const dirty = useMemo(() => JSON.stringify(s) !== JSON.stringify(saved), [s, saved]);
  useUnsavedGuard(dirty);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((prev) => ({ ...prev, [k]: v }));
  const setLegal = (k: keyof Settings["legal"], v: string) => setS((prev) => ({ ...prev, legal: { ...prev.legal, [k]: v } }));

  const save = () =>
    start(async () => {
      setError(null);
      const res = await saveSettingsAction(s);
      if (res.ok) {
        setSaved(s);
        toast("Paramètres enregistrés.");
        router.refresh();
      } else setError(res.error);
    });

  return (
    <div className="space-y-12 pb-40 lg:pb-24">
      <section id="boutique" className="scroll-mt-6" aria-labelledby="titre-boutique">
        <h2 id="titre-boutique" className="mb-3 font-serif text-2xl">
          Boutique
        </h2>
        <div className="card space-y-5 p-5">
          <label className="flex items-start justify-between gap-4">
            <span>
              <span className="block font-semibold">{RESERVATION_MODE ? "Réservations ouvertes" : "Commandes ouvertes"}</span>
              <span className="text-sm text-text-2">
                Désactivez pendant des vacances ou un salon : les créations restent visibles mais ne peuvent pas être {RESERVATION_MODE ? "réservées" : "commandées"}.
              </span>
            </span>
            <input type="checkbox" className="mt-1 h-6 w-6 shrink-0 accent-[var(--c-primary)]" checked={s.ordersOpen} onChange={(e) => set("ordersOpen", e.target.checked)} />
          </label>
          {!s.ordersOpen && (
            <label className="block">
              <span className="field-label">Message affiché aux clientes</span>
              <input className="input" value={s.closedMessage} maxLength={300} onChange={(e) => set("closedMessage", e.target.value)} />
            </label>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">E-mail de contact (public)</span>
              <input className="input" type="email" value={s.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="contact@labohemeenpaillettes.fr" />
            </label>
            <label className="block">
              <span className="field-label">{RESERVATION_MODE ? "E-mail qui reçoit les nouvelles réservations" : "E-mail qui reçoit les nouvelles commandes"}</span>
              <input className="input" type="email" value={s.notificationEmail} onChange={(e) => set("notificationEmail", e.target.value)} />
            </label>
          </div>
          <label className="block max-w-xs">
            <span className="field-label">Alerte « stock faible » à partir de</span>
            <select className="input" value={s.lowStockThreshold} onChange={(e) => set("lowStockThreshold", Number(e.target.value))}>
              <option value={0}>Désactivée</option>
              {[1, 2, 3, 5, 10].map((n) => (
                <option key={n} value={n}>
                  {n} pièce{n > 1 ? "s" : ""} ou moins
                </option>
              ))}
            </select>
          </label>
          {RESERVATION_MODE ? (
            <label className="flex items-start justify-between gap-4">
              <span>
                <span className="block font-semibold">Libérer automatiquement après {RESERVATION_HOURS} h</span>
                <span className="text-sm text-text-2">
                  Une réservation que vous n&apos;avez pas confirmée dans les {RESERVATION_HOURS} h est annulée et le bijou redevient disponible. Décochez pour tout gérer vous-même.
                </span>
              </span>
              <input type="checkbox" className="mt-1 h-6 w-6 shrink-0 accent-[var(--c-primary)]" checked={s.reservationAutoExpire} onChange={(e) => set("reservationAutoExpire", e.target.checked)} />
            </label>
          ) : (
            <label className="flex items-start justify-between gap-4">
              <span>
                <span className="block font-semibold">Accepter les codes promo</span>
                <span className="text-sm text-text-2">Les codes se créent dans votre tableau de bord Stripe (Catalogue → Coupons). Un champ « code promo » apparaît alors au paiement.</span>
              </span>
              <input type="checkbox" className="mt-1 h-6 w-6 shrink-0 accent-[var(--c-primary)]" checked={s.allowPromotionCodes} onChange={(e) => set("allowPromotionCodes", e.target.checked)} />
            </label>
          )}
        </div>
      </section>

      <section id="legal" className="scroll-mt-6" aria-labelledby="titre-legal">
        <h2 id="titre-legal" className="mb-1 font-serif text-2xl">
          Informations légales et TVA
        </h2>
        <p className="mb-3 text-sm text-text-2">Affichées dans les mentions légales et sur les justificatifs de commande. Rien n&apos;est inventé : renseignez vos informations réelles.</p>
        <div className="card space-y-5 p-5">
          <fieldset>
            <legend className="field-label">Régime de TVA</legend>
            <div className="space-y-2">
              {[
                { v: "franchise", label: "Franchise en base de TVA", hint: "Cas fréquent des micro-entreprises : « TVA non applicable, art. 293 B du CGI »." },
                { v: "assujetti", label: "Assujettie à la TVA", hint: "Les prix saisis sont TTC ; la TVA incluse est calculée sur chaque commande." },
                { v: "", label: "Je ne sais pas encore", hint: "À vérifier avec votre comptable ou l'URSSAF avant l'ouverture." },
              ].map((o) => (
                <label key={o.v} className="flex items-start gap-3 rounded-xl border border-border p-3">
                  <input type="radio" name="vat" className="mt-1 h-5 w-5 accent-[var(--c-primary)]" checked={(s.vatRegime ?? "") === o.v} onChange={() => set("vatRegime", (o.v || null) as Settings["vatRegime"])} />
                  <span>
                    <span className="block font-medium">{o.label}</span>
                    <span className="text-sm text-text-2">{o.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            {s.vatRegime === "assujetti" && (
              <label className="mt-3 block max-w-xs">
                <span className="field-label">Taux de TVA (%)</span>
                <input className="input" inputMode="decimal" value={String(s.vatRateBp / 100).replace(".", ",")} onChange={(e) => set("vatRateBp", Math.round(Number(e.target.value.replace(",", ".") || 0) * 100))} />
              </label>
            )}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            {LEGAL_FIELDS.map((f) => (
              <label key={f.key} className={`block ${f.multiline ? "sm:col-span-2" : ""}`}>
                <span className="field-label">{f.label}</span>
                {f.multiline ? (
                  <textarea className="input !min-h-20" value={s.legal[f.key]} onChange={(e) => setLegal(f.key, e.target.value)} />
                ) : (
                  <input className="input" value={s.legal[f.key]} onChange={(e) => setLegal(f.key, e.target.value)} />
                )}
                {f.hint && <span className="field-hint">{f.hint}</span>}
              </label>
            ))}
          </div>
          <label className="block max-w-sm">
            <span className="field-label">Effacer automatiquement les adresses de livraison</span>
            <select className="input" value={s.addressRetentionMonths ?? ""} onChange={(e) => set("addressRetentionMonths", e.target.value ? Number(e.target.value) : null)}>
              <option value="">Jamais (à définir)</option>
              {[6, 12, 24, 36, 60].map((m) => (
                <option key={m} value={m}>
                  {m} mois après la commande
                </option>
              ))}
            </select>
            <span className="field-hint">Les montants et numéros de facture sont toujours conservés pour la comptabilité.</span>
          </label>
        </div>
      </section>

      {error && <Notice tone="danger">{error}</Notice>}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-3">
          <p className="flex-1 text-sm text-text-2">{dirty ? "Modifications non enregistrées" : "Tout est enregistré"}</p>
          <button type="button" className="btn btn-primary" disabled={pending || !dirty} onClick={save}>
            {pending && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
