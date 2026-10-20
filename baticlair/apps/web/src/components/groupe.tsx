"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useId, useMemo, useState } from "react";
import { Button, ErrorNotice } from "@/components/ui";
import { api, ApiError, newActionKey } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/**
 * BATICLAIR GROUPÉ, ÉTAPE 2 (document du fondateur, 2026-10-19, section 2 étape 2) : sur « Ton chantier », proposer des
 * lignes au groupé, par ligne ou par lot, avec une fenêtre de livraison et un seul choix « Chantier signé » / « Devis en
 * attente ». Tant que le drapeau `groupe` est éteint, ou que l'entreprise n'a pas son SIRET vérifié,
 * rien de tout cela n'apparaît : l'écran 3 ne change pas. Gratuit pour l'artisan (décision du fondateur, 2026-10-20) : aucune
 * condition d'abonnement.
 */
export interface BesoinGroupe {
  id: string;
  articleKey: string;
  designation: string;
  quantite: string;
  unite: string;
  statut: "en_attente" | "signe" | "retire" | "engage" | "commande" | "livre";
  fenetre: { tot: string; tard: string };
  lotParti: boolean;
  /** Étape 6 : l'offre personnelle, une information, jamais une question. */
  offre: OffreGroupe | null;
}

export interface OffreGroupe {
  id: string;
  lotNumero: number;
  prixUnitaire: string;
  negoce: string;
  dateLivraison: string | null;
  prixReference: string | null;
  economie: string | null;
  probleme: string | null;
}

export interface Groupe {
  /** Clé de l'article → son besoin au groupé (retirés exclus). */
  besoins: ReadonlyMap<string, BesoinGroupe>;
  proposer: (articles: string[], fenetre: { tot: string; tard: string }, statut: "signe" | "en_attente", engagement: boolean) => Promise<void>;
  signer: (id: string) => Promise<void>;
  retirer: (id: string) => Promise<void>;
  probleme: (offreId: string, texte: string) => Promise<void>;
  reference: (offreId: string, prix: number | null) => Promise<void>;
}

/** Combien de négoces dans ma liste (étape 3) : à zéro, la section « Au groupé » invite à les ajouter. */
function useMesNegocesCount(): number | null {
  const fetchNegoces = useCallback((signal: AbortSignal) => api<{ negoces: unknown[] }>("/v1/groupe/negoces", { signal }), []);
  const liste = useResource(fetchNegoces);
  return liste.data ? liste.data.negoces.length : null;
}

/** La phrase d'engagement, mot pour mot (section 7, étape 2 du document). */
export const PHRASE_ENGAGEMENT = "En cochant Chantier signé, je m'engage à commander ces quantités au prix groupé obtenu, chez le négoce retenu.";

/** Le groupé pour ce chantier, ou null quand il n'existe pas pour l'entreprise (drapeau éteint, SIRET non vérifié). */
export function useGroupe(projectId: string): Groupe | null {
  const fetchEtat = useCallback(
    (signal: AbortSignal) => api<{ eligible: boolean }>("/v1/groupe", { signal }).catch((e: unknown) => (e instanceof ApiError && e.status === 404 ? { eligible: false } : Promise.reject(e))),
    [],
  );
  const etat = useResource(fetchEtat);
  const eligible = etat.data?.eligible === true;
  const fetchBesoins = useCallback(
    (signal: AbortSignal) => (eligible ? api<{ besoins: BesoinGroupe[] }>(`/v1/projects/${encodeURIComponent(projectId)}/groupe`, { signal }) : Promise.resolve({ besoins: [] as BesoinGroupe[] })),
    [projectId, eligible],
  );
  const liste = useResource(fetchBesoins);
  const besoins = useMemo(() => new Map((liste.data?.besoins ?? []).map((b) => [b.articleKey, b])), [liste.data]);
  if (!eligible) return null;
  return {
    besoins,
    proposer: async (articles, fenetre, statut, engagement) => {
      await api(`/v1/projects/${encodeURIComponent(projectId)}/groupe`, { method: "POST", body: { articles, fenetre, statut, engagement }, idempotencyKey: newActionKey() });
      liste.reload();
    },
    signer: async (id) => {
      await api(`/v1/groupe/besoins/${encodeURIComponent(id)}/signer`, { method: "POST", body: { engagement: true } });
      liste.reload();
    },
    retirer: async (id) => {
      await api(`/v1/groupe/besoins/${encodeURIComponent(id)}`, { method: "DELETE" });
      liste.reload();
    },
    probleme: async (offreId, texte) => {
      await api(`/v1/groupe/offres/${encodeURIComponent(offreId)}/probleme`, { method: "POST", body: { probleme: texte } });
      liste.reload();
    },
    reference: async (offreId, prix) => {
      await api(`/v1/groupe/offres/${encodeURIComponent(offreId)}/reference`, { method: "POST", body: { prixReference: prix } });
      liste.reload();
    },
  };
}

