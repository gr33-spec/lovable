"use client";

import { Copy, Plus, Star } from "lucide-react";
import { useCallback, useId, useState } from "react";
import { Badge, Button, Card, ErrorNotice, Field } from "@/components/ui";
import { api, ApiError, newActionKey } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/**
 * BATICLAIR GROUPÉ, ÉTAPE 3 (document du fondateur, 2026-10-19, section 2 étape 3) : « Mes négoces ». L'artisan saisit
 * l'e-mail de ses négoces, le favori en premier, et coche ce que chacun vend (neuf familles) ; chaque négoce rejoint la
 * base commune du département. Un message type lui sert à prévenir son négoce. Aucun démarchage par Greg.
 */
export const FAMILLES: readonly { id: string; label: string }[] = [
  { id: "couverture", label: "Couverture" },
  { id: "charpente", label: "Charpente" },
  { id: "maconnerie", label: "Maçonnerie" },
  { id: "electricite", label: "Électricité" },
  { id: "plomberie", label: "Plomberie" },
  { id: "amenagement_exterieur", label: "Aménagement extérieur" },
  { id: "menuiseries_fermetures", label: "Menuiseries et fermetures" },
  { id: "second_oeuvre", label: "Second œuvre" },
  { id: "serrurerie_metallerie", label: "Serrurerie et métallerie" },
];
const libelle = (id: string) => FAMILLES.find((f) => f.id === id)?.label ?? id;

export interface NegoceVue {
  id: string;
  nom: string;
  email: string;
  departement: string;
  familles: string[];
  favori: boolean;
  numeroCompte: string | null;
  stop: boolean;
}

/** Le groupé existe-t-il pour cette entreprise (drapeau allumé, SIRET vérifié) ? null tant qu'on ne sait pas. */
export function useGroupeOuvert(): boolean | null {
  const fetchEtat = useCallback(
    (signal: AbortSignal) => api<{ eligible: boolean }>("/v1/groupe", { signal }).catch((e: unknown) => (e instanceof ApiError && e.status === 404 ? { eligible: false } : Promise.reject(e))),
    [],
  );
  const etat = useResource(fetchEtat);
  return etat.data ? etat.data.eligible : null;
}

