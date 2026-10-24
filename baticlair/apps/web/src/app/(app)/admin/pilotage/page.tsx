"use client";

import { useCallback, useEffect, useState } from "react";
import { BackButton, Button, Card, ErrorNotice, PageTitle, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/**
 * LE TABLEAU DE BORD (Greg, 24 octobre 2026) : une page lisible sur iPhone, sans jargon. Réservé aux admins, après un code
 * reçu par e-mail (double authentification) ; chaque ouverture et chaque détail nominatif sont journalisés côté serveur.
 */
interface Fleche {
  sens: "haut" | "bas" | "egal";
  couleur: "vert" | "rouge" | "gris";
  texte: string;
}
interface Tableau {
  mode: "test" | "reel";
  chiffres: { cle: string; titre: string; valeur: string; detail: string; fleche: Fleche }[];
  croissance: { visites: number; inscriptions: number; inscriptionsAvant: number; installations: number; essais: number; conversion: number | null };
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
  abonnement: { prixHtCentimes: number; tauxTva: number; joursEssaiApresResultats: number; joursEssaiSansDepot: number; joursGrace: number };
}
type Detail = "a_risque" | "essais_semaine" | "paiements_echoues";

const asError = (e: unknown) => (e instanceof ApiError ? e : new ApiError("internal_error", 500));
const pct = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("fr-FR")} %`);
const euros = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;
const COULEUR: Record<Fleche["couleur"], string> = { vert: "text-ok", rouge: "text-danger", gris: "text-muted" };

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
      <BackButton fallback="/groupe" />
      <PageTitle>Tableau de bord</PageTitle>
      {erreur ? <ErrorNotice error={erreur} /> : null}
      {!statut && !erreur ? <Spinner /> : null}
      {statut && !statut.admin ? <Card className="p-5 text-[16px]">Cette page est réservée à l&apos;équipe.</Card> : null}
      {statut?.admin && !statut.deuxFacteurs ? <Code onOk={() => setStatut({ admin: true, deuxFacteurs: true })} /> : null}
      {statut?.deuxFacteurs ? <Contenu /> : null}
    </div>
  );
}

/** La double authentification : un code à 6 chiffres reçu par e-mail. */
function Code({ onOk }: { onOk: () => void }) {
  const [envoye, setEnvoye] = useState(false);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  async function run(f: () => Promise<unknown>, apres: () => void) {
    setPending(true);
    setError(null);
    try {
      await f();
      apres();
    } catch (e) {
      setError(asError(e));
    } finally {
      setPending(false);
    }
  }
  return (
    <Card className="flex flex-col gap-4 p-5">
      <p className="text-[16px]">Pour ouvrir le tableau de bord, je t&apos;envoie un code à 6 chiffres par e-mail.</p>
      {error ? <ErrorNotice error={error} /> : null}
      {!envoye ? (
        <Button onClick={() => void run(() => api("/v1/admin/pilotage/code", { method: "POST" }), () => setEnvoye(true))} pending={pending} className="self-start">
          Recevoir mon code
        </Button>
      ) : (
        <>
          <label htmlFor="code" className="text-[15px] font-semibold">
            Code reçu par e-mail
          </label>
          <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="min-h-12 w-40 rounded-xl border border-line bg-surface px-4 text-[20px] tracking-[0.3em] tabular-nums" />
          <Button onClick={() => void run(() => api("/v1/admin/pilotage/code/verifier", { method: "POST", body: { code } }), onOk)} pending={pending} disabled={code.length !== 6} className="self-start">
            Ouvrir le tableau de bord
          </Button>
        </>
      )}
    </Card>
  );
}

function Ligne({ titre, valeur, onDetail }: { titre: string; valeur: string; onDetail?: () => void }) {
  const corps = (
    <>
      <span className="text-[15px]">{titre}</span>
      <span className="text-[17px] font-extrabold tabular-nums">{valeur}</span>
    </>
  );
  return (
    <li>
      {onDetail ? (
        <button type="button" onClick={onDetail} className="flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left underline decoration-dotted underline-offset-4">
          {corps}
        </button>
      ) : (
        <div className="flex min-h-12 items-center justify-between gap-3 py-2">{corps}</div>
      )}
    </li>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section aria-label={titre} className="flex flex-col gap-1">
      <h2 className="text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">{titre}</h2>
      <Card className="px-4 py-1">
        <ul className="divide-y divide-line">{children}</ul>
      </Card>
    </section>
  );
}

function Contenu() {
  const charger = useCallback((signal: AbortSignal) => api<Tableau>("/v1/admin/pilotage", { signal }), []);
  const { data: t, error, reload } = useResource(charger);
  const [detail, setDetail] = useState<{ quoi: Detail; lignes: { entreprise: string; info: string }[] } | null>(null);
  const ouvrir = async (quoi: Detail) => setDetail(await api<{ quoi: Detail; lignes: { entreprise: string; info: string }[] }>(`/v1/admin/pilotage/detail/${quoi}`));
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!t) return <Spinner />;
  const maxEuros = Math.max(1, ...t.ia.parJour.map((j) => j.euros));
  return (
    <div className="flex flex-col gap-5">
      {t.mode === "test" ? <p className="rounded-xl bg-danger px-4 py-2 text-[14px] font-bold text-white">Mode test : les paiements sont simulés</p> : null}
      <div className="grid grid-cols-2 gap-3">
        {t.chiffres.map((c) => (
          <Card key={c.cle} className="flex flex-col gap-1 p-4">
            <span className="text-[13px] font-semibold text-muted">{c.titre}</span>
            <span className="font-display text-[32px] leading-none font-extrabold tabular-nums">{c.valeur}</span>
            <span className={`text-[14px] font-bold ${COULEUR[c.fleche.couleur]}`} aria-label={`Par rapport au mois précédent : ${c.fleche.texte}`}>
              {c.fleche.sens === "haut" ? "↑" : c.fleche.sens === "bas" ? "↓" : "→"} {c.fleche.texte}
              {c.detail ? <span className="ml-1 font-normal text-muted">{c.detail}</span> : null}
            </span>
          </Card>
        ))}
      </div>

      <Section titre="Croissance (ce mois)">
        <Ligne titre="Visites de la page d'accueil" valeur={String(t.croissance.visites)} />
        <Ligne titre="Inscriptions" valeur={`${t.croissance.inscriptions} (avant : ${t.croissance.inscriptionsAvant})`} />
        <Ligne titre="Installations sur l'écran d'accueil" valeur={String(t.croissance.installations)} />
        <Ligne titre="Essais en cours" valeur={String(t.croissance.essais)} />
        <Ligne titre="Essais devenus payants" valeur={pct(t.croissance.conversion)} />
      </Section>

      <Section titre="Fidélité">
        <Ligne titre="Désabonnements ce mois" valeur={`${t.fidelite.desabonnements} (${pct(t.fidelite.tauxDesabonnement)})`} />
        <Ligne titre="Artisans à risque (30 jours sans venir)" valeur={String(t.fidelite.aRisque)} onDetail={() => void ouvrir("a_risque")} />
        <Ligne titre="Essais qui finissent cette semaine" valeur={String(t.fidelite.essaisCetteSemaine)} onDetail={() => void ouvrir("essais_semaine")} />
        <Ligne titre="Paiements refusés" valeur={String(t.fidelite.paiementsEchoues)} onDetail={() => void ouvrir("paiements_echoues")} />
      </Section>
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

      <Section titre="Activité (ce mois)">
        <Ligne titre="Listes" valeur={String(t.activite.listes)} />
        <Ligne titre="Négoces inscrits" valeur={String(t.activite.negoces)} />
        <Ligne titre="Négoces qui répondent" valeur={pct(t.activite.tauxReponse)} />
        <Ligne titre="Commandes" valeur={String(t.activite.commandes)} />
        <Ligne titre="Économies totales des artisans" valeur={t.activite.economiesTotales} />
      </Section>

      <section aria-label="IA" className="flex flex-col gap-1">
        <h2 className="text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">IA, 14 derniers jours</h2>
        <Card className="flex flex-col gap-2 p-4">
          <ul className="flex flex-col gap-1">
            {t.ia.parJour.map((j) => (
              <li key={j.jour} className="flex items-center gap-2 text-[13px] tabular-nums">
                <span className="w-12 shrink-0 text-muted">{j.jour.slice(8, 10)}/{j.jour.slice(5, 7)}</span>
                <span className="h-3 rounded-sm bg-ink" style={{ width: `${Math.max(2, (j.euros / maxEuros) * 60)}%` }} aria-hidden="true" />
                <span className="shrink-0">{euros(j.euros)}</span>
                <span className="shrink-0 text-muted">{j.jetons.toLocaleString("fr-FR")} jetons</span>
              </li>
            ))}
          </ul>
          <p className="text-[15px]">Coût moyen par devis lu : <strong>{t.ia.coutMoyenParDevis === null ? "—" : euros(t.ia.coutMoyenParDevis)}</strong></p>
          <p className="text-[14px] text-muted">Alerte par e-mail au-dessus de {euros(t.ia.seuilJour)} par jour.</p>
        </Card>
      </section>

      <Section titre="Rentabilité (ce mois)">
        <Ligne titre="Revenu HT" valeur={euros(t.rentabilite.revenu)} />
        <Ligne titre="Coût IA" valeur={`− ${euros(t.rentabilite.coutIa)}`} />
        <Ligne titre="Services (hébergement, base, e-mails)" valeur={`− ${euros(t.rentabilite.services)}`} />
        <Ligne titre="Reste" valeur={euros(t.rentabilite.resultat)} />
      </Section>

      <Apprentissage taux={t.apprentissage.tauxDeCorrection} />
      <ReglagesCarte />
      {t.mode === "test" ? <DemoCarte /> : null}

      <Section titre="Derniers accès au tableau de bord">
        {t.acces.map((a, i) => (
          <Ligne key={i} titre={`${a.qui} · ${a.quoi}`} valeur={new Date(a.le).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} />
        ))}
      </Section>
    </div>
  );
}

/** Les règles globales proposées par 3 artisans : validées ou refusées d'un clic. */
function Apprentissage({ taux }: { taux: number | null }) {
  const charger = useCallback((signal: AbortSignal) => api<{ aValider: { id: string; metier: string; phrase: string; artisans: number }[]; validees: number }>("/v1/admin/pilotage/apprentissage", { signal }), []);
  const { data, error, reload, setData } = useResource(charger);
  const decider = async (id: string, decision: "valider" | "refuser") => setData(await api<NonNullable<typeof data>>(`/v1/admin/pilotage/apprentissage/${id}`, { method: "POST", body: { decision } }));
  return (
    <section aria-label="Apprentissage" className="flex flex-col gap-1">
      <h2 className="text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">Apprentissage</h2>
      <Card className="flex flex-col gap-3 p-4">
        <p className="text-[15px]">Listes corrigées ce mois : <strong>{pct(taux)}</strong></p>
        {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
        {data && data.aValider.length === 0 ? <p className="text-[15px] text-muted">Aucune règle à valider.</p> : null}
        {data?.aValider.map((r) => (
          <div key={r.id} className="flex flex-col gap-2 rounded-xl bg-ground p-3">
            <p className="text-[15px]">{r.phrase}</p>
            <p className="text-[13px] text-muted">
              {r.artisans} artisans · {r.metier}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => void decider(r.id, "valider")}>Valider</Button>
              <Button variant="secondary" onClick={() => void decider(r.id, "refuser")}>
                Refuser
              </Button>
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}

function ReglagesCarte() {
  const charger = useCallback((signal: AbortSignal) => api<Reglages>("/v1/admin/pilotage/reglages", { signal }), []);
  const { data, setData } = useResource(charger);
  const [ok, setOk] = useState(false);
  if (!data) return null;
  const champ = (label: string, valeur: number, maj: (n: number) => void, pas = 1) => (
    <label className="flex items-center justify-between gap-3 text-[15px]">
      <span>{label}</span>
      <input type="number" step={pas} min={0} value={valeur} onChange={(e) => maj(Number(e.target.value))} className="min-h-11 w-28 rounded-xl border border-line bg-surface px-3 text-right tabular-nums" />
    </label>
  );
  const a = data.abonnement;
  const majA = (p: Partial<Reglages["abonnement"]>) => setData({ ...data, abonnement: { ...a, ...p } });
  return (
    <section aria-label="Réglages" className="flex flex-col gap-1">
      <h2 className="text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">Réglages</h2>
      <Card className="flex flex-col gap-3 p-4">
        {champ("Prix de l'abonnement (€ HT / mois)", a.prixHtCentimes / 100, (n) => majA({ prixHtCentimes: Math.round(n * 100) }), 0.5)}
        {champ("Essai après les premiers résultats (jours)", a.joursEssaiApresResultats, (n) => majA({ joursEssaiApresResultats: n }))}
        {champ("Essai sans dépôt, au plus (jours)", a.joursEssaiSansDepot, (n) => majA({ joursEssaiSansDepot: n }))}
        {champ("Grâce après un paiement refusé (jours)", a.joursGrace, (n) => majA({ joursGrace: n }))}
        {champ("Alerte IA au-dessus de (€ / jour)", data.seuilIaJourEur, (n) => setData({ ...data, seuilIaJourEur: n }), 0.5)}
        {champ("Services (€ / mois)", data.coutServicesMensuelEur, (n) => setData({ ...data, coutServicesMensuelEur: n }))}
        <Button
          variant="secondary"
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
        <p className="text-[13px] text-muted">Un changement de prix s&apos;annonce aux abonnés 30 jours avant (CGU) et se fait aussi chez Stripe.</p>
      </Card>
    </section>
  );
}

/**
 * LA DÉMO (Greg, 24 octobre 2026) : jouer un cycle complet sans attendre le calendrier, en mode test seulement. Les faux
 * comptes (`@demo.baticlair.fr`) sont exclus des chiffres ; chaque geste est journalisé ; « Tout effacer » les retire.
 */
const GESTES = [
  { geste: "jeu", label: "Créer un jeu de test", fait: (r: Record<string, number>) => `${r.artisans} faux artisans et ${r.negoces} faux négoces dans le 22, ${r.lignes} lignes déposées.` },
  { geste: "cloturer", label: "Clôturer maintenant", fait: (r: Record<string, number>) => `${r.clos} commande close, ${r.grillesEnvoyees} grilles envoyées aux négoces.` },
  { geste: "repondre", label: "Faire répondre les négoces", fait: (r: Record<string, number>) => `${r.reponses} négoces ont répondu (prix fictifs).` },
  { geste: "publier", label: "Publier les résultats", fait: (r: Record<string, number>) => `${r.resultats} résultat publié : les artisans sont prévenus.` },
  { geste: "finir-essai", label: "Finir l'essai", fait: () => "Ton essai est terminé : l'écran de fin d'essai s'affiche." },
  { geste: "echec-paiement", label: "Simuler un échec de paiement", fait: () => "Le prochain paiement de ton compte échoue : 7 jours de grâce." },
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
    <section aria-label="Démo" className="flex flex-col gap-1">
      <h2 className="text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">Démo (mode test)</h2>
      <Card className="flex flex-col gap-3 p-4">
        <p className="text-[15px]">Pour jouer un cycle complet sans attendre. Les faux comptes ne comptent dans aucun chiffre.</p>
        {GESTES.map((g) => (
          <Button key={g.geste} variant="secondary" pending={pending === g.geste} disabled={pending !== null} onClick={() => void faire(g.geste, () => api(`/v1/admin/pilotage/demo/${g.geste}`, { method: "POST" }), g.fait)}>
            {g.label}
          </Button>
        ))}
        <Button variant="secondary" pending={pending === "effacer"} disabled={pending !== null} onClick={() => void faire("effacer", () => api("/v1/admin/pilotage/demo", { method: "DELETE" }), (r) => `Effacé : ${r.artisans} faux artisans, ${r.negoces} faux négoces.`)}>
          Tout effacer
        </Button>
        {message ? <p role="status" className="text-[14px] font-semibold text-ok">{message}</p> : null}
        {error ? <ErrorNotice error={error} /> : null}
      </Card>
    </section>
  );
}
