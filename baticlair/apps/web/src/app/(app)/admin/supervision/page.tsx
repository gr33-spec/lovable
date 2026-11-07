"use client";

import { useCallback, useState } from "react";
import { PorteAdmin } from "@/components/admin-achat-groupe";
import {
  BackButton,
  Button,
  Card,
  PageTitle,
  SectionTitle,
  Skeleton,
} from "@/components/ui";
import { api, messageErreur } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/**
 * LA SUPERVISION (lot 6, Greg, 6 novembre 2026, prompt maître points 6, 13 et 14) : la file d'exceptions (seuls les cas
 * qui demandent une décision humaine), la taxonomie des familles (réglée ici, plus codée en dur) et le score interne
 * de fiabilité des négoces (des faits ; jamais montré aux artisans ni aux négoces).
 */
type Onglet = "exceptions" | "familles" | "negoces";
const ONGLETS: { value: Onglet; label: string }[] = [
  { value: "exceptions", label: "Exceptions" },
  { value: "familles", label: "Familles" },
  { value: "negoces", label: "Négoces" },
];

export default function AdminSupervisionPage() {
  const [onglet, setOnglet] = useState<Onglet>("exceptions");
  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/admin/pilotage" />
      <PageTitle>Supervision</PageTitle>
      <PorteAdmin>
        <div
          role="tablist"
          aria-label="Supervision"
          className="flex flex-wrap gap-1.5"
        >
          {ONGLETS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="tab"
              aria-selected={onglet === o.value}
              onClick={() => setOnglet(o.value)}
              className={`pressable min-h-11 rounded-full px-3.5 text-[14px] font-semibold ${onglet === o.value ? "bg-accent text-on-accent shadow-card" : "border border-line bg-transparent text-ink"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div
          role="tabpanel"
          aria-label={ONGLETS.find((o) => o.value === onglet)!.label}
          className="flex flex-col gap-3"
        >
          {onglet === "exceptions" ? (
            <Exceptions />
          ) : onglet === "familles" ? (
            <Familles />
          ) : (
            <Negoces />
          )}
        </div>
      </PorteAdmin>
    </div>
  );
}

interface FileExceptions {
  types: { type: string; libelle: string; ouvertes: number }[];
  items: {
    id: string;
    type: string;
    libelle: string;
    gravite: number;
    titre: string;
    detail: string | null;
    occurrences: number;
    dernierLe: string;
    resoluLe: string | null;
    note: string | null;
  }[];
}

const quand = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function Exceptions() {
  const [statut, setStatut] = useState<"ouverte" | "resolue">("ouverte");
  const [type, setType] = useState("");
  const fetcher = useCallback(
    (signal: AbortSignal) =>
      api<FileExceptions>(
        `/v1/admin/pilotage/exceptions?statut=${statut}${type ? `&type=${type}` : ""}`,
        { signal },
      ),
    [statut, type],
  );
  const { data, error, reload } = useResource(fetcher);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const resoudre = async (id: string) => {
    setErreur(null);
    try {
      await api(`/v1/admin/pilotage/exceptions/${id}/resoudre`, {
        method: "POST",
        body: { note: notes[id]?.trim() || null },
      });
      reload();
    } catch (e) {
      setErreur(messageErreur(e));
    }
  };
  return (
    <section aria-label="File d'exceptions" className="flex flex-col gap-3">
      <p className="text-[14px] text-muted">
        Le parcours normal fonctionne seul ; ne remontent ici que les cas qui
        demandent une décision. Un même cas ne remonte qu&apos;une fois tant
        qu&apos;il est ouvert.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          État
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value as "ouverte" | "resolue")}
            className="min-h-11 w-full rounded-lg border border-line bg-surface px-2 text-[15px] font-normal"
          >
            <option value="ouverte">Ouvertes</option>
            <option value="resolue">Résolues</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] font-semibold">
          Type
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-line bg-surface px-2 text-[15px] font-normal"
          >
            <option value="">Tous</option>
            {(data?.types ?? []).map((t) => (
              <option key={t.type} value={t.type}>
                {t.libelle}
                {t.ouvertes ? ` (${t.ouvertes})` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      {erreur || error ? (
        <p role="alert" className="text-[14px] font-semibold text-danger">
          {erreur ?? messageErreur(error)}
        </p>
      ) : null}
      {!data && !error ? (
        <Skeleton card="h-32" lines={2} label="Chargement des exceptions…" />
      ) : null}
      {data && data.items.length === 0 ? (
        <p className="text-[15px] text-muted">
          {statut === "ouverte"
            ? "Aucune exception ouverte."
            : "Aucune exception résolue."}
        </p>
      ) : null}
      {data?.items.map((e) => (
        <Card
          key={e.id}
          className={`flex flex-col gap-2 p-4 ${e.gravite === 3 ? "border-2 border-danger" : ""}`}
        >
          <span className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold">
            <span className="rounded-full bg-ground px-2.5 py-1">
              {e.libelle}
            </span>
            <span className="text-muted">
              {quand(e.dernierLe)}
              {e.occurrences > 1 ? ` · ${e.occurrences} fois` : ""}
            </span>
          </span>
          <p className="text-[15px] font-bold">{e.titre}</p>
          {e.detail ? (
            <p className="text-[14px] leading-snug text-muted">{e.detail}</p>
          ) : null}
          {e.resoluLe ? (
            <p className="text-[14px] text-ok">
              Résolue le {quand(e.resoluLe)}
              {e.note ? ` : ${e.note}` : ""}
            </p>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor={`note-${e.id}`}>
                Note de résolution
              </label>
              <input
                id={`note-${e.id}`}
                value={notes[e.id] ?? ""}
                onChange={(x) =>
                  setNotes((n) => ({ ...n, [e.id]: x.target.value }))
                }
                placeholder="Ce qui a été décidé (facultatif)"
                className="min-h-11 min-w-0 grow rounded-lg border border-line bg-surface px-3 text-[16px]"
              />
              <Button variant="secondary" onClick={() => void resoudre(e.id)}>
                Marquer résolue
              </Button>
            </div>
          )}
        </Card>
      ))}
    </section>
  );
}

interface Famille {
  code: string;
  libelle: string;
  ordre: number;
  active: boolean;
}

function Familles() {
  const fetcher = useCallback(
    (signal: AbortSignal) =>
      api<{ familles: Famille[] }>("/v1/admin/pilotage/familles", { signal }),
    [],
  );
  const { data, error, setData } = useResource(fetcher);
  const [libelles, setLibelles] = useState<Record<string, string>>({});
  const [nouvelle, setNouvelle] = useState({ code: "", libelle: "" });
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(
    null,
  );
  const geste = async (
    f: () => Promise<{ familles: Famille[] }>,
    ok: string,
  ) => {
    setMessage(null);
    try {
      setData(await f());
      setMessage({ ok: true, texte: ok });
    } catch (e) {
      setMessage({ ok: false, texte: messageErreur(e) });
    }
  };
  return (
    <section aria-label="Familles de matériaux" className="flex flex-col gap-3">
      <p className="text-[14px] text-muted">
        Les familles proposées dans les achats groupés et les filtres de «
        Découvrir ». Un changement vaut pour toute l&apos;application dans la
        minute.
      </p>
      {message ? (
        <p
          role={message.ok ? "status" : "alert"}
          className={`text-[14px] font-semibold ${message.ok ? "text-ok" : "text-danger"}`}
        >
          {message.texte}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-[14px] font-semibold text-danger">
          {messageErreur(error)}
        </p>
      ) : null}
      {!data && !error ? (
        <Skeleton card="h-32" lines={2} label="Chargement des familles…" />
      ) : null}
      {data?.familles.map((f) => (
        <Card key={f.code} className="flex flex-col gap-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-muted">
              {f.code}
            </span>
            <label className="flex min-h-11 items-center gap-2 text-[14px] font-semibold">
              <input
                type="checkbox"
                checked={f.active}
                onChange={() =>
                  void geste(
                    () =>
                      api(`/v1/admin/pilotage/familles/${f.code}`, {
                        method: "PUT",
                        body: { active: !f.active },
                      }),
                    f.active
                      ? `« ${f.libelle} » n'est plus proposée.`
                      : `« ${f.libelle} » est proposée.`,
                  )
                }
                className="size-5 accent-[var(--color-accent)]"
              />
              Proposée
            </label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor={`libelle-${f.code}`}>
              Libellé de {f.code}
            </label>
            <input
              id={`libelle-${f.code}`}
              value={libelles[f.code] ?? f.libelle}
              onChange={(e) =>
                setLibelles((l) => ({ ...l, [f.code]: e.target.value }))
              }
              className="min-h-11 min-w-0 grow rounded-lg border border-line bg-surface px-3 text-[16px]"
            />
            {libelles[f.code] && libelles[f.code] !== f.libelle ? (
              <Button
                variant="secondary"
                onClick={() =>
                  void geste(
                    () =>
                      api(`/v1/admin/pilotage/familles/${f.code}`, {
                        method: "PUT",
                        body: { libelle: libelles[f.code]!.trim() },
                      }),
                    "Libellé enregistré.",
                  )
                }
              >
                Enregistrer
              </Button>
            ) : null}
          </div>
        </Card>
      ))}
      {data ? (
        <Card className="flex flex-col gap-2 p-3">
          <SectionTitle>Ajouter une famille</SectionTitle>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              aria-label="Code de la famille"
              value={nouvelle.code}
              onChange={(e) =>
                setNouvelle((n) => ({ ...n, code: e.target.value }))
              }
              placeholder="isolation"
              className="min-h-11 rounded-lg border border-line bg-surface px-3 text-[16px]"
            />
            <input
              aria-label="Libellé de la famille"
              value={nouvelle.libelle}
              onChange={(e) =>
                setNouvelle((n) => ({ ...n, libelle: e.target.value }))
              }
              placeholder="Isolation"
              className="min-h-11 rounded-lg border border-line bg-surface px-3 text-[16px]"
            />
          </div>
          <p className="text-[13px] text-muted">
            Elle naît non proposée : coche « Proposée » quand le catalogue a ses
            articles.
          </p>
          <Button
            variant="secondary"
            disabled={
              !nouvelle.code.trim() || nouvelle.libelle.trim().length < 2
            }
            onClick={() =>
              void geste(
                () =>
                  api("/v1/admin/pilotage/familles", {
                    method: "POST",
                    body: {
                      code: nouvelle.code.trim(),
                      libelle: nouvelle.libelle.trim(),
                    },
                  }),
                "Famille ajoutée.",
              ).then(() => setNouvelle({ code: "", libelle: "" }))
            }
          >
            Ajouter la famille
          </Button>
        </Card>
      ) : null}
    </section>
  );
}

