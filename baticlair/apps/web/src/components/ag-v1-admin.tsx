"use client";

import { useCallback, useState } from "react";
import { CARTE } from "@/components/ag-v1-commun";
import { Button, INPUT, PageTitle, Skeleton } from "@/components/ui";
import { api, messageErreur } from "@/lib/api";
import { heureCourte } from "@/lib/ag-v1";
import { useResource } from "@/lib/use-resource";

interface AchatAdmin {
  id: string;
  numero: number;
  nom: string;
  zone: string;
  reception: string;
  statut: string;
  dateBesoin: string;
  ouvertJusquau: string;
  reconfirmerAvant: string | null;
  volumes: { entreprises: number; confirmes: number; reconfirmes: number; indicatifs: number; transmis: number };
  volumeTransmis: number | null;
}

const OFFRE_VIDE = { fournisseur: "", prixUnitaireHt: "", livraisonHt: "", delai: "", lieu: "", paiement: "", validite: "", annulation: "" };

/**
 * L'ADMIN DES ACHATS GROUPÉS V1 (local) : préparer la consultation, clôturer après l'heure, saisir l'offre. Aucun envoi
 * réel aux négoces : l'offre est saisie à la main pour les tests.
 */
export function AdminAchatsGroupesV1() {
  const { data, error, reload } = useResource(useCallback((s: AbortSignal) => api<{ achats: AchatAdmin[]; retraitsTardifs: { companyId: string; nombre: number; suivi: string }[] }>("/v1/admin/ag/achats", { signal: s }), []));
  const [msg, setMsg] = useState<string | null>(null);
  const [offre, setOffre] = useState<Record<string, typeof OFFRE_VIDE>>({});
  async function faire(chemin: string, body: unknown = {}, methode: "POST" | "PUT" = "POST") {
    setMsg(null);
    try {
      await api(`/v1/admin/ag/${chemin}`, { method: methode, body });
      reload();
    } catch (e) {
      setMsg(messageErreur(e));
    }
  }
  if (error) return <p role="alert" className="text-[16px] font-semibold text-danger">{messageErreur(error)}</p>;
  if (!data) return <Skeleton card="h-40" label="Chargement…" />;
  return (
    <div className="flex flex-col gap-4">
      <PageTitle>Achats groupés V1</PageTitle>
      <p className="text-[15px] text-muted">Local seulement : aucun e-mail aux négoces, aucune commande. L&apos;offre se saisit ici pour tester « Offre à examiner ».</p>
      {msg ? <p role="alert" className="text-[15px] font-semibold text-danger">{msg}</p> : null}
      {data.retraitsTardifs.length ? <p className="text-[15px]">Retraits tardifs à suivre : {data.retraitsTardifs.map((r) => `${r.nombre} (${r.suivi === "rappel" ? "rappel" : "vérification manuelle"})`).join(", ")}</p> : null}
      <ul className="flex flex-col gap-3">
        {data.achats.map((a) => {
          const o = offre[a.id] ?? OFFRE_VIDE;
          const num = (v: string) => (v.trim() ? Number(v.replace(",", ".")) : null);
          return (
            <li key={a.id} className={`${CARTE} flex flex-col gap-2 p-4`}>
              <p className="text-[16px] font-bold">
                N° {a.numero} · {a.nom}
              </p>
              <p className="text-[14px] text-muted">
                {a.zone} · {a.reception} · statut {a.statut}
                {a.reconfirmerAvant ? ` · reconfirmer avant le ${heureCourte(a.reconfirmerAvant)}` : ""}
              </p>
              <p className="text-[14px]">
                {a.volumes.entreprises} entreprise(s) · confirmés {a.volumes.confirmes} · reconfirmés {a.volumes.reconfirmes} · indicatifs {a.volumes.indicatifs} · transmis {a.volumeTransmis ?? 0}
              </p>
              <div className="flex flex-wrap gap-2">
                {a.statut === "ouvert" ? <Button variant="secondary" onClick={() => void faire(`achats/${a.id}/preparation`, { heures: 72 })}>Préparer la consultation (72 h)</Button> : null}
                {a.statut === "preparation" ? <Button variant="secondary" onClick={() => void faire(`achats/${a.id}/cloture`, {})}>Clôturer</Button> : null}
                {a.statut === "preparation" ? <Button variant="ghost" onClick={() => void faire(`achats/${a.id}/cloture`, { avantLHeure: true })}>Clôturer maintenant (test local)</Button> : null}
                {["consultation", "offre_verification", "offre_a_examiner"].includes(a.statut) ? <Button variant="ghost" onClick={() => void faire(`achats/${a.id}/renegociation`)}>Renégociation nécessaire</Button> : null}
                {a.statut !== "annule" ? <Button variant="ghost" onClick={() => void faire(`achats/${a.id}/annulation`)}>Annuler</Button> : null}
              </div>
              {["consultation", "offre_verification", "renegociation"].includes(a.statut) ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {(Object.keys(OFFRE_VIDE) as (keyof typeof OFFRE_VIDE)[]).map((k) => (
                    <input key={k} aria-label={k} placeholder={k} value={o[k]} onChange={(e) => setOffre((x) => ({ ...x, [a.id]: { ...o, [k]: e.target.value } }))} className={INPUT} />
                  ))}
                  <Button onClick={() => void faire(`achats/${a.id}/offre`, { ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.trim() || null])), prixUnitaireHt: num(o.prixUnitaireHt), livraisonHt: num(o.livraisonHt) }, "PUT")}>Enregistrer l&apos;offre</Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