export function MesNegocesCard() {
  const fetchNegoces = useCallback((signal: AbortSignal) => api<{ negoces: NegoceVue[] }>("/v1/groupe/negoces", { signal }), []);
  const liste = useResource(fetchNegoces);
  const fetchMessage = useCallback((signal: AbortSignal) => api<{ message: string }>("/v1/groupe/negoces/message", { signal }), []);
  const message = useResource(fetchMessage);
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [copied, setCopied] = useState(false);
  const negoces = liste.data?.negoces ?? [];
  const run = async (key: string, f: () => Promise<unknown>) => {
    setPending(key);
    setError(null);
    try {
      await f();
      liste.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(null);
    }
  };
  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-xs font-extrabold tracking-[0.04em] text-muted">MES NÉGOCES (GROUPÉ)</h2>
      <p className="text-sm text-muted">Les négoces chez qui tu commandes, et ce que chacun vend. Ton favori reçoit les demandes du groupé en premier ; tu commandes toujours sur ton propre compte.</p>
      {negoces.length > 0 ? (
        <ul aria-label="Mes négoces" className="flex flex-col divide-y divide-line">
          {negoces.map((n) => (
            <li key={n.id} className="flex flex-col gap-1.5 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1.5 text-sm font-bold">
                  {n.favori ? <Star size={14} aria-label="Favori" className="shrink-0 fill-current text-warn" /> : null}
                  <span className="truncate">{n.nom}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {n.stop ? <Badge tone="danger">Ne reçoit plus rien</Badge> : null}
                  {n.numeroCompte ? <Badge>Compte {n.numeroCompte}</Badge> : <Badge tone="warn">Sans numéro de compte</Badge>}
                </span>
              </div>
              <p className="text-[13px] text-muted">{`${n.email} · ${n.departement} · ${n.familles.map(libelle).join(", ") || "aucune famille"}`}</p>
              <div className="flex flex-wrap gap-2">
                {!n.favori ? (
                  <Button variant="secondary" className="min-h-10 px-3.5 text-[14px]" pending={pending === `fav:${n.id}`} onClick={() => run(`fav:${n.id}`, () => api(`/v1/groupe/negoces/${n.id}`, { method: "PATCH", body: { favori: true } }))}>
                    En faire mon favori
                  </Button>
                ) : null}
                <Button variant="secondary" className="min-h-10 px-3.5 text-[14px]" pending={pending === `del:${n.id}`} onClick={() => run(`del:${n.id}`, () => api(`/v1/groupe/negoces/${n.id}`, { method: "DELETE" }))}>
                  Retirer de ma liste
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : liste.data ? (
        <p className="text-sm text-muted">Aucun négoce encore : ajoute celui chez qui tu commandes d&apos;habitude.</p>
      ) : null}
      {error ? <ErrorNotice error={error} /> : null}
      {adding ? (
        <NegoceForm
          premier={negoces.length === 0}
          onDone={(ok) => {
            setAdding(false);
            if (ok) liste.reload();
          }}
        />
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>
          <Plus size={18} aria-hidden="true" />
          Ajouter un négoce
        </Button>
      )}
      {message.data ? (
        <details className="group rounded-2xl bg-ground p-3">
          <summary className="cursor-pointer list-none text-sm font-bold">Le message à envoyer à ton négoce pour le prévenir</summary>
          <pre className="mt-2 font-sans text-[13px] leading-snug whitespace-pre-wrap text-ink">{message.data.message}</pre>
          <Button
            variant="secondary"
            className="mt-2 min-h-10 px-3.5 text-[14px]"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(message.data!.message);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            <Copy size={16} aria-hidden="true" />
            {copied ? "Copié" : "Copier le message"}
          </Button>
        </details>
      ) : null}
    </Card>
  );
}

function NegoceForm({ premier, onDone }: { premier: boolean; onDone: (ok: boolean) => void }) {
  const id = useId();
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [numeroCompte, setNumeroCompte] = useState("");
  const [departement, setDepartement] = useState("");
  const [familles, setFamilles] = useState<Set<string>>(new Set());
  const [favori, setFavori] = useState(premier);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const toggle = (f: string) =>
    setFamilles((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      await api("/v1/groupe/negoces", {
        method: "POST",
        body: { nom: nom.trim(), email: email.trim(), familles: [...familles], favori, numeroCompte: numeroCompte.trim() || null, departement: departement.trim() || null },
        idempotencyKey: newActionKey(),
      });
      onDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
    }
  };
  return (
    <form
      aria-label="Nouveau négoce"
      className="flex flex-col gap-3 rounded-2xl bg-ground p-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Field id={`${id}-nom`} label="Nom du négoce" required maxLength={120} value={nom} onChange={(e) => setNom(e.target.value)} />
      <Field id={`${id}-email`} label="E-mail où il reçoit les demandes" type="email" inputMode="email" required maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field id={`${id}-compte`} label="Ton numéro de compte chez lui" hint="Facultatif : repris sur tes bons de commande ; sans lui, « ouverture de compte demandée »." maxLength={60} value={numeroCompte} onChange={(e) => setNumeroCompte(e.target.value)} />
      <Field id={`${id}-dep`} label="Département" hint="Facultatif : celui de ton entreprise par défaut (« 22 », « 2A », « 974 »)." maxLength={3} value={departement} onChange={(e) => setDepartement(e.target.value)} />
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-sm font-bold">Ce qu&apos;il vend</legend>
        <div className="flex flex-wrap gap-1.5">
          {FAMILLES.map((f) => (
            <label key={f.id} className={`relative inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full px-3 text-[13px] font-bold ${familles.has(f.id) ? "bg-accent text-white" : "bg-surface text-ink"}`}>
              <input type="checkbox" className="absolute inset-0 m-0 cursor-pointer appearance-none opacity-0" checked={familles.has(f.id)} onChange={() => toggle(f.id)} aria-label={`Vend : ${f.label}`} />
              {f.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm font-bold">
        <input type="checkbox" checked={favori} onChange={(e) => setFavori(e.target.checked)} className="size-5 accent-accent" />
        Mon favori (il reçoit en premier)
      </label>
      {error ? <ErrorNotice error={error} /> : null}
      <div className="flex gap-2">
        <Button variant="secondary" className="grow" onClick={() => onDone(false)} disabled={pending}>
          Annuler
        </Button>
        <Button type="submit" className="grow" pending={pending} disabled={!nom.trim() || !email.trim() || familles.size === 0}>
          Ajouter
        </Button>
      </div>
    </form>
  );
}