interface Fiabilite {
  phrase: string;
  negoces: {
    email: string;
    nom: string;
    score: number | null;
    tauxReponse: number;
    delaiMoyenHeures: number | null;
    completude: number | null;
    familles: string[];
    base: string;
  }[];
}

function Negoces() {
  const fetcher = useCallback(
    (signal: AbortSignal) =>
      api<Fiabilite>("/v1/admin/pilotage/negoces/fiabilite", { signal }),
    [],
  );
  const { data, error } = useResource(fetcher);
  const pct = (x: number | null) =>
    x === null ? "—" : `${Math.round(x * 100)} %`;
  return (
    <section aria-label="Fiabilité des négoces" className="flex flex-col gap-3">
      {data ? <p className="text-[14px] font-semibold">{data.phrase}</p> : null}
      <p className="text-[14px] text-muted">
        Score sur 100 : réponses (un « ne peut pas chiffrer » compte moitié),
        complétude des offres, délai. Pas de score sous trois demandes.
      </p>
      {error ? (
        <p role="alert" className="text-[14px] font-semibold text-danger">
          {messageErreur(error)}
        </p>
      ) : null}
      {!data && !error ? (
        <Skeleton card="h-32" lines={2} label="Calcul des scores…" />
      ) : null}
      {data && data.negoces.length === 0 ? (
        <p className="text-[15px] text-muted">
          Aucune demande envoyée pour l&apos;instant.
        </p>
      ) : null}
      {data?.negoces.map((n) => (
        <Card key={n.email} className="flex flex-col gap-1 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate text-[15px] font-bold">
              {n.nom}
            </span>
            <span className="shrink-0 text-[18px] font-extrabold tabular-nums">
              {n.score === null ? "—" : n.score}
            </span>
          </div>
          <span className="truncate text-[13px] text-muted">{n.email}</span>
          <span className="text-[14px]">
            Réponses {pct(n.tauxReponse)} · Complétude {pct(n.completude)} ·
            Délai{" "}
            {n.delaiMoyenHeures === null
              ? "—"
              : `${Math.round(n.delaiMoyenHeures)} h`}
          </span>
          <span className="text-[13px] text-muted">
            {n.base}
            {n.familles.length ? ` · chiffre : ${n.familles.join(", ")}` : ""}
          </span>
        </Card>
      ))}
    </section>
  );
}
