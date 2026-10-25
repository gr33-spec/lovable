"use client";

import { Phone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CodeAdmin } from "@/components/code-admin";
import { BackButton, Badge, Button, Card, ErrorNotice, Field, PageTitle, SectionTitle, Spinner } from "@/components/ui";
import { api, ApiError, messageErreur } from "@/lib/api";
import { prixAvecCommission, prixFr, STATUTS_CHASSEUR, type RegroupementChasseur } from "@/lib/negocie";
import { jourFr } from "@/lib/recentrage";
import { useResource } from "@/lib/use-resource";

/**
 * LE CHASSEUR D'OPPORTUNITÉS (business model final, Greg, 25 octobre 2026) : un rôle distinct de l'admin complet
 * (`CHASSEURS`), après un code par e-mail. La liste des regroupements (volume, entreprises, date la plus proche, négoces
 * de la zone avec leur téléphone), « Je prends en charge », le journal d'appels, l'offre (commission intégrée au prix
 * affiché), l'envoi à tous en un clic, les acceptations en direct, puis la commande totale au négoce.
 */
const asError = (e: unknown) => (e instanceof ApiError ? e : new ApiError("internal_error", 500));

export default function ChasseurPage() {
  const charger = useCallback((signal: AbortSignal) => api<{ chasseur: boolean; deuxFacteurs: boolean }>("/v1/chasseur/statut", { signal }), []);
  const [statut, setStatut] = useState<{ chasseur: boolean; deuxFacteurs: boolean } | null>(null);
  const [erreur, setErreur] = useState<ApiError | null>(null);
  useEffect(() => {
    const c = new AbortController();
    charger(c.signal).then(setStatut, (e: unknown) => setErreur(asError(e)));
    return () => c.abort();
  }, [charger]);
  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/" />
      <PageTitle>Chasseur d&apos;opportunités</PageTitle>
      {erreur ? <ErrorNotice error={erreur} /> : null}
      {!statut && !erreur ? <Spinner /> : null}
      {statut && !statut.chasseur ? <Card className="p-5 text-[16px]">Cette page est réservée aux chasseurs d&apos;opportunités Mobiiz.</Card> : null}
      {statut?.chasseur && !statut.deuxFacteurs ? <CodeAdmin quoi="tes regroupements" onOk={() => setStatut({ chasseur: true, deuxFacteurs: true })} /> : null}
      {statut?.deuxFacteurs ? <Liste /> : null}
    </div>
  );
}

function Liste() {
  const fetcher = useCallback((signal: AbortSignal) => api<{ regroupements: RegroupementChasseur[]; commissionDefaut: number }>("/v1/chasseur/regroupements", { signal }), []);
  const { data, error, reload } = useResource(fetcher);
  // Les acceptations en direct : la liste se recharge toutes les 30 secondes.
  useEffect(() => {
    const t = setInterval(reload, 30_000);
    return () => clearInterval(t);
  }, [reload]);
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  if (data.regroupements.length === 0) return <Card className="p-5 text-[16px]">Aucun regroupement en cours. Ils arrivent ici dès qu&apos;une entreprise déclare un gros besoin.</Card>;
  return (
    <ul aria-label="Regroupements à négocier" className="flex flex-col gap-4">
      {data.regroupements.map((r) => (
        <li key={r.id} id={`r-${r.id}`} className="scroll-mt-24">
          <CarteChasseur r={r} commissionDefaut={data.commissionDefaut} onChange={reload} />
        </li>
      ))}
    </ul>
  );
}

