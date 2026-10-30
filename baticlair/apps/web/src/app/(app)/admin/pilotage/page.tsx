"use client";

import Link from "next/link";
import { CodeAdmin } from "@/components/code-admin";
import { CoutIaGratuitsCarte, HypothesesCarte, InscriptionsCarte, ModeRegroupementCarte, NegocesAVerifierCarte } from "@/components/admin-hypotheses";
import { useCallback, useEffect, useState } from "react";
import { BackButton, Button, Card, ErrorNotice, PageTitle, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/**
 * L'ESPACE ADMIN (Greg, 24 octobre 2026 ; refait le 25 octobre : « compréhensible pour un enfant de 15 ans, ultra
 * intuitif »). En haut, quatre chiffres en mots simples ; puis quatre onglets : « À faire » (ce qui attend une action, avec
 * son nombre), « Chiffres » (chaque bloc a une phrase qui dit à quoi il sert), « Réglages », « Test » (prévisualisation
 * seulement). Réservé aux admins, après un code reçu par e-mail ; chaque ouverture et chaque détail nominatif sont journalisés.
 */
interface Fleche {
  sens: "haut" | "bas" | "egal";
  couleur: "vert" | "rouge" | "gris";
  texte: string;
}
interface Tableau {
  mode: "test" | "reel";
  modeTexte?: string | null;
  demo?: boolean;
  chiffres: { cle: string; titre: string; valeur: string; detail: string; fleche: Fleche }[];
  croissance: { visites: number; inscriptions: number; inscriptionsAvant: number; installations: number; essais: number; conversion: number | null };
  abonnes: { mensuels: number; annuels: number; partAnnuels: number | null; revenuMensuelRecurrent: number; encaisseCeMois: number };
  fidelite: { desabonnements: number; tauxDesabonnement: number | null; aRisque: number; essaisCetteSemaine: number; paiementsEchoues: number };
  activite: { listes: number; negoces: number; tauxReponse: number | null; commandes: number; economiesTotales: string };
  ia: { parJour: { jour: string; jetons: number; euros: number }[]; coutMoyenParDevis: number | null; seuilJour: number };
  rentabilite: { revenu: number; coutIa: number; services: number; resultat: number };
  apprentissage: { aValider: number; tauxDeCorrection: number | null };
  reglages: { seuilIaJourEur: number; coutServicesMensuelEur: number };
  acces: { qui: string; quoi: string; le: string }[];
}
interface Reglages {
  seuilIaJourEur: number;
  coutServicesMensuelEur: number;
  abonnement: { prixHtCentimes: number; prixAnnuelHtCentimes: number; tauxTva: number; joursEssaiApresResultats: number; joursEssaiSansDepot: number; joursGrace: number; joursRappelAnnuel: number };
}
type Detail = "a_risque" | "essais_semaine" | "paiements_echoues";
type Onglet = "faire" | "chiffres" | "reglages" | "test";

const asError = (e: unknown) => (e instanceof ApiError ? e : new ApiError("internal_error", 500));
const pct = (n: number | null) => (n === null ? "pas encore" : `${n.toLocaleString("fr-FR")} %`);
const euros = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;
const COULEUR: Record<Fleche["couleur"], string> = { vert: "text-ok", rouge: "text-danger", gris: "text-muted" };

/** Les quatre chiffres du haut, dits avec des mots de tous les jours (la clé vient du serveur, le titre d'ici). */
const GRANDS_CHIFFRES: Record<string, { titre: string; aide: string }> = {
  actifs: { titre: "Artisans actifs", aide: "venus au moins une fois en 30 jours" },
  payants: { titre: "Artisans qui paient", aide: "abonnés en ce moment" },
  revenu: { titre: "Argent par mois", aide: "ce que rapportent les abonnements, hors taxes" },
  ia: { titre: "Coût de l'IA ce mois", aide: "ce qu'on paie pour lire les devis" },
};

export default function PilotagePage() {
  const charger = useCallback((signal: AbortSignal) => api<{ admin: boolean; deuxFacteurs: boolean }>("/v1/admin/pilotage/statut", { signal }), []);
  const [statut, setStatut] = useState<{ admin: boolean; deuxFacteurs: boolean } | null>(null);
  const [erreur, setErreur] = useState<ApiError | null>(null);
  useEffect(() => {
    const c = new AbortController();
    charger(c.signal).then(setStatut, (e: unknown) => setErreur(asError(e)));
    return () => c.abort();
  }, [charger]);
  return (
    <div className="flex flex-col gap-4">
      <BackButton fallback="/" />
      <PageTitle>Espace admin</PageTitle>
      <p className="text-[16px] text-muted">Ici, tu vois si Mobiiz marche, ce qu&apos;il reste à faire, et tu règles l&apos;app.</p>
      {erreur ? <ErrorNotice error={erreur} /> : null}
      {!statut && !erreur ? <Spinner /> : null}
      {statut && !statut.admin ? <Card className="p-5 text-[16px]">Cette page est réservée à l&apos;équipe.</Card> : null}
      {statut?.admin && !statut.deuxFacteurs ? <CodeAdmin quoi="l'espace admin" onOk={() => setStatut({ admin: true, deuxFacteurs: true })} /> : null}
      {statut?.deuxFacteurs ? <Contenu /> : null}
    </div>
  );
}

/** Un bloc : un titre lisible, une phrase qui dit à quoi il sert, puis son contenu. */
function Bloc({ titre, aide, children, label }: { titre: string; aide?: string; children: React.ReactNode; label?: string }) {
  return (
    <section aria-label={label ?? titre} className="flex flex-col gap-1.5">
      <h2 className="text-[18px] font-extrabold tracking-[-0.01em]">{titre}</h2>
      {aide ? <p className="text-[14px] leading-snug text-muted">{aide}</p> : null}
      {children}
    </section>
  );
}

function Ligne({ titre, valeur, onDetail }: { titre: string; valeur: string; onDetail?: () => void }) {
  const corps = (
    <>
      <span className="text-[15px]">{titre}</span>
      <span className="flex items-center gap-2 text-[17px] font-extrabold tabular-nums">
        {valeur}
        {onDetail ? <span className="text-[13px] font-semibold text-accent-text">Voir qui</span> : null}
      </span>
    </>
  );
  return (
    <li>
      {onDetail ? (
        <button type="button" onClick={onDetail} className="flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left">
          {corps}
        </button>
      ) : (
        <div className="flex min-h-12 items-center justify-between gap-3 py-2">{corps}</div>
      )}
    </li>
  );
}

function Liste({ children }: { children: React.ReactNode }) {
  return (
    <Card className="px-4 py-1">
      <ul className="divide-y divide-line">{children}</ul>
    </Card>
  );
}

function Contenu() {
  const charger = useCallback((signal: AbortSignal) => api<Tableau>("/v1/admin/pilotage", { signal }), []);
  const { data: t, error, reload } = useResource(charger);
  const [onglet, setOnglet] = useState<Onglet>("faire");
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!t) return <Spinner />;
  const test = Boolean(t.demo ?? t.mode === "test");
  const onglets: [Onglet, string][] = [
    ["faire", "À faire"],
    ["chiffres", "Chiffres"],
    ["reglages", "Réglages"],
    ...(test ? ([["test", "Test"]] as [Onglet, string][]) : []),
  ];
  return (
    <div className="flex flex-col gap-5">
      {t.mode === "test" ? <p className="rounded-xl bg-danger px-4 py-2 text-[14px] font-bold text-white">Site de test : rien n&apos;est vraiment payé. {t.modeTexte ? `(${t.modeTexte})` : ""}</p> : null}

      <section aria-label="En bref" className="grid grid-cols-2 gap-3">
        {t.chiffres.map((c) => {
          const mots = GRANDS_CHIFFRES[c.cle] ?? { titre: c.titre, aide: c.detail };
          return (
            <Card key={c.cle} className="flex flex-col gap-1 p-4">
              <span className="text-[14px] font-bold">{mots.titre}</span>
              <span className="font-display text-[32px] leading-none font-extrabold tabular-nums">{c.valeur}</span>
              <span className="text-[13px] leading-snug text-muted">{mots.aide}</span>
              <span className={`text-[13px] font-bold ${COULEUR[c.fleche.couleur]}`} aria-label={`Par rapport au mois dernier : ${c.fleche.texte}`}>
                {c.fleche.sens === "haut" ? "↑" : c.fleche.sens === "bas" ? "↓" : "→"} {c.fleche.texte} <span className="font-normal text-muted">vs mois dernier</span>
              </span>
            </Card>
          );
        })}
      </section>

      <div role="tablist" aria-label="Parties de l'espace admin" className="sticky top-0 z-10 -mx-1 grid gap-1 rounded-2xl bg-ground p-1" style={{ gridTemplateColumns: `repeat(${onglets.length}, minmax(0, 1fr))` }}>
        {onglets.map(([o, l]) => (
          <button
            key={o}
            type="button"
            role="tab"
            aria-selected={onglet === o}
            onClick={() => setOnglet(o)}
            className={`min-h-12 rounded-xl px-2 text-[15px] font-bold ${onglet === o ? "bg-surface shadow-card" : "text-muted"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {onglet === "faire" ? <AFaire t={t} /> : null}
      {onglet === "chiffres" ? <Chiffres t={t} /> : null}
      {onglet === "reglages" ? <ReglagesOnglet t={t} /> : null}
      {onglet === "test" && test ? <DemoCarte /> : null}
    </div>
  );
}

/** Ce qui attend un geste de l'admin, avec son nombre ; « Rien à faire » quand tout est à jour. */
function AFaire({ t }: { t: Tableau }) {
  const chasseur = useCallback((signal: AbortSignal) => api<{ chasseur: boolean; aTraiter: number }>("/v1/chasseur/statut", { signal }), []);
  const { data: ch } = useResource(chasseur);
  const [detail, setDetail] = useState<{ quoi: Detail; lignes: { entreprise: string; info: string }[] } | null>(null);
  const ouvrir = async (quoi: Detail) => setDetail(await api<{ quoi: Detail; lignes: { entreprise: string; info: string }[] }>(`/v1/admin/pilotage/detail/${quoi}`));
  const aNegocier = ch?.aTraiter ?? 0;
  return (
    <div className="flex flex-col gap-6">
      <Bloc titre="Regroupements à négocier" aide="Des artisans veulent acheter la même chose : appelle les négoces pour obtenir un prix de groupe.">
        <Card className="flex items-center justify-between gap-3 p-4">
          <span className="text-[16px] font-semibold">{aNegocier === 0 ? "Rien en attente." : `${aNegocier} en attente d'une offre`}</span>
          <Link href="/admin/chasseur" className="pressable inline-flex min-h-12 items-center rounded-full bg-accent px-5 text-[15px] font-bold text-on-accent">
            Y aller
          </Link>
        </Card>
      </Bloc>

      <NegocesAVerifierCarte />

      <Apprentissage taux={t.apprentissage.tauxDeCorrection} />

      <Bloc titre="Artisans à relancer" aide="Touche une ligne pour voir les noms et les appeler. L'ouverture est notée au journal.">
        <Liste>
          <Ligne titre="Cartes bancaires refusées" valeur={String(t.fidelite.paiementsEchoues)} onDetail={() => void ouvrir("paiements_echoues")} />
          <Ligne titre="Essais qui finissent cette semaine" valeur={String(t.fidelite.essaisCetteSemaine)} onDetail={() => void ouvrir("essais_semaine")} />
          <Ligne titre="Pas venus depuis 30 jours" valeur={String(t.fidelite.aRisque)} onDetail={() => void ouvrir("a_risque")} />
        </Liste>
        {detail ? (
          <Card className="flex flex-col gap-2 p-4">
            <p className="text-[13px] text-muted">Détail ouvert et noté au journal. Rien ne s&apos;exporte.</p>
            {detail.lignes.length === 0 ? <p className="text-[15px]">Personne.</p> : null}
            <ul className="divide-y divide-line">
              {detail.lignes.map((l, i) => (
                <li key={i} className="flex justify-between gap-3 py-2 text-[15px]">
                  <span className="font-semibold">{l.entreprise}</span>
                  <span className="text-muted">{l.info}</span>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setDetail(null)} className="min-h-11 self-start text-[15px] font-semibold underline">
              Fermer
            </button>
          </Card>
        ) : null}
      </Bloc>

      <Bloc titre="Les autres écrans" aide="Pour les commandes communes du mois et les négoces.">
        <Card className="flex flex-col gap-1 p-2">
          <Link href="/admin/groupe" className="flex min-h-12 items-center justify-between rounded-xl px-3 text-[16px] font-semibold hover:bg-ground">
            Commandes communes et négoces <span aria-hidden="true">→</span>
          </Link>
          <Link href="/admin/chasseur" className="flex min-h-12 items-center justify-between rounded-xl px-3 text-[16px] font-semibold hover:bg-ground">
            Écran du chasseur d&apos;opportunités <span aria-hidden="true">→</span>
          </Link>
          <Link href="/admin/achats-groupes" className="flex min-h-12 items-center justify-between rounded-xl px-3 text-[16px] font-semibold hover:bg-ground">
            Achats groupés <span aria-hidden="true">→</span>
          </Link>
          <Link href="/admin/emails" className="flex min-h-12 items-center justify-between rounded-xl px-3 text-[16px] font-semibold hover:bg-ground">
            E-mails mis de côté <span aria-hidden="true">→</span>
          </Link>
          <Link href="/admin/catalogue" className="flex min-h-12 items-center justify-between rounded-xl px-3 text-[16px] font-semibold hover:bg-ground">
            Catalogue <span aria-hidden="true">→</span>
          </Link>
        </Card>
      </Bloc>
    </div>
  );
}

function Chiffres({ t }: { t: Tableau }) {
  const maxEuros = Math.max(1, ...t.ia.parJour.map((j) => j.euros));
  return (
    <div className="flex flex-col gap-6">
      <Bloc titre="Nouveaux venus (ce mois)" aide="Combien de gens découvrent Mobiiz et l'essaient.">
        <Liste>
          <Ligne titre="Visites du site" valeur={String(t.croissance.visites)} />
          <Ligne titre={`Comptes créés (mois dernier : ${t.croissance.inscriptionsAvant})`} valeur={String(t.croissance.inscriptions)} />
          <Ligne titre="Ajoutés sur l'écran du téléphone" valeur={String(t.croissance.installations)} />
          <Ligne titre="En période d'essai" valeur={String(t.croissance.essais)} />
          <Ligne titre="Essais qui finissent par payer" valeur={pct(t.croissance.conversion)} />
        </Liste>
      </Bloc>

      <Bloc titre="Qui paie" aide="Les abonnés, et l'argent que ça rapporte.">
        <Liste>
          <Ligne titre="Paient chaque mois" valeur={String(t.abonnes.mensuels)} />
          <Ligne titre={`Paient à l'année (${pct(t.abonnes.partAnnuels)} des abonnés)`} valeur={String(t.abonnes.annuels)} />
          <Ligne titre="Argent qui rentre chaque mois" valeur={euros(t.abonnes.revenuMensuelRecurrent)} />
          <Ligne titre="Argent reçu ce mois" valeur={euros(t.abonnes.encaisseCeMois)} />
        </Liste>
      </Bloc>

      <Bloc titre="Qui part" aide="Ceux qui arrêtent ou risquent d'arrêter. Les noms sont dans « À faire ».">
        <Liste>
          <Ligne titre={`Ont arrêté ce mois (${pct(t.fidelite.tauxDesabonnement)})`} valeur={String(t.fidelite.desabonnements)} />
          <Ligne titre="Pas venus depuis 30 jours" valeur={String(t.fidelite.aRisque)} />
        </Liste>
      </Bloc>

      <Bloc titre="Ce qui se passe dans l'app (ce mois)" aide="Est-ce que les artisans s'en servent vraiment ?">
        <Liste>
          <Ligne titre="Listes de matériaux faites" valeur={String(t.activite.listes)} />
          <Ligne titre="Négoces inscrits" valeur={String(t.activite.negoces)} />
          <Ligne titre="Négoces qui répondent" valeur={pct(t.activite.tauxReponse)} />
          <Ligne titre="Commandes passées" valeur={String(t.activite.commandes)} />
          <Ligne titre="Argent économisé par les artisans" valeur={t.activite.economiesTotales} />
        </Liste>
      </Bloc>

      <Bloc titre="Coût de l'IA (14 derniers jours)" aide="Chaque devis lu par l'IA coûte un peu. Une barre par jour : plus elle est longue, plus ça a coûté." label="IA">
        <Card className="flex flex-col gap-2 p-4">
          <ul className="flex flex-col gap-1">
            {t.ia.parJour.map((j) => (
              <li key={j.jour} className="flex items-center gap-2 text-[13px] tabular-nums">
                <span className="w-12 shrink-0 text-muted">
                  {j.jour.slice(8, 10)}/{j.jour.slice(5, 7)}
                </span>
                <span className={`h-3 rounded-sm ${j.euros > t.ia.seuilJour ? "bg-danger" : "bg-ink"}`} style={{ width: `${Math.max(2, (j.euros / maxEuros) * 70)}%` }} aria-hidden="true" />
                <span className="shrink-0">{euros(j.euros)}</span>
              </li>
            ))}
          </ul>
          <p className="text-[15px]">
            Un devis lu coûte en moyenne <strong>{t.ia.coutMoyenParDevis === null ? "—" : euros(t.ia.coutMoyenParDevis)}</strong>.
          </p>
          <p className="text-[14px] text-muted">Tu reçois un e-mail si une journée dépasse {euros(t.ia.seuilJour)} (barre rouge).</p>
        </Card>
      </Bloc>
      <CompteIaCarte />

      <Bloc titre="Est-ce qu'on gagne de l'argent ? (ce mois)" aide="Ce qui rentre, moins ce qu'on paie pour faire tourner l'app.">
        <Liste>
          <Ligne titre="Argent qui rentre (hors taxes)" valeur={euros(t.rentabilite.revenu)} />
          <Ligne titre="Moins l'IA" valeur={`− ${euros(t.rentabilite.coutIa)}`} />
          <Ligne titre="Moins l'hébergement, la base, les e-mails" valeur={`− ${euros(t.rentabilite.services)}`} />
          <Ligne titre="Il reste" valeur={euros(t.rentabilite.resultat)} />
        </Liste>
      </Bloc>

      <HypothesesCarte />
      <CoutIaGratuitsCarte />
    </div>
  );
}

function ReglagesOnglet({ t }: { t: Tableau }) {
  return (
    <div className="flex flex-col gap-6">
      <ModeRegroupementCarte />
      <InscriptionsCarte />
      <ReglagesCarte />
      <Bloc titre="Qui est venu ici" aide="Les 10 dernières visites de l'espace admin, pour la sécurité.">
        <Liste>
          {t.acces.map((a, i) => (
            <Ligne key={i} titre={`${a.qui} · ${a.quoi}`} valeur={new Date(a.le).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} />
          ))}
        </Liste>
      </Bloc>
    </div>
  );
}

/** Les règles globales proposées par 3 artisans : validées ou refusées d'un clic. */
function Apprentissage({ taux }: { taux: number | null }) {
  const charger = useCallback((signal: AbortSignal) => api<{ aValider: { id: string; metier: string; phrase: string; artisans: number }[]; validees: number }>("/v1/admin/pilotage/apprentissage", { signal }), []);
  const { data, error, reload, setData } = useResource(charger);
  const decider = async (id: string, decision: "valider" | "refuser") => setData(await api<NonNullable<typeof data>>(`/v1/admin/pilotage/apprentissage/${id}`, { method: "POST", body: { decision } }));
  return (
    <Bloc
      titre={`Corrections proposées par les artisans${data && data.aValider.length > 0 ? ` (${data.aValider.length})` : ""}`}
      aide={`Quand 3 artisans corrigent la même chose, l'app te demande si elle doit l'appliquer pour tout le monde. Ce mois, ${pct(taux)} des listes ont été corrigées.`}
      label="Apprentissage"
    >
      <Card className="flex flex-col gap-3 p-4">
        {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
        {data && data.aValider.length === 0 ? <p className="text-[15px] text-muted">Rien à décider.</p> : null}
        {data?.aValider.map((r) => (
          <div key={r.id} className="flex flex-col gap-2 rounded-xl bg-ground p-3">
            <p className="text-[15px]">{r.phrase}</p>
            <p className="text-[13px] text-muted">
              {r.artisans} artisans · {r.metier}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => void decider(r.id, "valider")}>Oui, pour tout le monde</Button>
              <Button variant="secondary" onClick={() => void decider(r.id, "refuser")}>
                Non
              </Button>
            </div>
          </div>
        ))}
      </Card>
    </Bloc>
  );
}

function ReglagesCarte() {
  const charger = useCallback((signal: AbortSignal) => api<Reglages>("/v1/admin/pilotage/reglages", { signal }), []);
  const { data, setData } = useResource(charger);
  const [ok, setOk] = useState(false);
  if (!data) return null;
  const champ = (label: string, aide: string, valeur: number, maj: (n: number) => void, pas = 1) => (
    <label className="flex items-center justify-between gap-3 text-[15px]">
      <span className="flex flex-col">
        <span className="font-semibold">{label}</span>
        <span className="text-[13px] text-muted">{aide}</span>
      </span>
      <input type="number" step={pas} min={0} value={valeur} onChange={(e) => maj(Number(e.target.value))} className="min-h-11 w-28 shrink-0 rounded-xl border border-line bg-surface px-3 text-right tabular-nums" />
    </label>
  );
  const a = data.abonnement;
  const majA = (p: Partial<Reglages["abonnement"]>) => setData({ ...data, abonnement: { ...a, ...p } });
  return (
    <Bloc titre="Prix et durées" aide="Change un chiffre, puis appuie sur « Enregistrer »." label="Réglages">
      <Card className="flex flex-col gap-4 p-4">
        {champ("Prix au mois", "en € hors taxes", a.prixHtCentimes / 100, (n) => majA({ prixHtCentimes: Math.round(n * 100) }), 0.5)}
        {champ("Prix à l'année", "en € hors taxes", a.prixAnnuelHtCentimes / 100, (n) => majA({ prixAnnuelHtCentimes: Math.round(n * 100) }), 1)}
        {champ("Rappel avant de renouveler l'année", "en jours", a.joursRappelAnnuel, (n) => majA({ joursRappelAnnuel: n }))}
        {champ("Essai gratuit après les premiers prix", "en jours", a.joursEssaiApresResultats, (n) => majA({ joursEssaiApresResultats: n }))}
        {champ("Essai gratuit au plus, sans liste", "en jours", a.joursEssaiSansDepot, (n) => majA({ joursEssaiSansDepot: n }))}
        {champ("Délai après une carte refusée", "en jours, avant de couper", a.joursGrace, (n) => majA({ joursGrace: n }))}
        {champ("Alerte si l'IA coûte plus de", "en € par jour", data.seuilIaJourEur, (n) => setData({ ...data, seuilIaJourEur: n }), 0.5)}
        {champ("Coût de l'hébergement", "en € par mois", data.coutServicesMensuelEur, (n) => setData({ ...data, coutServicesMensuelEur: n }))}
        <Button
          className="self-start"
          onClick={() =>
            void api<Reglages>("/v1/admin/pilotage/reglages", { method: "PUT", body: data }).then((r) => {
              setData(r);
              setOk(true);
            })
          }
        >
          Enregistrer
        </Button>
        {ok ? <p role="status" className="text-[14px] font-semibold text-ok">Enregistré.</p> : null}
        <p className="text-[13px] text-muted">Un nouveau prix doit être annoncé aux abonnés 30 jours avant, et changé aussi chez Stripe.</p>
      </Card>
    </Bloc>
  );
}

/**
 * LA DÉMO (Greg, 24 octobre 2026) : jouer un cycle complet sans attendre le calendrier, en mode test seulement. Les faux
 * comptes (`@demo.mobiiz.fr`) sont exclus des chiffres ; chaque geste est journalisé ; « Tout effacer » les retire.
 */
const GESTES = [
  { geste: "jeu", label: "Créer un jeu de test", aide: "Ajoute de faux artisans et de faux négoces pour essayer.", fait: (r: Record<string, number>) => `${r.artisans} faux artisans et ${r.negoces} faux négoces dans le 22 (un généraliste, deux spécialistes), ${r.lignes} lignes déposées.${r.pourToi ? " Ta liste de démonstration (couverture et placo) est dans la commande." : ""}${r.negocies ? " Deux regroupements négociés (ardoise avec offre, zinc en collecte) sont dans Regroupements et sur l'écran du chasseur." : ""}` },
  { geste: "cloturer", label: "Clôturer maintenant", aide: "Fait comme si la date de la commande du mois était passée.", fait: (r: Record<string, number>) => `${r.clos} commande close, ${r.grillesEnvoyees} grilles envoyées aux négoces.` },
  { geste: "repondre", label: "Faire répondre les négoces", aide: "Les faux négoces donnent des prix inventés.", fait: (r: Record<string, number>) => `${r.reponses} négoces ont répondu (prix fictifs).` },
  { geste: "publier", label: "Publier les résultats", aide: "Les artisans voient les prix.", fait: (r: Record<string, number>) => `${r.resultats} résultat publié : les artisans sont prévenus.` },
  { geste: "finir-essai", label: "Finir l'essai", aide: "Pour voir l'écran de fin d'essai sur ton compte.", fait: () => "Ton essai est terminé : l'écran de fin d'essai s'affiche." },
  { geste: "echec-paiement", label: "Simuler un échec de paiement", aide: "Pour voir ce qui se passe quand une carte est refusée.", fait: () => "Le prochain paiement de ton compte échoue : 7 jours de grâce." },
  { geste: "purger-recettes", label: "Purger les recettes", aide: "Retire les faux négoces laissés par les tests automatiques.", fait: (r: Record<string, number>) => `${r.negoces} faux négoces des recettes retirés (ceux de la démo restent).` },
] as const;

function DemoCarte() {
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  async function faire(geste: string, appel: () => Promise<unknown>, texte: (r: Record<string, number>) => string) {
    setPending(geste);
    setError(null);
    setMessage(null);
    try {
      setMessage(texte((await appel()) as Record<string, number>));
    } catch (e) {
      setError(asError(e));
    } finally {
      setPending(null);
    }
  }
  return (
    <Bloc titre="Essayer sans attendre" aide="Seulement sur le site de test. Les faux comptes ne comptent dans aucun chiffre. Fais les étapes dans l'ordre." label="Démo">
      <Card className="flex flex-col gap-3 p-4">
        {message ? <p role="status" className="rounded-xl bg-ok-bg p-3 text-[14px] font-semibold text-ok">{message}</p> : null}
        {error ? <ErrorNotice error={error} /> : null}
        <ol className="flex flex-col gap-3">
          {GESTES.map((g, i) => (
            <li key={g.geste} className="flex flex-col gap-1">
              <Button variant="secondary" pending={pending === g.geste} disabled={pending !== null} onClick={() => void faire(g.geste, () => api(`/v1/admin/pilotage/demo/${g.geste}`, { method: "POST" }), g.fait)}>
                {`${i + 1}. ${g.label}`}
              </Button>
              <span className="px-1 text-[13px] text-muted">{g.aide}</span>
            </li>
          ))}
        </ol>
        <Button variant="secondary" pending={pending === "effacer"} disabled={pending !== null} onClick={() => void faire("effacer", () => api("/v1/admin/pilotage/demo", { method: "DELETE" }), (r) => `Effacé : ${r.artisans} faux artisans, ${r.negoces} faux négoces.`)}>
          Tout effacer
        </Button>
      </Card>
    </Bloc>
  );
}

/**
 * Le compte Anthropic de la clé (Greg, 27 octobre 2026 : recharger le bon compte sans jamais voir la clé) : l'identifiant
 * d'organisation, à comparer avec celui de la console Anthropic (Settings, Organization).
 */
function CompteIaCarte() {
  const charger = useCallback(
    (signal: AbortSignal) => api<{ variable: string | null; organisation: string | null; etat: "ok" | "sans_cle" | "refusee" | "injoignable" }>("/v1/admin/pilotage/compte-ia", { signal }),
    [],
  );
  const { data } = useResource(charger);
  if (!data) return null;
  const etat = { ok: "La clé fonctionne.", refusee: "La clé est refusée (crédit épuisé ou clé désactivée).", injoignable: "Anthropic ne répond pas pour l'instant.", sans_cle: "Pas de clé posée." }[data.etat];
  return (
    <Bloc titre="Compte Anthropic de la clé" aide="Pour recharger le bon compte : compare cet identifiant avec celui de la console Anthropic (Settings, Organization). La clé n'est jamais affichée." label="Compte Anthropic">
      <Liste>
        <Ligne titre="Identifiant d'organisation" valeur={data.organisation ?? "—"} />
        <Ligne titre="Variable lue" valeur={data.variable ?? "—"} />
        <Ligne titre="État" valeur={etat} />
      </Liste>
    </Bloc>
  );
}