const auJour = (decalage: number) => {
  const d = new Date();
  d.setDate(d.getDate() + decalage);
  return d.toISOString().slice(0, 10);
};

/**
 * La barre du bas pendant qu'on coche les lignes à proposer : la fenêtre de livraison (date la plus tôt, date limite),
 * puis un seul choix « Chantier signé » / « Devis en attente » ; signé, la phrase d'engagement à cocher.
 */
export function GroupeBar({ count, onCancel, onPropose }: { count: number; onCancel: () => void; onPropose: (fenetre: { tot: string; tard: string }, statut: "signe" | "en_attente", engagement: boolean) => Promise<void> }) {
  const id = useId();
  const [tot, setTot] = useState(() => auJour(7));
  const [tard, setTard] = useState(() => auJour(21));
  const [statut, setStatut] = useState<"signe" | "en_attente" | null>(null);
  const [engagement, setEngagement] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const fenetreOk = Boolean(tot && tard && tot <= tard);
  const choix = "inline-flex min-h-12 grow items-center justify-center rounded-2xl px-3 text-[15px] font-extrabold";
  return (
    <section aria-label="Proposer au groupé" className="flex flex-col gap-2 rounded-[22px] bg-surface p-3 shadow-card">
      <p className="text-[14px] font-extrabold">{count === 0 ? "Coche les lignes à proposer au groupé" : `${count} ligne${count > 1 ? "s" : ""} au groupé`}</p>
      <fieldset className="flex gap-2">
        <legend className="mb-1 text-[13px] font-bold text-muted">Livraison sur le chantier</legend>
        <label htmlFor={`${id}-tot`} className="flex grow flex-col gap-1 text-[13px] font-bold text-muted">
          Au plus tôt
          <input id={`${id}-tot`} type="date" value={tot} onChange={(e) => setTot(e.target.value)} className="min-h-12 rounded-2xl bg-ground px-3 text-[15px] font-bold text-ink" />
        </label>
        <label htmlFor={`${id}-tard`} className="flex grow flex-col gap-1 text-[13px] font-bold text-muted">
          Au plus tard
          <input id={`${id}-tard`} type="date" value={tard} onChange={(e) => setTard(e.target.value)} className="min-h-12 rounded-2xl bg-ground px-3 text-[15px] font-bold text-ink" />
        </label>
      </fieldset>
      <div role="radiogroup" aria-label="Le chantier" className="flex gap-2">
        {(
          [
            ["signe", "Chantier signé"],
            ["en_attente", "Devis en attente"],
          ] as const
        ).map(([v, label]) => (
          <button key={v} type="button" role="radio" aria-checked={statut === v} onClick={() => setStatut(v)} className={`${choix} ${statut === v ? "bg-accent text-white" : "bg-ground text-ink"}`}>
            {label}
          </button>
        ))}
      </div>
      {statut === "signe" ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-ground p-3 text-[14px] leading-snug font-bold">
          <input type="checkbox" checked={engagement} onChange={(e) => setEngagement(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-accent" />
          <span>{PHRASE_ENGAGEMENT}</span>
        </label>
      ) : statut === "en_attente" ? (
        <p className="text-[13px] leading-snug text-muted">Transmis au négoce comme volume probable, sans engagement. Tu le passeras en signé d&apos;un tap.</p>
      ) : null}
      {error ? <ErrorNotice error={error} /> : null}
      <div className="flex gap-2">
        <Button className="grow" variant="secondary" onClick={onCancel} disabled={pending}>
          Annuler
        </Button>
        <Button
          className="grow"
          pending={pending}
          disabled={count === 0 || !fenetreOk || !statut || (statut === "signe" && !engagement)}
          onClick={async () => {
            if (!statut) return;
            setPending(true);
            setError(null);
            try {
              await onPropose({ tot, tard }, statut, engagement);
            } catch (e) {
              setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
            } finally {
              setPending(false);
            }
          }}
        >
          <Users size={18} aria-hidden="true" />
          Proposer
        </Button>
      </div>
    </section>
  );
}

const euros = (s: string) => `${Number(s).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const jourFr = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

/**
 * MON OFFRE (parcours groupé, étape 7 du document) : ma quantité, mon prix unitaire, le négoce retenu, la date de livraison,
 * mon économie estimée (section 6 : (prix de référence − prix groupé) × quantité, le prix de référence étant mon dernier
 * prix payé seul). Une information, pas une question ; « Problème » si je vois une erreur. Jamais le nombre ni le nom des
 * autres artisans.
 */
function OffreCard({ besoin: b, groupe }: { besoin: BesoinGroupe; groupe: Groupe }) {
  const o = b.offre!;
  const [probleme, setProbleme] = useState<string | null>(null);
  const [reference, setReference] = useState<string>(o.prixReference ? String(Number(o.prixReference)) : "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const run = async (f: () => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await f();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
    }
  };
  return (
    <section aria-label={`Mon offre : ${b.designation}`} className="flex flex-col gap-1.5 rounded-xl bg-surface p-3 shadow-card">
      <p className="text-[13px] font-extrabold text-muted">Mon offre · lot n° {o.lotNumero}</p>
      <p className="text-[15px] leading-snug font-bold">
        {b.quantite.replace(".", ",")} {b.unite} à {euros(o.prixUnitaire)} HT l&apos;unité chez {o.negoce}
      </p>
      {o.dateLivraison ? <p className="text-[13px] font-semibold text-muted">Livraison le {jourFr(o.dateLivraison)}, sur ton chantier, sur ton compte chez lui.</p> : null}
      {o.economie !== null ? <p className="text-[14px] font-extrabold text-ok">Économie estimée : {euros(o.economie)}</p> : null}
      <label className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-muted">
        Ton dernier prix payé seul (€ HT l&apos;unité)
        <input
          type="text"
          inputMode="decimal"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          aria-label="Ton dernier prix payé seul"
          className="h-10 w-24 rounded-xl border border-line bg-ground px-2 text-[14px] font-bold text-ink"
        />
        <Button variant="secondary" className="min-h-10 px-3.5 text-[14px]" pending={pending} onClick={() => run(() => groupe.reference(o.id, reference.trim() ? Number(reference.replace(",", ".")) : null))}>
          Calculer mon économie
        </Button>
      </label>
      {o.probleme ? (
        <p className="text-[13px] font-semibold text-warn">Problème signalé : {o.probleme}</p>
      ) : probleme === null ? (
        <Button variant="secondary" className="min-h-10 self-start px-3.5 text-[14px]" onClick={() => setProbleme("")}>
          Problème
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea value={probleme} onChange={(e) => setProbleme(e.target.value)} maxLength={1000} rows={2} aria-label="Quel est le problème ?" placeholder="Quel est le problème ?" className="rounded-xl border border-line bg-ground px-3 py-2 text-[14px]" />
          <div className="flex gap-2">
            <Button variant="secondary" className="grow" onClick={() => setProbleme(null)} disabled={pending}>
              Annuler
            </Button>
            <Button className="grow" pending={pending} disabled={!probleme.trim()} onClick={() => run(async () => (await groupe.probleme(o.id, probleme.trim()), setProbleme(null)))}>
              Signaler
            </Button>
          </div>
        </div>
      )}
      {error ? <ErrorNotice error={error} /> : null}
    </section>
  );
}

const STATUTS: Record<BesoinGroupe["statut"], string> = {
  en_attente: "Devis en attente",
  signe: "Chantier signé",
  retire: "Retiré",
  engage: "Engagé, lot parti",
  commande: "Commandé",
  livre: "Livré",
};

/** « Au groupé » : les lignes proposées, leur état ; « Passer en signé » d'un tap (avec l'engagement), « Retirer » tant que le lot n'est pas parti. */
export function GroupeSection({ groupe }: { groupe: Groupe }) {
  const negoces = useMesNegocesCount();
  const [signing, setSigning] = useState<string | null>(null);
  const [engagement, setEngagement] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const besoins = [...groupe.besoins.values()];
  if (besoins.length === 0) return null;
  const run = async (key: string, f: () => Promise<void>) => {
    setPending(key);
    setError(null);
    try {
      await f();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(null);
    }
  };
  return (
    <section aria-label="Au groupé" className="mt-3 flex flex-col gap-2 rounded-[20px] bg-surface p-3 shadow-card">
      <h3 className="text-[13px] font-extrabold text-muted">Au groupé</h3>
      {negoces === 0 ? (
        <p className="text-[14px] leading-snug font-bold">
          Ajoute d&apos;abord tes négoces (e-mail et ce qu&apos;ils vendent) :{" "}
          <Link href="/fournisseurs" className="text-accent-text underline decoration-dotted underline-offset-4">
            Fournisseurs
          </Link>
          . Sans eux, le groupé ne sait pas à qui demander.
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {besoins.map((b) => (
          <li key={b.id} className="flex flex-col gap-1.5 rounded-2xl bg-ground p-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-[15px] font-bold">{b.designation}</span>
              <span className="shrink-0 text-[15px] font-extrabold">{`${b.quantite.replace(".", ",")} ${b.unite}`}</span>
            </div>
            <p className="text-[13px] font-semibold text-muted">{STATUTS[b.statut]}</p>
            {b.offre ? <OffreCard besoin={b} groupe={groupe} /> : null}
            {signing === b.id ? (
              <>
                <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-snug font-bold">
                  <input type="checkbox" checked={engagement} onChange={(e) => setEngagement(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-accent" />
                  <span>{PHRASE_ENGAGEMENT}</span>
                </label>
                <div className="flex gap-2">
                  <Button variant="secondary" className="grow" onClick={() => setSigning(null)} disabled={pending === b.id}>
                    Annuler
                  </Button>
                  <Button className="grow" pending={pending === b.id} disabled={!engagement} onClick={() => run(b.id, async () => (await groupe.signer(b.id), setSigning(null)))}>
                    Chantier signé
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap gap-2">
                {b.statut === "en_attente" ? (
                  <Button variant="secondary" className="min-h-10 px-3.5 text-[14px]" onClick={() => (setSigning(b.id), setEngagement(false))}>
                    Passer en signé
                  </Button>
                ) : null}
                {(b.statut === "en_attente" || b.statut === "signe") && !b.lotParti ? (
                  <Button variant="secondary" className="min-h-10 px-3.5 text-[14px]" pending={pending === b.id} onClick={() => run(b.id, () => groupe.retirer(b.id))}>
                    Retirer du groupé
                  </Button>
                ) : null}
              </div>
            )}
          </li>
        ))}
      </ul>
      {error ? <ErrorNotice error={error} /> : null}
    </section>
  );
}