function CarteChasseur({ r, commissionDefaut, onChange }: { r: RegroupementChasseur; commissionDefaut: number; onChange: () => void }) {
  const [pending, setPending] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  async function faire(geste: string, appel: () => Promise<unknown>) {
    setPending(geste);
    setErreur(null);
    try {
      await appel();
      onChange();
    } catch (e) {
      setErreur(messageErreur(e, { prendre_en_charge_d_abord: "Prends-le en charge d'abord.", sans_offre: "Saisis l'offre d'abord.", aucune_acceptation: "Personne n'a encore accepté." }));
    } finally {
      setPending(null);
    }
  }
  const post = (chemin: string, body?: unknown) => api(`/v1/chasseur/regroupements/${r.id}/${chemin}`, { method: "POST", ...(body ? { body } : {}) });
  return (
    <Card className="flex flex-col gap-4 p-4" aria-label={`Regroupement n° ${r.numero}`}>
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Pastille couleur={r.pastille} />
          <span className="text-[13px] font-semibold text-muted">N° {r.numero}</span>
          <Badge tone={r.statut === "commande" ? "ok" : r.statut === "offre_recue" ? "warn" : "neutral"}>{STATUTS_CHASSEUR[r.statut]}</Badge>
        </div>
        <span className="text-[17px] font-extrabold">{r.libelle}</span>
        <span className="text-[15px]">
          {r.volume.toLocaleString("fr-FR")} {r.unite} · {r.entreprises} entreprise{r.entreprises > 1 ? "s" : ""} · dans le {r.departement}
          {r.dateBesoinMin ? ` · au plus tôt le ${jourFr(r.dateBesoinMin)}` : ""}
        </span>
        {r.dateLimite ? (
          <span className={`text-[15px] font-semibold ${r.pastille === "rouge" ? "text-danger" : ""}`}>
            Date butoir : {jourFr(r.dateLimite)} · {compteARebours(r.joursRestants)}
          </span>
        ) : null}
        {r.chasseur ? <span className="text-[13px] text-muted">Pris en charge par {r.chasseur}</span> : null}
      </div>
      <details>
        <summary className="min-h-11 cursor-pointer text-[15px] font-semibold">Entreprises ({r.participants.length})</summary>
        <ul className="mt-2 flex flex-col gap-1 text-[14px]">
          {r.participants.map((p) => (
            <li key={p.besoinId}>
              {p.entreprise} · {p.commune} · {p.quantite.toLocaleString("fr-FR")} {r.unite} · pour le {jourFr(p.dateBesoin)} · {p.statut === "accepte" ? "a accepté" : p.statut === "refuse" ? "a refusé" : "en attente"}
            </li>
          ))}
        </ul>
      </details>
      <NegocesAAppeler r={r} onAppel={(negoce, note) => faire("appel", () => post("appels", { negoce, note }))} pending={pending === "appel"} />
      {erreur ? (
        <p role="alert" className="text-[15px] font-semibold text-danger">
          {erreur}
        </p>
      ) : null}
      {r.statut === "en_collecte" ? (
        <Button onClick={() => void faire("prendre", () => post("prendre"))} pending={pending === "prendre"}>
          Je prends en charge
        </Button>
      ) : null}
      {r.statut === "en_negociation" || r.statut === "offre_recue" ? (
        <>
          <JournalAppels r={r} onNote={(negoce, note) => faire("appel", () => post("appels", { negoce, note }))} pending={pending === "appel"} />
          {!r.offre?.envoyee ? <FormulaireOffre r={r} commissionDefaut={commissionDefaut} onSaisie={(o) => faire("offre", () => api(`/v1/chasseur/regroupements/${r.id}/offre`, { method: "PUT", body: o }))} pending={pending === "offre"} /> : null}
          {r.offre ? (
            <div className="flex flex-col gap-1 rounded-xl bg-ground p-3 text-[14px]">
              <span className="font-semibold">Offre : {r.offre.negoceNom}</span>
              <span>
                Négocié {prixFr(r.offre.prixNegocieHt)} HT · commission {r.offre.commissionPct.toLocaleString("fr-FR")} % · affiché {prixFr(r.offre.prixAfficheHt)} HT
              </span>
              <span>
                Livraison {prixFr(r.offre.livraisonHt)} HT · valable jusqu&apos;au {jourFr(r.offre.valideJusquau)}
              </span>
              <span className="font-semibold">
                {r.acceptes} acceptation{r.acceptes > 1 ? "s" : ""} sur {r.participants.length}
              </span>
            </div>
          ) : null}
          {r.offre && !r.offre.envoyee ? (
            <Button onClick={() => void faire("envoyer", () => post("envoyer"))} pending={pending === "envoyer"}>
              Envoyer l&apos;offre à tous
            </Button>
          ) : null}
          {r.offre?.envoyee && r.acceptes > 0 ? (
            <Button onClick={() => void faire("transmettre", () => post("transmettre"))} pending={pending === "transmettre"}>
              Transmettre la commande au négoce
            </Button>
          ) : null}
          <button type="button" onClick={() => void faire("abandonner", () => post("abandonner"))} disabled={pending !== null} className="min-h-11 self-start text-[14px] font-semibold text-muted underline">
            Abandonner ce regroupement
          </button>
        </>
      ) : null}
    </Card>
  );
}

