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

const pc = (t: number | null) => (t == null ? "—" : `${Math.round(t * 100)} %`);
const h = (n: number | null) => (n == null ? "—" : `${n.toLocaleString("fr-FR")} h`);
const ecart = (t: number | null) => (t == null ? "—" : `${t > 0 ? "+" : ""}${(t * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`);
const moisFr = (m: string) => new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m.slice(0, 7)}-01T00:00:00Z`));

function Titre({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">{children}</h2>;
}

export function HypothesesCarte() {
  const charger = useCallback((signal: AbortSignal) => api<{ mois: Indicateurs[] }>("/v1/admin/pilotage/hypotheses", { signal }), []);
  const { data } = useResource(charger);
  if (!data) return null;
  return (
    <section aria-label="Hypothèses de lancement" className="flex flex-col gap-1">
      <Titre>Hypothèses de lancement</Titre>
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
