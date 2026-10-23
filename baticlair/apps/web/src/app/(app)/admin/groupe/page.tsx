"use client";

import { useCallback, useState } from "react";
import { Button, Card, ErrorNotice, PageTitle, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { nom } from "@/lib/nom";

/** Les statuts bruts de l'API, lisibles par Greg (test complet du 21 octobre : « livre », « retire », « envoyee » s'affichaient tels quels). */
const LIBELLES: Record<string, string> = {
  ouvert: "ouvert",
  envoye: "envoyé aux négoces",
  choisi: "négoce retenu",
  clos: "clos",
  annule: "annulé",
  en_attente: "devis en attente",
  signe: "chantier signé",
  engage: "engagé",
  commande: "bon de commande parti",
  livre: "livré",
  retire: "retiré",
  probleme: "problème signalé",
  envoyee: "envoyée",
  payee: "payée",
};
const libelle = (statut: string | null | undefined) => (statut ? (LIBELLES[statut] ?? statut) : "");
const quantiteFr = (q: string) => Number(q).toLocaleString("fr-FR", { maximumFractionDigits: 3 }).replace(/\u202f/g, "\u00a0");

interface Tableau {
  departements: { ouverts: string[] | null; compteurs: { departement: string; lots: number; economies: number }[] };
  /** Dette n° 4 : les devis de négoces lus par le modèle sur 30 jours, et ceux qui restent « à vérifier ». */
  lectures: { jours: number; lues: number; aVerifier: number; echecs: number };
  lots: { id: string; numero: number; statut: string; zone: string; famille: string; designation: string; fenetre: { tot: string | null; tard: string | null }; envoyeLe: string | null; besoins: { total: number; fermes: number }; reponses: { attendues: number; deposees: number; pasConcernes: number; aVerifier: number }; negoceRetenu: string | null; prixRetenu: string | null; bons: number }[];
  negoces: { id: string; nom: string; email: string; departement: string; agences: string[]; familles: string[]; stop: boolean; artisans: number; reponses: number }[];
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
interface ConfigCycle {
  jourCloture1: number;
  jourCloture2: number;
  heureCloture: number;
  joursOuvresReponse: number;
  heureReponse: number;
}

/**
 * La commande commune (Greg, 22 octobre 2026 ; cycle raccourci le 23 : le 1er et le 15, 5 jours ouvrés) : tous les réglages
 * dans une seule config, modifiable ici. Les heures et le délai valent pour les commandes pas encore closes ; les deux
 * jours de clôture pour les commandes pas encore ouvertes. Heures de Paris.
 */
function DatesDuMois() {
  const fetchConfig = useCallback((signal: AbortSignal) => api<ConfigCycle>("/v1/admin/commande-du-mois/config", { signal }), []);
  const { data, error, reload } = useResource(fetchConfig);
  const [brouillon, setBrouillon] = useState<ConfigCycle | null>(null);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<ApiError | null>(null);
  const [fait, setFait] = useState(false);
  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return null;
  const c = brouillon ?? data;
  const champ = (cle: keyof ConfigCycle, label: string, suffixe: string) => (
    <label className="flex flex-wrap items-center gap-2 text-sm font-semibold">
      {label}
      <input
        inputMode="numeric"
        aria-label={label}
        value={String(c[cle])}
        onChange={(e) => (setFait(false), setBrouillon({ ...c, [cle]: Number(e.currentTarget.value.replace(/\D/g, "")) || 0 }))}
        className="min-h-11 w-16 rounded-xl border border-line bg-surface px-3 text-right font-bold"
      />
      {suffixe}
    </label>
  );
  return (
    <Card aria-label="Dates de la commande commune" className="flex flex-col gap-3 p-4">
      <h2 className="text-base font-extrabold">Dates de la commande commune</h2>
      {champ("jourCloture1", "Première clôture le", "du mois")}
      {champ("jourCloture2", "Deuxième clôture le", "du mois")}
      {champ("heureCloture", "à", "h")}
      {champ("joursOuvresReponse", "Les négoces répondent en", "jours ouvrés")}
      {champ("heureReponse", "avant", "h")}
      {erreur ? <ErrorNotice error={erreur} /> : null}
      {fait ? <p role="status" className="text-sm font-bold text-ok">Enregistré.</p> : null}
      <Button
        className="self-start"
        pending={pending}
        disabled={!brouillon}
        onClick={async () => {
          setPending(true);
          setErreur(null);
          try {
            await api("/v1/admin/commande-du-mois/config", { method: "PUT", body: c });
            setBrouillon(null);
            setFait(true);
            reload();
          } catch (e) {
            setErreur(e instanceof ApiError ? e : new ApiError("internal_error", 500));
          } finally {
            setPending(false);
          }
        }}
      >
        Enregistrer les dates
      </Button>
    </Card>
  );
}

/** L'espace négoce (Greg, 23 octobre 2026, point 8) : inscrits, invités jamais venus, désabonnés ; taux de réponse par cycle, commandes par négoce retenu. */
interface ComptesNegoceVue {
  negoces: { id: string; enseigne: string; email: string; siret: string | null; etat: "inscrit" | "invite" | "desabonne"; inviteLe: string | null; inscritLe: string | null; rappels: number; departements: string[]; grillesRetenues: number; commandesRecues: number }[];
  cycles: { mois: string; de: string; zone: string; phase: string; attendues: number; deposees: number; tauxReponse: number | null; retenuId: string | null }[];
}
const ETATS: Record<ComptesNegoceVue["negoces"][number]["etat"], string> = { inscrit: "Inscrit", invite: "Invité, jamais venu", desabonne: "Désabonné" };

function ComptesNegoce() {
  const fetchComptes = useCallback((signal: AbortSignal) => api<ComptesNegoceVue>("/v1/admin/commande-du-mois/negoces", { signal }), []);
  const { data, error } = useResource(fetchComptes);
  if (error) return <ErrorNotice error={error} />;
  if (!data) return <Spinner label="Chargement des comptes négoce…" />;
  const parEtat = (etat: ComptesNegoceVue["negoces"][number]["etat"]) => data.negoces.filter((n) => n.etat === etat);
  return (
    <section aria-label="Espace négoce" className="flex flex-col gap-3">
      <h2 className="text-[16px] font-extrabold">Espace négoce</h2>
      <p className="text-[13px] text-muted">{`${parEtat("inscrit").length} inscrit${parEtat("inscrit").length > 1 ? "s" : ""} · ${parEtat("invite").length} invité${parEtat("invite").length > 1 ? "s" : ""} jamais venu${parEtat("invite").length > 1 ? "s" : ""} · ${parEtat("desabonne").length} désabonné${parEtat("desabonne").length > 1 ? "s" : ""}`}</p>
      {data.negoces.length > 0 ? (
        <ul aria-label="Comptes négoce" className="flex flex-col gap-2">
          {data.negoces.map((n) => (
            <li key={n.id} className="rounded-2xl bg-surface p-3 text-[14px] shadow-card">
              <span className="font-extrabold">{n.enseigne}</span> · {ETATS[n.etat]} · {n.email}
              {n.siret ? ` · SIRET ${n.siret}` : ""} · {n.departements.length ? n.departements.join(", ") : "aucun département"}
              {n.inscritLe ? ` · inscrit le ${quand(n.inscritLe)}` : n.inviteLe ? ` · invité le ${quand(n.inviteLe)}, ${n.rappels} rappel${n.rappels > 1 ? "s" : ""}` : ""}
              {` · ${n.grillesRetenues} grille${n.grillesRetenues > 1 ? "s" : ""} retenue${n.grillesRetenues > 1 ? "s" : ""}, ${n.commandesRecues} commande${n.commandesRecues > 1 ? "s" : ""} reçue${n.commandesRecues > 1 ? "s" : ""}`}
            </li>
          ))}
        </ul>
      ) : null}
      {data.cycles.length > 0 ? (
        <ul aria-label="Taux de réponse par cycle" className="flex flex-col gap-1 text-[13px]">
          {data.cycles.map((c) => (
            <li key={`${c.mois}-${c.zone}`}>{`Commande ${c.de} (${c.zone}) : ${c.deposees} grille${c.deposees > 1 ? "s" : ""} sur ${c.attendues} attendue${c.attendues > 1 ? "s" : ""}${c.tauxReponse === null ? "" : ` (${c.tauxReponse} %)`}${c.retenuId ? " · négoce retenu" : ""}`}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export default function AdminGroupePage() {
  const fetchTableau = useCallback((signal: AbortSignal) => api<Tableau>("/v1/admin/groupe", { signal }), []);
  const { data, error, reload } = useResource(fetchTableau);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [lot, setLot] = useState<Lot | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [erreur, setErreur] = useState<ApiError | null>(null);
  const [onglet, setOnglet] = useState<"lots" | "negoces" | "accords" | "factures" | "exclusions">("lots");
  // Plan « finition », bloc 6 : Forcer, Clore et Annuler un lot ne partent plus d'un seul tap (un tap de trop sur
  // téléphone fermait un lot pour tous ses artisans) ; la carte demande « Oui » ou « Non ».
  const [aConfirmer, setAConfirmer] = useState<{ cle: string; question: string; oui: string; f: () => Promise<unknown> } | null>(null);

  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;

  const agir = async (cle: string, f: () => Promise<unknown>) => {
    setAConfirmer(null);
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
      <PageTitle>{`Admin ${nom}`}</PageTitle>
      <p className="text-sm text-muted">
        Départements ouverts : {data.departements.ouverts ? data.departements.ouverts.join(", ") : "tous"} ·{" "}
        {data.departements.compteurs.map((c) => `${c.departement} : ${c.lots} lot${c.lots > 1 ? "s" : ""}, ${euros(c.economies)} économisés`).join(" · ") || "aucun lot"}
        {data.lectures ? ` · devis négoces sur ${data.lectures.jours} jours : ${data.lectures.lues} lu${data.lectures.lues > 1 ? "s" : ""}, ${data.lectures.aVerifier} à vérifier, ${data.lectures.echecs} en échec` : ""}
      </p>
      <DatesDuMois />
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
                <span className="text-[15px] font-extrabold">Lot n° {l.numero} · {l.zone} · {libelle(l.statut)}</span>
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
                  <Button variant="secondary" className="min-h-10 px-3.5 text-[14px]" pending={pending === `forcer-${l.id}`} onClick={() => setAConfirmer({ cle: `forcer-${l.id}`, question: `Forcer le lot n° ${l.numero} ? La demande part aux négoces avec les artisans déjà engagés.`, oui: "Oui, forcer", f: () => api(`/v1/admin/groupe/lots/${l.id}/forcer`, { method: "POST" }) })}>
                    Forcer
                  </Button>
                ) : null}
                {!["clos", "annule"].includes(l.statut) ? (
                  <>
                    <Button variant="secondary" className="min-h-10 px-3.5 text-[14px]" pending={pending === `clore-${l.id}`} onClick={() => setAConfirmer({ cle: `clore-${l.id}`, question: `Clore le lot n° ${l.numero} ? Il ne reçoit plus rien, c'est définitif.`, oui: "Oui, clore", f: () => api(`/v1/admin/groupe/lots/${l.id}/clore`, { method: "POST" }) })}>
                      Clore le lot
                    </Button>
                    {l.bons === 0 ? (
                      <Button variant="secondary" className="min-h-10 px-3.5 text-[14px]" pending={pending === `annuler-${l.id}`} onClick={() => setAConfirmer({ cle: `annuler-${l.id}`, question: `Annuler le lot n° ${l.numero} ? Ses artisans sont prévenus, c'est définitif.`, oui: "Oui, annuler", f: () => api(`/v1/admin/groupe/lots/${l.id}/annuler`, { method: "POST" }) })}>
                        Annuler
                      </Button>
                    ) : null}
                  </>
                ) : null}
              </div>
              {aConfirmer && aConfirmer.cle.endsWith(`-${l.id}`) ? (
                <div role="alertdialog" aria-label={aConfirmer.question} className="flex flex-col gap-2 rounded-xl bg-warn-bg p-3">
                  <p className="text-[14px] font-bold text-warn">{aConfirmer.question}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button className="min-h-10 px-3.5 text-[14px]" onClick={() => agir(aConfirmer.cle, aConfirmer.f)}>
                      {aConfirmer.oui}
                    </Button>
                    <Button variant="secondary" className="min-h-10 px-3.5 text-[14px]" onClick={() => setAConfirmer(null)}>
                      Non
                    </Button>
                  </div>
                </div>
              ) : null}
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
                            {b.entreprise} · {quantiteFr(b.quantite)} {b.unite} · {libelle(b.statut)} · {b.adresse}
                            {b.offre ? ` · ${euros(b.offre.prixUnitaire)}${b.offre.bon ? " · bon parti" : ""}${b.offre.livraison ? ` · livraison : ${libelle(b.offre.livraison)}` : ""}` : ""}
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
                      {lot.facture ? <p>Facture n° {lot.facture.numero} · {euros(lot.facture.montantHt)} HT · {libelle(lot.facture.statut)} · échéance {lot.facture.echeanceLe}</p> : null}
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

      {onglet === "negoces" ? <ComptesNegoce /> : null}
      {onglet === "negoces" ? (
        <ul aria-label="Négoces" className="flex flex-col gap-2">
          {data.negoces.map((n) => (
            <li key={n.id} className="rounded-2xl bg-surface p-3 text-[14px] shadow-card">
              <span className="font-extrabold">{n.nom}</span> · {n.departement}
              {n.agences.length > 0 ? ` (agences aussi en ${n.agences.join(", ")})` : ""} · {n.email} · {n.familles.join(", ")} · {n.artisans} artisan{n.artisans > 1 ? "s" : ""} · {n.reponses} réponse{n.reponses > 1 ? "s" : ""}
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
                  n° {f.numero} · lot {f.lot} · {f.negoce} · {euros(f.montantHt)} HT · {libelle(f.statut)} · échéance {f.echeanceLe}
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