function JournalAppels({ r, onNote, pending }: { r: RegroupementChasseur; onNote: (negoce: string, note: string) => Promise<void>; pending: boolean }) {
  const [negoce, setNegoce] = useState("");
  const [note, setNote] = useState("");
  return (
    <details>
      <summary className="min-h-11 cursor-pointer text-[15px] font-semibold">Journal d&apos;appels ({r.appels.length})</summary>
      <div className="mt-2 flex flex-col gap-2">
        <ul className="flex flex-col gap-1 text-[14px]">
          {r.appels.map((a) => (
            <li key={a.le}>
              {jourFr(a.le)} · {a.negoce} : {a.note}
            </li>
          ))}
        </ul>
        <Field id={`appel-negoce-${r.id}`} label="Négoce appelé" value={negoce} onChange={(e) => setNegoce(e.target.value)} maxLength={120} />
        <Field id={`appel-note-${r.id}`} label="Ce qu'il a dit" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        <Button variant="secondary" pending={pending} disabled={!negoce.trim()} onClick={() => void onNote(negoce.trim(), note.trim()).then(() => (setNegoce(""), setNote("")))}>
          Noter l&apos;appel
        </Button>
      </div>
    </details>
  );
}

interface SaisieOffre {
  negoceNom: string;
  negoceEmail: string;
  negoceTelephone: string | null;
  prixNegocieHt: number;
  commissionPct: number;
  livraisonHt: number;
  conditions: string | null;
  valideJusquau: string;
}

const nombre = (s: string) => Number(s.replace(",", ".").replace(/\s/g, ""));

function FormulaireOffre({ r, commissionDefaut, onSaisie, pending }: { r: RegroupementChasseur; commissionDefaut: number; onSaisie: (o: SaisieOffre) => Promise<void>; pending: boolean }) {
  const [negoceNom, setNegoceNom] = useState(r.offre?.negoceNom ?? "");
  const [negoceEmail, setNegoceEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [prix, setPrix] = useState(r.offre ? String(r.offre.prixNegocieHt) : "");
  const [commission, setCommission] = useState(String(r.offre?.commissionPct ?? commissionDefaut));
  const [livraison, setLivraison] = useState(r.offre ? String(r.offre.livraisonHt) : "0");
  const [conditions, setConditions] = useState("");
  const [valide, setValide] = useState(r.offre?.valideJusquau.slice(0, 10) ?? "");
  const choisir = (nom: string) => {
    const n = r.negoces.find((x) => x.nom === nom);
    setNegoceNom(nom);
    if (n) {
      setNegoceEmail(n.email);
      setTelephone(n.telephone ?? "");
    }
  };
  const p = nombre(prix);
  const c = nombre(commission);
  const pret = negoceNom.trim() && /^\S+@\S+\.\S+$/.test(negoceEmail.trim()) && p > 0 && c >= 0 && nombre(livraison) >= 0 && !!valide;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line p-3">
      <SectionTitle>Offre négociée</SectionTitle>
      <Field id={`offre-negoce-${r.id}`} label="Négoce" value={negoceNom} onChange={(e) => choisir(e.target.value)} list={`negoces-${r.id}`} maxLength={120} />
      <datalist id={`negoces-${r.id}`}>
        {r.negoces.map((n) => (
          <option key={n.email} value={n.nom} />
        ))}
      </datalist>
      <Field id={`offre-email-${r.id}`} label="E-mail du négoce" type="email" value={negoceEmail} onChange={(e) => setNegoceEmail(e.target.value)} maxLength={254} />
      <Field id={`offre-tel-${r.id}`} label="Téléphone (facultatif)" value={telephone} onChange={(e) => setTelephone(e.target.value)} maxLength={30} />
      <Field id={`offre-prix-${r.id}`} label={`Prix négocié HT par ${r.unite.replace(/s$/, "")}`} inputMode="decimal" value={prix} onChange={(e) => setPrix(e.target.value)} />
      <Field id={`offre-commission-${r.id}`} label="Commission Mobiiz (%)" inputMode="decimal" value={commission} onChange={(e) => setCommission(e.target.value)} />
      {p > 0 && c >= 0 ? <p className="text-[14px] text-muted">Prix affiché aux artisans : {prixFr(prixAvecCommission(p, c))} HT (commission incluse).</p> : null}
      <Field id={`offre-livraison-${r.id}`} label="Livraison HT (par entreprise)" inputMode="decimal" value={livraison} onChange={(e) => setLivraison(e.target.value)} />
      <Field id={`offre-conditions-${r.id}`} label="Conditions (facultatif)" value={conditions} onChange={(e) => setConditions(e.target.value)} maxLength={1000} />
      <Field id={`offre-validite-${r.id}`} label="Valable jusqu'au" type="date" value={valide} onChange={(e) => setValide(e.target.value)} />
      <Button
        variant="secondary"
        pending={pending}
        disabled={!pret}
        onClick={() =>
          void onSaisie({ negoceNom: negoceNom.trim(), negoceEmail: negoceEmail.trim(), negoceTelephone: telephone.trim() || null, prixNegocieHt: p, commissionPct: c, livraisonHt: nombre(livraison), conditions: conditions.trim() || null, valideJusquau: valide })
        }
      >
        Enregistrer l&apos;offre
      </Button>
    </div>
  );
}

