"use client";

import { useCallback, useEffect, useState } from "react";
import { CodeAdmin } from "@/components/code-admin";
import { BackButton, Badge, Button, Card, ErrorNotice, Field, PageTitle, SectionTitle, Spinner } from "@/components/ui";
import { api, ApiError, messageErreur } from "@/lib/api";
import { dateFr, eurosHt, quantite, type AdminAchats } from "@/lib/achat-groupe";
import { useResource } from "@/lib/use-resource";

/**
 * L'ADMIN DES ACHATS GROUPÉS (Greg, 27 octobre 2026) : tous les achats et leurs offres, ceux sans réponse 48 h après
 * l'envoi (avec les contacts des négoces, plan B), les offres douteuses (jamais mises en avant ; « Valider » après
 * vérification), les désistements, les comptes qui rejoignent sans jamais commander, les factures de commission du mois
 * (préparées, envoi réel coupé), le volume minimum par famille.
 */
const asError = (e: unknown) => (e instanceof ApiError ? e : new ApiError("internal_error", 500));

export default function AdminAchatsGroupesPage() {
  const [statut, setStatut] = useState<{ admin: boolean; deuxFacteurs: boolean } | null>(null);
  const [erreur, setErreur] = useState<ApiError | null>(null);
  useEffect(() => {
    const c = new AbortController();
    api<{ admin: boolean; deuxFacteurs: boolean }>("/v1/admin/pilotage/statut", { signal: c.signal }).then(setStatut, (e: unknown) => setErreur(asError(e)));
    return () => c.abort();
  }, []);
  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/admin/pilotage" />
      <PageTitle>Achats groupés</PageTitle>
      {erreur ? <ErrorNotice error={erreur} /> : null}
      {!statut && !erreur ? <Spinner /> : null}
      {statut && !statut.admin ? <Card className="p-5 text-[16px]">Cette page est réservée à l&apos;équipe Mobiiz.</Card> : null}
      {statut?.admin && !statut.deuxFacteurs ? <CodeAdmin quoi="l'espace admin" onOk={() => setStatut({ admin: true, deuxFacteurs: true })} /> : null}
      {statut?.deuxFacteurs ? <Tableau /> : null}
    </div>
  );
}

