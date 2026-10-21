"use client";

import { useCallback, useState } from "react";
import { Button, Card, ErrorNotice, PageTitle, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

interface Tableau {
  departements: { ouverts: string[] | null; compteurs: { departement: string; lots: number; economies: number }[] };
  /** Dette n° 4 : les devis de négoces lus par le modèle sur 30 jours, et ceux qui restent « à vérifier ». */
  lectures: { jours: number; lues: number; aVerifier: number; echecs: number };
  lots: { id: string; numero: number; statut: string; zone: string; famille: string; designation: string; fenetre: { tot: string | null; tard: string | null }; envoyeLe: string | null; besoins: { total: number; fermes: number }; reponses: { attendues: number; deposees: number; pasConcernes: number; aVerifier: number }; negoceRetenu: string | null; prixRetenu: string | null; bons: number }[];
  negoces: { id: string; nom: string; email: string; departement: string; familles: string[]; stop: boolean; artisans: number; reponses: number }[];
  accords: { id: string; lot: number; negoce: string; email: string; adresseIp: string; versionContrat: string; tauxPourcent: string; accepteLe: string }[];
  factures: { id: string; numero: number; lot: number; negoce: string; totalLotHt: string; montantHt: string; statut: string; emiseLe: string | null; echeanceLe: string | null; payeeLe: string | null }[];
  exclusions: { id: string; entreprise: string; lot: number; sanction: string; excluJusquau: string | null; raison: string | null; le: string | null }[];
}
interface Lot {
  numero: number;
  statut: string;
  zone: string;
  designation?: string;
  besoins: { id: string; entreprise: string; designation: string; quantite: string; unite: string; statut: string; adresse: string; offre: { prixUnitaire: string; bon: boolean; livraison: string | null } | null }[];
  reponses: { id: string; negoceId: string; negoce: string; email: string; deposeLe: string | null; pasConcerneLe: string | null; statutExtraction: string; prix: unknown; delaiJours: number | null; message: string | null; fichiers: string[] }[];
  accords: { negoce: string; email: string; adresseIp: string; accepteLe: string; versionContrat: string }[];
  facture: { numero: number; montantHt: string; statut: string; echeanceLe: string | null } | null;
  journal: { evenement: string; details: unknown; le: string }[];
}

const euros = (s: string | number) => `${Number(s).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`;
const quand = (iso: string | null) => (iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "");

/**
 * L'ADMIN DE GREG (parcours groupé, étape 9 ; section 5). Il surveille, il ne traite pas : lots par département, journal,
 * réponses « à vérifier », négoces, accords, factures (export CSV), exclusions ; les gestes de secours (clore, annuler,
 * forcer, changer le négoce, facture payée). Réservé aux admins (GROUPE_ADMINS).
 */
export default function AdminGroupePage() {
  const fetchTableau = useCallback((signal: AbortSignal) => api<Tableau>("/v1/admin/groupe", { signal }), []);
  const { data, error, reload } = useResource(fetchTableau);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [lot, setLot] = useState<Lot | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [erreur, setErreur] = useState<ApiError | null>(null);
  const [onglet, setOnglet] = useState<"lots" | "negoces" | "accords" | "factures" | "exclusions">("lots");

  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;

  const agir = async (cle: string, f: () => Promise<unknown>) => {
    setPending(cle);
    setErreur(null);
    try {
      await f();
      reload();
      if (ouvert) setLot(await api<Lot>(`/v1/admin/groupe/lots/${encodeURIComponent(ouvert)}`));
    } catch (e) {
      setErreur(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(null);
    }
  };
  const voir = async (id: string) => {
    setOuvert(id);
    setLot(null);
    setLot(await api<Lot>(`/v1/admin/groupe/lots/${encodeURIComponent(id)}`));
  };

  return (
    <>
      <PageTitle>Admin groupé</PageTitle>
      <p className="text-sm text-muted">
        Départements ouverts : {data.departements.ouverts ? data.departements.ouverts.join(", ") : "tous"} ·{" "}
        {data.departements.compteurs.map((c) => `${c.departement} : ${c.lots} lot${c.lots > 1 ? "s" : ""}, ${euros(c.economies)} économisés`).join(" · ") || "aucun lot"}
        {data.lectures ? ` · devis négoces sur ${data.lectures.jours} jours : ${data.lectures.lues} lu${data.lectures.lues > 1 ? "s" : ""}, ${data.lectures.aVerifier} à vérifier, ${data.lectures.echecs} en échec` : ""}
      </p>
      <nav aria-label="Rubriques de l'admin" className="flex flex-wrap gap-1.5">
        {(["lots", "negoces", "accords", "factures", "exclusions"] as const).map((o) => (
          <button key={o} type="button" onClick={() => setOnglet(o)} aria-current={onglet === o ? "page" : undefined} className={`min-h-10 rounded-full px-3.5 text-[13px] font-extrabold ${onglet === o ? "bg-accent text-white" : "bg-surface text-ink"}`}>
            {o === "lots" ? "Lots" : o === "negoces" ? "Négoces" : o === "accords" ? "Accords" : o === "factures" ? "Factures" : "Exclusions"}
          </button>
        ))}
      </nav>
      {erreur ? <ErrorNotice error={erreur} /> : null}

      {onglet === "lots" ? (
        <ul aria-label="Lots" className="flex flex-col gap-2">
          {data.lots.length === 0 ? <li className="text-sm text-muted">Aucun lot.</li> : null}
          {data.lots.map((l) => (
            <li key={l.id} className="flex flex-col gap-1 rounded-2xl bg-surface p-3 shadow-card">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-extrabold">Lot n° {l.numero} · {l.zone} · {l.statut}</span>
                <button type="button" onClick={() => voir(l.id)} className="min-h-10 text-[13px] font-bold text-accent-text underline decoration-dotted underline-offset-4">
                  Journal
                </button>
              </div>
              <span className="text-[14px]">{l.designation}</span>
              <span className="text-[13px] text-muted">
                {l.besoins.fermes}/{l.besoins.total} fermes · réponses {l.reponses.deposees}/{l.reponses.attendues}
                {l.reponses.aVerifier > 0 ? ` · ${l.reponses.aVerifier} à vérifier` : ""}
                {l.negoceRetenu ? ` · retenu : ${l.negoceRetenu} à ${euros(l.prixRetenu ?? 0)}` : ""}
                {l.bons > 0 ? ` · ${l.bons} bon${l.bons > 1 ? "s" : ""}` : ""}
              </span>
              <div className="flex flex-wrap gap-2">
                {l.statut === "ouvert" ? (
                  <Button variant="secondary" className="min-h-10 px-3.5 text-[14px]" pending={pending === `forcer-${l.id}`} onClick={() => agir(`forcer-${l.id}`, () => api(`/v1/admin/groupe/lots/${l.id}/forcer`, { method: "POST" }))}>
                    Forcer
                  </Button>
                ) : null}
                {!["clos", "annule"].includes(l.statut) ? (
                  <>
                    <Button variant="secondary" className="min-h-10 px-3.5 text-[14px]" pending={pending === `clore-${l.id}`} onClick={() => agir(`clore-${l.id}`, () => api(`/v1/admin/groupe/lots/${l.id}/clore`, { method: "POST" }))}>
                      Clore le lot
                    </Button>
                    {l.bons === 0 ? (
                      <Button variant="secondary" className="min-h-10 px-3.5 text-[14px]" pending={pending === `annuler-${l.id}`} onClick={() => agir(`annuler-${l.id}`, () => api(`/v1/admin/groupe/lots/${l.id}/annuler`, { method: "POST" }))}>
                        Annuler
                      </Button>
                    ) : null}
                  </>
                ) : null}
              </div>
              {ouvert === l.id ? (
                <section aria-label={`Journal du lot n° ${l.numero}`} className="mt-2 flex flex-col gap-2 rounded-xl bg-ground p-3 text-[13px]">
                  {!lot ? (
                    <Spinner />
                  ) : (
                    <>
                      <p className="font-extrabold">Artisans</p>
                      <ul className="flex flex-col gap-1">
                        {lot.besoins.map((b) => (
                          <li key={b.id}>
                            {b.entreprise} · {b.quantite} {b.unite} · {b.statut} · {b.adresse}
                            {b.offre ? ` · ${euros(b.offre.prixUnitaire)}${b.offre.bon ? " · bon parti" : ""}${b.offre.livraison ? ` · livraison ${b.offre.livraison}` : ""}` : ""}
                          </li>
                        ))}
                      </ul>
                      <p className="font-extrabold">Réponses</p>
                      <ul className="flex flex-col gap-1">
                        {lot.reponses.map((r) => (
                          <li key={r.id} className="flex flex-wrap items-center gap-2">
                            <span>
                              {r.negoce} · {r.deposeLe ? `déposée le ${r.deposeLe} · ${r.statutExtraction}${r.delaiJours ? ` · ${r.delaiJours} j` : ""}` : r.pasConcerneLe ? "pas concerné" : "sans réponse"}
                              {r.message ? ` · « ${r.message} »` : ""}
                            </span>
                            {r.deposeLe && lot.statut === "choisi" ? (
                              <Button variant="secondary" className="min-h-9 px-3 text-[13px]" pending={pending === `negoce-${r.id}`} onClick={() => agir(`negoce-${r.id}`, () => api(`/v1/admin/groupe/lots/${l.id}/negoce`, { method: "POST", body: { negoceId: r.negoceId } }))}>
                                Retenir ce négoce
                              </Button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                      {lot.facture ? <p>Facture n° {lot.facture.numero} · {euros(lot.facture.montantHt)} HT · {lot.facture.statut} · échéance {lot.facture.echeanceLe}</p> : null}
                      <p className="font-extrabold">Journal</p>
                      <ol className="flex flex-col gap-0.5 font-mono text-[12px]">
                        {lot.journal.map((j, i) => (
                          <li key={i}>
                            {quand(j.le)} · {j.evenement} · {JSON.stringify(j.details)}
                          </li>
                        ))}
                      </ol>
                    </>
                  )}
                </section>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {onglet === "negoces" ? (
        <ul aria-label="Négoces" className="flex flex-col gap-2">
          {data.negoces.map((n) => (
            <li key={n.id} className="rounded-2xl bg-surface p-3 text-[14px] shadow-card">
              <span className="font-extrabold">{n.nom}</span> · {n.departement} · {n.email} · {n.familles.join(", ")} · {n.artisans} artisan{n.artisans > 1 ? "s" : ""} · {n.reponses} réponse{n.reponses > 1 ? "s" : ""}
              {n.stop ? " · STOP" : ""}
            </li>
          ))}
        </ul>
      ) : null}

      {onglet === "accords" ? (
        <ul aria-label="Accords" className="flex flex-col gap-2">
          {data.accords.map((a) => (
            <li key={a.id} className="rounded-2xl bg-surface p-3 text-[14px] shadow-card">
              Lot n° {a.lot} · {a.negoce} · {a.email} · IP {a.adresseIp} · {a.tauxPourcent} % · contrat {a.versionContrat} · {quand(a.accepteLe)}
            </li>
          ))}
        </ul>
      ) : null}

      {onglet === "factures" ? (
        <Card className="flex flex-col gap-2 p-3">
          <a href="/v1/admin/groupe/factures.csv" className="min-h-10 self-start py-2 text-sm font-bold text-accent-text underline decoration-dotted underline-offset-4">
            Export CSV (mois, négoce, lot, HT, TVA, TTC, statut)
          </a>
          <ul aria-label="Factures" className="flex flex-col gap-2">
            {data.factures.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 text-[14px]">
                <span>
                  n° {f.numero} · lot {f.lot} · {f.negoce} · {euros(f.montantHt)} HT · {f.statut} · échéance {f.echeanceLe}
                </span>
                {f.statut !== "payee" ? (
                  <Button variant="secondary" className="min-h-9 px-3 text-[13px]" pending={pending === `payee-${f.id}`} onClick={() => agir(`payee-${f.id}`, () => api(`/v1/admin/groupe/factures/${f.id}/payee`, { method: "POST" }))}>
                    Payée
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {onglet === "exclusions" ? (
        <ul aria-label="Exclusions" className="flex flex-col gap-2">
          {data.exclusions.length === 0 ? <li className="text-sm text-muted">Aucun désistement.</li> : null}
          {data.exclusions.map((x) => (
            <li key={x.id} className="rounded-2xl bg-surface p-3 text-[14px] shadow-card">
              {x.le} · {x.entreprise} · lot n° {x.lot} · {x.sanction}
              {x.excluJusquau ? ` jusqu'au ${x.excluJusquau}` : ""}
              {x.raison ? ` · « ${x.raison} »` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