function Pastille({ couleur }: { couleur: RegroupementChasseur["pastille"] }) {
  const classe = couleur === "rouge" ? "bg-danger" : couleur === "verte" ? "bg-ok" : "bg-line";
  const label = couleur === "rouge" ? "Moins de 5 jours avant la date butoir" : couleur === "verte" ? "Offre saisie" : "Dans les temps";
  return <span role="img" aria-label={label} title={label} className={`inline-block size-3 rounded-full ${classe}`} />;
}

function compteARebours(j: number | null): string {
  if (j === null) return "";
  if (j < 0) return `dépassée de ${-j} jour${j < -1 ? "s" : ""}`;
  if (j === 0) return "aujourd'hui";
  return `J-${j}`;
}

/** « Négoces à appeler » : déjà répondu sur Mobiiz, puis utilisés en perso par ces artisans, puis les autres vérifiés. */
function NegocesAAppeler({ r, onAppel, pending }: { r: RegroupementChasseur; onAppel: (negoce: string, note: string) => Promise<void>; pending: boolean }) {
  const [enCours, setEnCours] = useState<string | null>(null);
  const [note, setNote] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <SectionTitle>Négoces à appeler</SectionTitle>
      {r.negoces.length === 0 ? <p className="text-[14px] text-muted">Aucun négoce connu dans le {r.departement} pour cette famille.</p> : null}
      <ul className="flex flex-col gap-2">
        {r.negoces.map((n) => (
          <li key={n.email} className="flex flex-col gap-1 rounded-xl bg-ground p-3 text-[14px]">
            <span className="flex flex-wrap items-center gap-2 font-semibold">
              {n.nom}
              {n.aRepondu ? <Badge tone="ok">A déjà répondu</Badge> : null}
              {n.utiliseEnPerso ? <Badge tone="neutral">Utilisé en perso</Badge> : null}
              {n.verification === "a_verifier" ? <Badge tone="warn">À vérifier</Badge> : null}
            </span>
            <span className="flex flex-wrap items-center gap-3">
              {n.telephone ? (
                <a href={`tel:${n.telephone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-11 items-center gap-1 font-semibold underline">
                  <Phone size={16} aria-hidden="true" /> {n.telephone}
                </a>
              ) : (
                <span className="text-muted">{n.email}</span>
              )}
              <button type="button" onClick={() => (setEnCours(n.nom), setNote(""))} className="min-h-11 font-semibold text-accent-text underline">
                Appel passé
              </button>
            </span>
            {enCours === n.nom ? (
              <div className="flex flex-col gap-2">
                <Field id={`note-${r.id}-${n.email}`} label="Ce qu'il a dit (court)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
                <Button variant="secondary" pending={pending} onClick={() => void onAppel(n.nom, note.trim()).then(() => setEnCours(null))}>
                  Noter l&apos;appel
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