function Tableau() {
  const fetcher = useCallback((signal: AbortSignal) => api<AdminAchats>("/v1/admin/pilotage/achats-groupes", { signal }), []);
  const { data, error, reload } = useResource(fetcher);
  const [famille, setFamille] = useState("couverture");
  const [montant, setMontant] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  async function valider(id: string) {
    try {
      await api(`/v1/admin/pilotage/achats-groupes/consultations/${id}/valider`, { method: "POST" });
      reload();
    } catch (e) {
      setMsg(messageErreur(e));
    }
  }
  async function avancer(id: string, etape: "cloture" | "echeance") {
    try {
      await api(`/v1/admin/pilotage/achats-groupes/${id}/avancer`, { method: "POST", body: { etape } });
      setMsg(etape === "cloture" ? "Clôturé : les demandes sont parties chez les négoces." : "Offres analysées.");
      reload();
    } catch (e) {
      setMsg(messageErreur(e));
    }
  }
  async function volume() {
    try {
      await api("/v1/admin/pilotage/achats-groupes/volume-min", { method: "PUT", body: { famille, montantHt: Number(montant.replace(",", ".")) } });
      setMsg("Volume minimum enregistré.");
      reload();
    } catch (e) {
      setMsg(messageErreur(e));
    }
  }
  return (
    <div className="flex flex-col gap-6">
      {msg ? (
        <p role="status" className="rounded-xl bg-ground p-3 font-semibold">
          {msg}
        </p>
      ) : null}
      <section aria-label="Sans réponse" className="flex flex-col gap-3">
        <SectionTitle>Sans réponse 48 h après l&apos;envoi ({data.sansReponse.length})</SectionTitle>
        {data.sansReponse.map((a) => (
          <Card key={a.id} className="flex flex-col gap-2 p-4">
            <p className="font-bold">
              n° {a.numero} · {a.libelle} · {a.departement}
            </p>
            {a.negoces.map((n) => (
              <p key={n.email} className="text-[15px]">
                {n.nom} · {n.email}
                {n.telephone ? (
                  <>
                    {" · "}
                    <a href={`tel:${n.telephone.replace(/[^\d+]/g, "")}`} className="underline">
                      {n.telephone}
                    </a>
                  </>
                ) : null}
              </p>
            ))}
          </Card>
        ))}
      </section>
      <section aria-label="Offres douteuses" className="flex flex-col gap-3">
        <SectionTitle>Offres douteuses ({data.douteuses.length})</SectionTitle>
        {data.douteuses.map((d) => (
          <Card key={d.consultationId} className="flex flex-col gap-2 p-4">
            <p className="font-bold">
              n° {d.numero} · {d.libelle} · {d.nom}
            </p>
            <p className="text-[15px]">{d.prixUnitaireHt !== null ? `${eurosHt(d.prixUnitaireHt)} / unité` : "Prix non lu"}</p>
            <ul className="list-disc pl-5 text-[14px] text-muted">
              {d.raisons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {d.pdf ? (
              <a href={`/v1/admin/pilotage/achats-groupes/consultations/${d.consultationId}/devis.pdf`} className="text-[15px] font-semibold underline">
                Ouvrir le devis
              </a>
            ) : null}
            <Button variant="secondary" disabled={d.prixUnitaireHt === null} onClick={() => void valider(d.consultationId)}>
              Valider après vérification
            </Button>
          </Card>
        ))}
      </section>
      <section aria-label="Désistements" className="flex flex-col gap-3">
        <SectionTitle>Désistements et retraits ({data.desistements.length})</SectionTitle>
        <Card className="flex flex-col divide-y divide-line p-2">
          {data.desistements.map((d) => (
            <p key={d.id} className="px-2 py-2 text-[15px]">
              {dateFr(d.le)} · {d.entreprise} · {d.achat} · {quantite(d.quantite)} · <Badge tone={d.apresCloture ? "warn" : "neutral"}>{d.apresCloture ? "après la clôture" : "avant la clôture"}</Badge>
              {d.raison ? ` · « ${d.raison} »` : ""}
            </p>
          ))}
        </Card>
      </section>
      <section aria-label="À surveiller" className="flex flex-col gap-3">
        <SectionTitle>Rejoignent sans commander ({data.suspects.length})</SectionTitle>
        {data.suspects.map((s) => (
          <p key={s.companyId} className="text-[15px]">
            {s.entreprise} · SIRET {s.siret ?? "—"} · NAF {s.naf ?? "—"} · {s.participations} participations, {s.commandes} commande
          </p>
        ))}
      </section>
      <section aria-label="Factures de commission" className="flex flex-col gap-3">
        <SectionTitle>Factures de commission (envoi réel coupé)</SectionTitle>
        {data.factures.map((f) => (
          <p key={f.id} className="text-[15px]">
            {f.mois} · {f.negoceNom} · {eurosHt(f.totalHt)} commandés · commission {eurosHt(f.commissionHt)} · {f.envoyeeLe ? "envoyée" : "préparée"}
          </p>
        ))}
      </section>
      <section aria-label="Volume minimum" className="flex flex-col gap-3">
        <SectionTitle>Volume minimum par famille (€ HT estimés)</SectionTitle>
        <p className="text-[15px]">
          {Object.entries(data.volumesMin)
            .map(([k, v]) => `${k} : ${v.toLocaleString("fr-FR")} €`)
            .join(" · ")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Field id="famille" label="Famille" value={famille} onChange={(e) => setFamille(e.target.value)} />
          <Field id="montant" label="Montant HT" inputMode="decimal" value={montant} onChange={(e) => setMontant(e.target.value)} />
        </div>
        <Button variant="secondary" disabled={!montant.trim()} onClick={() => void volume()}>
          Enregistrer
        </Button>
      </section>
      <section aria-label="Tous les achats groupés" className="flex flex-col gap-3">
        <SectionTitle>Tous les achats groupés ({data.achats.length})</SectionTitle>
        {data.achats.map((a) => (
          <Card key={a.id} className="flex flex-col gap-1 p-4">
            <p className="font-bold">
              n° {a.numero} · {a.libelle} · {a.departement} · {a.statut}
            </p>
            <p className="text-[14px] text-muted">
              {a.entreprises} entreprise{a.entreprises > 1 ? "s" : ""} · {quantite(a.quantite)} {a.unite} · {a.estimeHt !== null ? `≈ ${eurosHt(a.estimeHt)}` : "sans estimation"} · clôture {dateFr(a.clotureLe)}
            </p>
            {a.consultations.map((c) => (
              <p key={c.id} className="text-[14px]">
                {c.nom} : {c.statut}
                {c.prixUnitaireHt !== null ? ` · ${eurosHt(c.prixUnitaireHt)}` : ""}
              </p>
            ))}
            {/* Recette en prévisualisation (refusé en production par l'API). */}
            {a.statut === "en_collecte" || a.statut === "consultation" ? (
              <Button variant="secondary" onClick={() => void avancer(a.id, a.statut === "en_collecte" ? "cloture" : "echeance")}>
                {a.statut === "en_collecte" ? "Clôturer maintenant (test)" : "Analyser les offres maintenant (test)"}
              </Button>
            ) : null}
          </Card>
        ))}
      </section>
    </div>
  );
}
