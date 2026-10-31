"use client";

import Link from "next/link";
import { BadgeCheck, ChevronRight, Tags } from "lucide-react";
import { useCallback, useState } from "react";
import { Button, Card, SectionTitle } from "@/components/ui";
import { api, messageErreur } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/**
 * LE PROFIL ET L'ACHAT GROUPÉ (Greg, 27 octobre 2026, points 2, 9 et 10) : le SIRET vérifié (code d'activité du bâtiment)
 * pour lancer ou rejoindre, le réglage des alertes « Nouvel achat groupé », et « Mes prix » qui passe dans Profil.
 */
export function CarteSiretAchatGroupe() {
  const fetcher = useCallback((signal: AbortSignal) => api<{ siret: { renseigne: boolean; verifie: boolean } }>("/v1/groupe", { signal }).catch(() => null), []);
  const { data, reload } = useResource(fetcher);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!data) return null;
  async function verifier() {
    setPending(true);
    setMessage(null);
    try {
      const r = await api<{ verifie: boolean; statut: string; message?: string }>("/v1/groupe/siret", { method: "POST" });
      setMessage(r.verifie ? "SIRET vérifié : tu peux lancer et rejoindre des achats groupés." : (r.message ?? "Ce SIRET n'a pas pu être vérifié. Corrige-le dans tes coordonnées, puis réessaie."));
      reload();
    } catch (e) {
      setMessage(messageErreur(e));
    } finally {
      setPending(false);
    }
  }
  return (
    <Card className="flex flex-col gap-3 p-4" aria-label="SIRET pour les achats groupés">
      <SectionTitle>Achats groupés</SectionTitle>
      {data.siret.verifie ? (
        <p className="flex items-center gap-2 text-[15px] font-semibold text-ok">
          <BadgeCheck size={18} aria-hidden="true" /> SIRET vérifié
        </p>
      ) : (
        <>
          <p className="text-[15px] text-muted">Pour lancer ou rejoindre un achat groupé, ton SIRET est vérifié (entreprise du bâtiment).</p>
          <Button variant="secondary" pending={pending} disabled={!data.siret.renseigne} onClick={() => void verifier()}>
            Vérifier mon SIRET
          </Button>
          {!data.siret.renseigne ? <p className="text-[14px] text-muted">Renseigne d&apos;abord ton SIRET dans tes coordonnées.</p> : null}
        </>
      )}
      {message ? (
        <p role="status" className="text-[15px] font-semibold">
          {message}
        </p>
      ) : null}
    </Card>
  );
}

type Reglage = "toutes" | "resume" | "aucune";

export function CarteAlertesAchats() {
  const fetcher = useCallback((signal: AbortSignal) => api<{ reglage: Reglage; choix: { valeur: Reglage; libelle: string }[] }>("/v1/me/alertes-achats-groupes", { signal }).catch(() => null), []);
  const { data, setData } = useResource(fetcher);
  if (!data) return null;
  async function choisir(reglage: Reglage) {
    const r = await api<typeof data>("/v1/me/alertes-achats-groupes", { method: "PUT", body: { reglage } }).catch(() => null);
    if (r) setData(r);
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <SectionTitle>Alertes « Nouvel achat groupé »</SectionTitle>
      <p className="text-[14px] text-muted">Quand une entreprise de ton métier et de ton secteur lance un achat groupé. Deux par jour au plus ; les autres arrivent dans le résumé.</p>
      <div role="radiogroup" aria-label="Alertes des achats groupés" className="grid gap-2">
        {data.choix.map((c) => (
          <button key={c.valeur} type="button" role="radio" aria-checked={data.reglage === c.valeur} onClick={() => void choisir(c.valeur)} className={`min-h-12 rounded-xl border-2 px-4 text-left text-[15px] font-semibold ${data.reglage === c.valeur ? "border-ink bg-accent-soft" : "border-line bg-surface text-muted"}`}>
            {c.libelle}
          </button>
        ))}
      </div>
    </Card>
  );
}

export function LienMesPrix() {
  return (
    <Link href="/mes-prix" className="pressable flex min-h-14 items-center gap-3 rounded-xl bg-surface px-4 shadow-card">
      <Tags size={20} aria-hidden="true" className="text-muted" />
      <span className="grow text-[16px] font-semibold">Mes prix</span>
      <ChevronRight size={18} aria-hidden="true" className="text-muted" />
    </Link>
  );
}
