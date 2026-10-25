"use client";

import { useCallback, useState } from "react";
import { Button, Card } from "@/components/ui";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/**
 * LES HYPOTHÈSES DE LANCEMENT (Greg, 25 octobre 2026), par zone et par mois : taux de réponse perso et groupe et délai
 * moyen, part des demandes qui finissent en commande, passage gratuit → payant et résiliations, regroupements formés,
 * consultés, commandés, écart moyen entre prix de groupe et dernier prix perso. Puis le coût IA par compte gratuit
 * (alerte au-dessus de 3 $) et l'interrupteur qui coupe les inscriptions gratuites.
 */
interface Indicateurs {
  zone: string;
  mois: string;
  tauxReponsePerso: number | null;
  tauxReponseGroupe: number | null;
  delaiMoyenPersoHeures: number | null;
  delaiMoyenGroupeHeures: number | null;
  tauxCommande: number | null;
  tauxPassagePayant: number | null;
  tauxResiliation: number | null;
  regroupements: { formes: number; consultes: number; commandes: number };
  ecartMoyenPrixGroupe: number | null;
}

/** Business model final (25 octobre 2026) : les regroupements négociés par un chasseur, le mois en cours. */
interface IndicateursNegocie {
  formes: number;
  prisEnCharge: number;
  avecOffre: number;
  commandes: number;
  tauxAcceptation: number | null;
  commissionHt: number;
}

