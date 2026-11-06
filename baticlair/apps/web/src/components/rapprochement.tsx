"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useState } from "react";
import { Badge, Button, ErrorNotice } from "@/components/ui";
import { api, ApiError, newActionKey } from "@/lib/api";
import { retenirContexteAchat } from "@/lib/contexte-achat";
import { ETAT_LIGNE, MOTIF_RETRAIT, jourCourt, type AnalyseRapprochement, type LigneEnRecherche, type PropositionVue } from "@/lib/rapprochement";
import { useResource } from "@/lib/use-resource";

const dansJours = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

/**
 * « RECHERCHER DES BESOINS COMPATIBLES » (Greg, 6 novembre 2026, points 7 et 9) : sur une liste validée, ligne par ligne,
 * ce qui peut chercher un rapprochement jusqu'à une date. La demande individuelle reste libre de partir (rien n'est
 * bloqué) ; les lignes ne rejoignent jamais un achat groupé toutes seules : on prévient, l'artisan décide.
 */
export function RechercheRapprochement({ projectId }: { projectId: string }) {
  const id = useId();
  const fetcher = useCallback((signal: AbortSignal) => api<AnalyseRapprochement>(`/v1/projects/${projectId}/rapprochement`, { signal }).catch(() => null), [projectId]);
  const { data, setData, reload } = useResource(fetcher);
  const [cochees, setCochees] = useState<ReadonlySet<string>>(new Set());
  const [jusquau, setJusquau] = useState(dansJours(7));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [envoye, setEnvoye] = useState(false);
  if (!data) return null;
  const libres = data.lignes.filter((l) => l.rapprochable && !(l.recherche && ["disponible", "proposee", "rejointe"].includes(l.recherche.statut)));
  const enRecherche = data.lignes.filter((l) => l.recherche && ["disponible", "proposee", "rejointe"].includes(l.recherche.statut));
  const seulement = data.lignes.filter((l) => !l.rapprochable && !l.recherche);
  if (libres.length === 0 && enRecherche.length === 0) return null;

  async function lancer() {
    setPending(true);
    setError(null);
    try {
      setData(await api<AnalyseRapprochement>(`/v1/projects/${projectId}/rapprochement`, { method: "POST", body: { articles: [...cochees], jusquau }, idempotencyKey: newActionKey() }));
      setCochees(new Set());
      setEnvoye(true);
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
    }
  }

  async function arreter(ligneId: string) {
    await api(`/v1/rapprochements/lignes/${ligneId}`, { method: "DELETE" }).catch(() => undefined);
    reload();
  }

  return (
    <section aria-label="Rechercher des besoins compatibles" className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card">
      <p className="text-[16px] font-bold">Rechercher des besoins compatibles</p>
      <p className="text-[15px] leading-snug text-muted">{data.phrase}</p>
      {error ? <ErrorNotice error={error} /> : null}
      {enRecherche.length > 0 ? (
        <ul aria-label="Lignes en recherche" className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {enRecherche.map((l) => (
            <li key={l.key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <span className="min-w-0 text-[15px]">
                <span className="font-semibold">{l.reference ?? l.designation}</span>
                <span className="block text-[13px] text-muted">
                  {ETAT_LIGNE[l.recherche!.statut as LigneEnRecherche["statut"]]} jusqu&apos;au {jourCourt(l.recherche!.jusquau)}
                </span>
              </span>
              {l.recherche!.statut !== "rejointe" ? (
                <Button variant="ghost" onClick={() => void arreter(l.recherche!.id)}>
                  Arrêter la recherche
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {libres.length > 0 ? (
        <>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-[14px] font-semibold">Lignes qui peuvent chercher</legend>
            {libres.map((l) => (
              <label key={l.key} className="flex min-h-11 items-start gap-3 rounded-lg px-1 py-1.5">
                <input
                  type="checkbox"
                  className="mt-1 size-5 shrink-0 accent-[var(--color-accent)]"
                  checked={cochees.has(l.key)}
                  onChange={(e) => setCochees((s) => (e.target.checked ? new Set([...s, l.key]) : new Set([...s].filter((k) => k !== l.key))))}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="text-[15px] font-semibold">{l.reference ?? l.designation}</span>
                  <span className="text-[13px] text-muted">
                    {l.quantite.toLocaleString("fr-FR")} {l.unite}
                  </span>
                  {l.collecte ? (
                    <span className="mt-1">
                      <Badge tone="ok">Une collecte ouverte correspond · clôture le {jourCourt(l.collecte.clotureLe)}</Badge>
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-jusquau`} className="text-[14px] font-semibold">
              Chercher jusqu&apos;au
            </label>
            <input
              id={`${id}-jusquau`}
              type="date"
              value={jusquau}
              min={dansJours(1)}
              max={dansJours(data.rechercheMaxJours)}
              onChange={(e) => setJusquau(e.target.value)}
              className="min-h-12 rounded-xl border border-line bg-surface px-3 text-[16px]"
            />
          </div>
          <Button onClick={() => void lancer()} pending={pending} disabled={cochees.size === 0}>
            Rechercher des besoins compatibles
          </Button>
        </>
      ) : null}
      {envoye ? (
        <p role="status" className="text-[14px] font-semibold text-ok">
          {data.resteIndividuelle}
        </p>
      ) : null}
      {seulement.length > 0 ? (
        <details className="text-[14px] text-muted">
          <summary className="cursor-pointer font-semibold">
            {seulement.length} ligne{seulement.length > 1 ? "s partent" : " part"} seulement en demande individuelle
          </summary>
          <ul className="mt-1 flex flex-col gap-1">
            {seulement.map((l) => (
              <li key={l.key}>
                {l.designation} : {l.raison}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

/**
 * Les rapprochements à examiner (espace Groupes, « Mes groupes ») : le niveau, les écarts mot pour mot, le secteur, la
 * clôture, le nombre d'entreprises (sous le seuil : « moins de 5 entreprises ») ; « Examiner » ouvre la liste où l'artisan
 * confirme lui-même ; « Pas intéressé » arrête les relances.
 */
export function RapprochementsPanneau() {
  const router = useRouter();
  const fetcher = useCallback((signal: AbortSignal) => api<{ lignes: LigneEnRecherche[] }>("/v1/rapprochements", { signal }).catch(() => null), []);
  const { data, reload } = useResource(fetcher);
  const [pending, setPending] = useState<string | null>(null);
  if (!data || data.lignes.length === 0) return null;

  async function repondre(p: PropositionVue, reponse: "examinee" | "refusee") {
    setPending(p.id);
    try {
      const r = await api<{ reponse: string; href?: string; achat?: { id: string; titre: string } | null }>(`/v1/rapprochements/propositions/${p.id}/reponse`, { method: "POST", body: { reponse } });
      if (reponse === "examinee" && r.href) {
        if (r.achat) retenirContexteAchat({ achatId: r.achat.id, titre: r.achat.titre });
        router.push(r.href);
        return;
      }
      reload();
    } finally {
      setPending(null);
    }
  }

  return (
    <section aria-label="Mes rapprochements" className="flex flex-col gap-3">
      <h2 className="text-[17px] font-extrabold">Mes rapprochements</h2>
      {data.lignes.map((l) => (
        <article key={l.id} aria-label={`Rapprochement : ${l.libelle}`} className="flex flex-col gap-2.5 rounded-xl bg-surface p-4 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-[16px] font-bold">{l.libelle}</p>
            <Badge tone={l.statut === "proposee" ? "warn" : "neutral"}>{ETAT_LIGNE[l.statut]}</Badge>
          </div>
          <p className="text-[13px] text-muted">
            {l.statut === "retiree" && l.retraitMotif ? `Retirée : ${MOTIF_RETRAIT[l.retraitMotif] ?? l.retraitMotif}` : `Recherche jusqu'au ${jourCourt(l.jusquau)}`}
          </p>
          {l.propositions.map((p) => (
            <div key={p.id} className="flex flex-col gap-2 rounded-lg border border-line p-3">
              <p className="text-[15px] font-semibold">
                {p.libelleNiveau}
                {p.collecte ? ` · collecte « ${p.collecte.titre} », clôture le ${jourCourt(p.collecte.clotureLe)}` : " · un besoin d'un autre artisan"}
              </p>
              {p.differences.length > 0 ? (
                <ul aria-label="Différences" className="list-disc pl-5 text-[14px]">
                  {p.differences.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-[14px]">Mêmes caractéristiques essentielles.</p>
              )}
              <p className="text-[13px] text-muted">
                {p.zone} · {p.entreprises}
                {p.total ? ` · ${p.total}` : ""}
              </p>
              {p.reponse === "refusee" ? (
                <p className="text-[14px] text-muted">Tu n&apos;es pas intéressé.</p>
              ) : l.statut === "proposee" || l.statut === "disponible" ? (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void repondre(p, "examinee")} pending={pending === p.id}>
                    Examiner le rapprochement
                  </Button>
                  <Button variant="secondary" onClick={() => void repondre(p, "refusee")} disabled={pending === p.id}>
                    Pas intéressé
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </article>
      ))}
    </section>
  );
}
