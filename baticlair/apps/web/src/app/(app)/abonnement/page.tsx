"use client";

import { useCallback, useState } from "react";
import { ContenuPaywall, continuerAbonnement, useAbonnement } from "@/components/abonnement";
import { OffresAbonnement } from "@/components/offres-abonnement";
import { BackButton, Button, Card, ErrorNotice, PageTitle, Spinner } from "@/components/ui";
import { api, ApiError, type Abonnement, type FactureAbonnement, type Formule } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

const date = (iso: string | null) => (iso ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso)) : "");
const asError = (e: unknown) => (e instanceof ApiError ? e : new ApiError("internal_error", 500));

/**
 * « MON ABONNEMENT » ET « MES FACTURES » (Greg, 24 octobre 2026) : l'état (essai, abonné, paiement refusé, terminé), « Je
 * continue », la résiliation en deux clics (effet en fin de période), le n° de TVA, et les factures émises par BATI INVEST.
 * Deux formules (Greg, 24 octobre 2026) : le choix à l'abonnement, et le passage du mensuel à l'annuel à tout moment, au
 * prorata.
 */
export default function AbonnementPage() {
  const { data, setData, error, reload } = useAbonnement();
  const [onglet, setOnglet] = useState<"abonnement" | "factures">("abonnement");
  return (
    <div className="flex flex-col gap-4">
      <BackButton fallback="/compte" />
      <PageTitle>Mon abonnement</PageTitle>
      {data?.modeTest ? (
        <p role="status" className="rounded-xl bg-danger px-4 py-3 text-[15px] font-bold text-white">
          {data.modeTest}
        </p>
      ) : null}
      <div role="tablist" aria-label="Abonnement" className="flex gap-2">
        {(["abonnement", "factures"] as const).map((o) => (
          <button
            key={o}
            type="button"
            role="tab"
            aria-selected={onglet === o}
            onClick={() => setOnglet(o)}
            className={`min-h-11 rounded-full px-4 text-[15px] font-semibold ${onglet === o ? "bg-ink text-white" : "border border-line bg-surface text-ink"}`}
          >
            {o === "abonnement" ? "Mon abonnement" : "Mes factures"}
          </button>
        ))}
      </div>
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {!data && !error ? <Spinner /> : null}
      {data && onglet === "abonnement" ? <Etat abonnement={data} onChange={setData} /> : null}
      {onglet === "factures" ? <Factures /> : null}
    </div>
  );
}