const pc = (t: number | null) => (t == null ? "—" : `${Math.round(t * 100)} %`);
const h = (n: number | null) => (n == null ? "—" : `${n.toLocaleString("fr-FR")} h`);
const ecart = (t: number | null) => (t == null ? "—" : `${t > 0 ? "+" : ""}${(t * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`);
const moisFr = (m: string) => new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m.slice(0, 7)}-01T00:00:00Z`));

function Titre({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">{children}</h2>;
}

export function HypothesesCarte() {
  const charger = useCallback((signal: AbortSignal) => api<{ mois: Indicateurs[]; negocie?: IndicateursNegocie }>("/v1/admin/pilotage/hypotheses", { signal }), []);
  const { data } = useResource(charger);
  if (!data) return null;
  const n = data.negocie;
  return (
    <section aria-label="Hypothèses de lancement" className="flex flex-col gap-1">
      <Titre>Hypothèses de lancement</Titre>
      {n ? (
        <Card className="flex flex-col gap-2 p-4">
          <p className="text-[16px] font-extrabold">Regroupements négociés · ce mois</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[14px]">
            <dt className="text-muted">Formés / pris en charge</dt>
            <dd className="text-right font-semibold tabular-nums">
              {n.formes} / {n.prisEnCharge}
            </dd>
            <dt className="text-muted">Avec offre / commandés</dt>
            <dd className="text-right font-semibold tabular-nums">
              {n.avecOffre} / {n.commandes}
            </dd>
            <dt className="text-muted">Offres acceptées</dt>
            <dd className="text-right font-semibold tabular-nums">{pc(n.tauxAcceptation)}</dd>
            <dt className="text-muted">Commission du mois</dt>
            <dd className="text-right font-semibold tabular-nums">{n.commissionHt.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT</dd>
          </dl>
        </Card>
      ) : null}
      {data.mois.length === 0 ? (
        <Card className="p-4">
          <p className="text-[15px] text-muted">Pas encore de chiffres.</p>
        </Card>
      ) : (
        data.mois.map((i) => (
          <Card key={`${i.zone}-${i.mois}`} className="flex flex-col gap-2 p-4">
            <p className="text-[16px] font-extrabold">
              Zone {i.zone} · {moisFr(i.mois)}
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[14px]">
              <dt className="text-muted">Réponse perso</dt>
              <dd className="text-right font-semibold tabular-nums">
                {pc(i.tauxReponsePerso)} · {h(i.delaiMoyenPersoHeures)}
              </dd>
              <dt className="text-muted">Réponse groupe</dt>
              <dd className="text-right font-semibold tabular-nums">
                {pc(i.tauxReponseGroupe)} · {h(i.delaiMoyenGroupeHeures)}
              </dd>
              <dt className="text-muted">Demandes commandées</dt>
              <dd className="text-right font-semibold tabular-nums">{pc(i.tauxCommande)}</dd>
              <dt className="text-muted">Gratuit → payant</dt>
              <dd className="text-right font-semibold tabular-nums">{pc(i.tauxPassagePayant)}</dd>
              <dt className="text-muted">Résiliations</dt>
              <dd className="text-right font-semibold tabular-nums">{pc(i.tauxResiliation)}</dd>
              <dt className="text-muted">Regroupements formés / consultés / commandés</dt>
              <dd className="text-right font-semibold tabular-nums">
                {i.regroupements.formes} / {i.regroupements.consultes} / {i.regroupements.commandes}
              </dd>
              <dt className="text-muted">Prix de groupe vs dernier prix perso</dt>
              <dd className="text-right font-semibold tabular-nums">{ecart(i.ecartMoyenPrixGroupe)}</dd>
            </dl>
          </Card>
        ))
      )}
    </section>
  );
}

export function CoutIaGratuitsCarte() {
  const charger = useCallback((signal: AbortSignal) => api<{ seuilUsd: number; comptes: { companyId: string; entreprise: string; usd: number; alerte: boolean }[] }>("/v1/admin/pilotage/cout-ia-gratuits", { signal }), []);
  const { data } = useResource(charger);
  if (!data) return null;
  return (
    <section aria-label="Coût IA des comptes gratuits" className="flex flex-col gap-1">
      <Titre>Coût IA des comptes gratuits (ce mois)</Titre>
      <Card className="flex flex-col gap-1 px-4 py-2">
        {data.comptes.length === 0 ? <p className="py-2 text-[15px] text-muted">Aucun appel IA d&apos;un compte gratuit ce mois.</p> : null}
        <ul className="divide-y divide-line">
          {data.comptes.map((c) => (
            <li key={c.companyId} className="flex min-h-12 items-center justify-between gap-3 py-2 text-[15px]">
              <span>{c.entreprise}</span>
              <span className={`font-extrabold tabular-nums ${c.alerte ? "text-danger" : ""}`}>
                {c.usd.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} ${c.alerte ? " · au-dessus du seuil" : ""}
              </span>
            </li>
          ))}
        </ul>
        <p className="pb-2 text-[13px] text-muted">Alerte au-dessus de {data.seuilUsd} $ par compte gratuit et par mois.</p>
      </Card>
    </section>
  );
}

export function InscriptionsCarte() {
  const charger = useCallback((signal: AbortSignal) => api<{ gratuitesOuvertes: boolean }>("/v1/admin/pilotage/inscriptions", { signal }), []);
  const { data, setData } = useResource(charger);
  const [pending, setPending] = useState(false);
  if (!data) return null;
  async function basculer() {
    setPending(true);
    try {
      setData(await api<{ gratuitesOuvertes: boolean }>("/v1/admin/pilotage/inscriptions", { method: "PUT", body: { gratuitesOuvertes: !data!.gratuitesOuvertes } }));
    } finally {
      setPending(false);
    }
  }
  return (
    <section aria-label="Inscriptions gratuites" className="flex flex-col gap-1">
      <Titre>Inscriptions gratuites</Titre>
      <Card className="flex flex-col gap-3 p-4">
        <p className="text-[15px] font-semibold">{data.gratuitesOuvertes ? "Ouvertes : tout le monde peut créer un compte." : "Fermées : aucune nouvelle inscription."}</p>
        <Button variant="secondary" onClick={() => void basculer()} pending={pending} className="self-start">
          {data.gratuitesOuvertes ? "Couper les inscriptions" : "Rouvrir les inscriptions"}
        </Button>
      </Card>
    </section>
  );
}

/** L'interrupteur du mode des regroupements : « humain » (défaut, un chasseur négocie) ou « automatique » (consultation par cycle). */
export function ModeRegroupementCarte() {
  const charger = useCallback((signal: AbortSignal) => api<{ mode: "humain" | "automatique" }>("/v1/admin/pilotage/mode-regroupement", { signal }), []);
  const { data, reload } = useResource(charger);
  const [pending, setPending] = useState(false);
  if (!data) return null;
  async function changer(mode: "humain" | "automatique") {
    setPending(true);
    try {
      await api("/v1/admin/pilotage/mode-regroupement", { method: "PUT", body: { mode } });
      reload();
    } finally {
      setPending(false);
    }
  }
  return (
    <section aria-label="Mode des regroupements" className="flex flex-col gap-1">
      <Titre>Mode des regroupements</Titre>
      <Card className="flex flex-col gap-3 p-4">
        <div role="radiogroup" aria-label="Mode des regroupements" className="grid grid-cols-2 gap-2">
          {(
            [
              ["humain", "Humain (chasseur)"],
              ["automatique", "Automatique"],
            ] as const
          ).map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={data.mode === v} disabled={pending} onClick={() => void changer(v)} className={`min-h-12 rounded-xl border-2 px-3 text-[15px] font-semibold ${data.mode === v ? "border-ink bg-accent-soft" : "border-line bg-surface text-muted"}`}>
              {l}
            </button>
          ))}
        </div>
        <p className="text-[14px] text-muted">Humain : les artisans déclarent leurs besoins, un chasseur d&apos;opportunités négocie au téléphone. Automatique : la consultation des négoces par cycle.</p>
        <a href="/admin/chasseur" className="min-h-11 self-start py-2 text-[14px] font-semibold text-accent-text underline">
          Ouvrir l&apos;écran du chasseur
        </a>
      </Card>
    </section>
  );
}

interface NegoceAVerifier {
  id: string;
  enseigne: string;
  raisonSociale: string | null;
  email: string;
  siret: string | null;
  naf: string | null;
  verification: "valide" | "a_verifier" | "bloque";
  telephone: string | null;
  departements: string[];
  nouveau: boolean;
}

/** Les négoces inscrits : « à vérifier » (e-mail hors domaine, API en panne), le badge « Nouveau négoce », valider ou bloquer d'un clic. */
export function NegocesAVerifierCarte() {
  const charger = useCallback((signal: AbortSignal) => api<{ negoces: NegoceAVerifier[] }>("/v1/admin/pilotage/negoces-a-verifier", { signal }), []);
  const { data, reload } = useResource(charger);
  const [pending, setPending] = useState<string | null>(null);
  if (!data) return null;
  const visibles = data.negoces.filter((n) => n.verification !== "valide" || n.nouveau);
  async function decider(id: string, geste: "valider" | "bloquer") {
    setPending(`${id}:${geste}`);
    try {
      await api(`/v1/admin/pilotage/negoces/${id}/${geste}`, { method: "POST" });
      reload();
    } finally {
      setPending(null);
    }
  }
  return (
    <section aria-label="Négoces à vérifier" className="flex flex-col gap-1">
      <Titre>Négoces à vérifier</Titre>
      {visibles.length === 0 ? (
        <Card className="p-4">
          <p className="text-[15px] text-muted">Rien à vérifier.</p>
        </Card>
      ) : (
        visibles.map((n) => (
          <Card key={n.id} className="flex flex-col gap-2 p-4">
            <p className="flex flex-wrap items-center gap-2 text-[16px] font-extrabold">
              {n.enseigne}
              {n.nouveau ? <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-bold">Nouveau négoce</span> : null}
              {n.verification === "a_verifier" ? <span className="rounded-full bg-warn-bg px-2 py-0.5 text-[12px] font-bold text-warn">À vérifier</span> : null}
              {n.verification === "bloque" ? <span className="rounded-full bg-danger-bg px-2 py-0.5 text-[12px] font-bold text-danger">Bloqué</span> : null}
            </p>
            <p className="text-[14px] text-muted">
              {n.raisonSociale ?? "Raison sociale inconnue"} · SIRET {n.siret ?? "—"} · NAF {n.naf ?? "—"} · {n.email} · {n.departements.join(", ")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {n.verification !== "valide" ? (
                <Button variant="secondary" pending={pending === `${n.id}:valider`} disabled={pending !== null} onClick={() => void decider(n.id, "valider")}>
                  Valider
                </Button>
              ) : null}
              {n.verification !== "bloque" ? (
                <Button variant="secondary" pending={pending === `${n.id}:bloquer`} disabled={pending !== null} onClick={() => void decider(n.id, "bloquer")}>
                  Bloquer
                </Button>
              ) : null}
            </div>
          </Card>
        ))
      )}
      <a href="/v1/admin/pilotage/observatoire.csv" download="observatoire-prix.csv" className="min-h-11 self-start py-2 text-[14px] font-semibold text-accent-text underline">
        Exporter l&apos;observatoire des prix (CSV, sans identifiant)
      </a>
    </section>
  );
}