function Etat({ abonnement: a, onChange }: { abonnement: Abonnement; onChange: (a: Abonnement) => void }) {
  const [confirmer, setConfirmer] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [tva, setTva] = useState(a.tvaIntra ?? "");
  const [formule, setFormule] = useState<Formule>("annuel");
  const [passer, setPasser] = useState(false);
  async function run(cle: string, f: () => Promise<Abonnement | void>) {
    setPending(cle);
    setError(null);
    try {
      const r = await f();
      if (r) onChange(r);
    } catch (e) {
      setError(asError(e));
    } finally {
      setPending(null);
    }
  }
  if (!a.actif) return <Card className="p-5 text-[16px]">Tout est ouvert : aucun abonnement n&apos;est demandé pour l&apos;instant.</Card>;
  if (a.acces === "bloque") {
    return (
      <Card className="p-5">
        <ContenuPaywall abonnement={a} onFermer={() => history.back()} />
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {error ? <ErrorNotice error={error} /> : null}
      <Card className="flex flex-col gap-3 p-5">
        {a.acces === "essai" ? (
          <>
            <p className="text-[20px] font-extrabold">Essai gratuit</p>
            <p className="text-[16px]">
              {a.essaiFinLe ? `Jusqu'au ${date(a.essaiFinLe)}.` : "Jusqu'à 30 jours après les résultats de ta première commande commune."} Ensuite, dès {a.prixDes} HT par mois.
            </p>
            <OffresAbonnement offres={a.offres} choisie={formule} onChoisir={setFormule} />
            <Button variant="secondary" onClick={() => void run("payer", () => continuerAbonnement(formule))} pending={pending === "payer"} className="self-start">
              M&apos;abonner dès maintenant
            </Button>
          </>
        ) : null}
        {a.acces === "grace" ? (
          <>
            <p className="text-[20px] font-extrabold text-danger">Paiement refusé</p>
            <p className="text-[16px]">{a.bandeau}</p>
            <Button onClick={() => void run("payer", a.paiement === "stripe" ? async () => window.location.assign((await api<{ url: string }>("/v1/abonnement/portail", { method: "POST" })).url) : () => continuerAbonnement(a.formule))} pending={pending === "payer"} className="self-start">
              Mettre à jour ma carte
            </Button>
          </>
        ) : null}
        {a.acces === "abonne" ? (
          <>
            <p className="text-[20px] font-extrabold">{a.formule === "annuel" ? "Abonné à l'année" : "Abonné au mois"}</p>
            <p className="text-[16px]">
              {a.formule === "annuel" ? `${a.prixHt} HT par an (${a.prixTtc} TTC), payé en une fois, renouvelé chaque année.` : `${a.prixHt} HT par mois (${a.prixTtc} TTC), sans engagement.`}
            </p>
            {a.resiliationProgrammee || a.statut === "resilie" ? (
              <p className="text-[16px] font-semibold">Résilié : ton accès reste jusqu&apos;au {date(a.periodeFin)}. Rien ne sera plus prélevé.</p>
            ) : (
              <>
                <p className="text-[16px] text-muted">
                  Prochain renouvellement le {date(a.periodeFin)}.{a.formule === "annuel" ? " Je te préviens par e-mail 30 jours avant." : ""}
                </p>
                {a.bascule ? (
                  <div className="flex flex-col gap-3 rounded-xl bg-accent-soft p-4">
                    <p className="text-[16px] font-bold">{a.offres.find((o) => o.formule === "annuel")?.badge ? `Passe à l'annuel : ${a.offres.find((o) => o.formule === "annuel")!.badge}` : "Passe à l'annuel"}</p>
                    <p className="text-[15px]">
                      {a.offres.find((o) => o.formule === "annuel")?.prix}. Ce qui reste de ton mois ({a.bascule.credit}) est déduit : tu paies {a.bascule.aPayerHt} HT ({a.bascule.aPayerTtc} TTC) aujourd&apos;hui, pour un an jusqu&apos;au {date(a.bascule.jusquau)}.
                    </p>
                    {!passer ? (
                      <Button variant="secondary" onClick={() => setPasser(true)} className="self-start">
                        Passer à l&apos;annuel
                      </Button>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => void run("annuel", () => api<Abonnement>("/v1/abonnement/annuel", { method: "POST" }))} pending={pending === "annuel"}>
                          Oui, payer {a.bascule.aPayerTtc} TTC
                        </Button>
                        <Button variant="secondary" onClick={() => setPasser(false)}>
                          Rester au mois
                        </Button>
                      </div>
                    )}
                  </div>
                ) : null}
                {a.paiement === "stripe" ? (
                  <Button variant="secondary" onClick={() => void run("portail", async () => window.location.assign((await api<{ url: string }>("/v1/abonnement/portail", { method: "POST" })).url))} className="self-start">
                    Changer de carte
                  </Button>
                ) : null}
                {!confirmer ? (
                  <button type="button" onClick={() => setConfirmer(true)} className="min-h-11 self-start text-[15px] font-semibold text-muted underline">
                    Résilier
                  </button>
                ) : (
                  <div className="flex flex-col gap-3 rounded-xl bg-ground p-4">
                    <p className="text-[15px]">
                      Résilier ? Ton accès reste jusqu&apos;au {date(a.periodeFin)}, puis rien ne sera plus prélevé.{a.formule === "annuel" ? " Une année commencée n'est pas remboursée au prorata." : ""}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="ink" onClick={() => void run("resilier", () => api<Abonnement>("/v1/abonnement/resilier", { method: "POST" }))} pending={pending === "resilier"}>
                        Oui, résilier
                      </Button>
                      <Button variant="secondary" onClick={() => setConfirmer(false)}>
                        Garder mon abonnement
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        ) : null}
      </Card>
      <Card className="flex flex-col gap-3 p-5">
        <label htmlFor="tva" className="text-[15px] font-semibold">
          N° de TVA intracommunautaire (facultatif)
        </label>
        <input id="tva" value={tva} onChange={(e) => setTva(e.target.value)} placeholder="FR12345678901" autoComplete="off" className="min-h-12 rounded-xl border border-line bg-surface px-4 text-[16px]" />
        <p className="text-[14px] text-muted">Écrit sur tes prochaines factures.</p>
        <Button variant="secondary" onClick={() => void run("tva", () => api<Abonnement>("/v1/abonnement/tva", { method: "PUT", body: { tvaIntra: tva.trim() || null } }))} pending={pending === "tva"} className="self-start">
          Enregistrer
        </Button>
      </Card>
    </div>
  );
}

function Factures() {
  const charger = useCallback((signal: AbortSignal) => api<{ factures: FactureAbonnement[] }>("/v1/abonnement/factures", { signal }), []);
  const { data, error, reload } = useResource(charger);
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  if (data.factures.length === 0) return <Card className="p-5 text-[16px] text-muted">Pas encore de facture : la première arrive avec ton premier paiement.</Card>;
  return (
    <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface" aria-label="Mes factures">
      {data.factures.map((f) => (
        <li key={f.id} className="flex items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 flex-col">
            <span className="font-bold">
              {f.numero}
              {f.test ? <span className="ml-2 rounded-full bg-danger-bg px-2 py-0.5 text-[12px] text-danger">TEST</span> : null}
            </span>
            <span className="text-[14px] text-muted">
              {f.periode} · {f.ttc} TTC
            </span>
          </div>
          <a href={`/v1/abonnement/factures/${f.id}/pdf`} className="min-h-11 shrink-0 content-center text-[15px] font-semibold underline">
            Télécharger
          </a>
        </li>
      ))}
    </ul>
  );
}
