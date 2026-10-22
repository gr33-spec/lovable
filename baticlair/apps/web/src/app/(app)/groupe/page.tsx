"use client";

import { AideBouton } from "@/components/aide";
import { quantiteFr } from "@/components/groupe";
import Link from "next/link";
import { Check, FileText, Store, Tag, Truck, Users } from "lucide-react";
import { useCallback, useState } from "react";
import { Button, ButtonLink, Card, ErrorNotice, PageTitle, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useResource } from "@/lib/use-resource";
import { NOM, nom, noms } from "@/lib/nom";
import { InviterCollegue } from "@/components/inviter";

interface EtatGroupe {
  eligible: boolean;
  raisons: string[];
  siret: { renseigne: boolean; verifie: boolean };
  etapes: { siret: boolean; devis: boolean; negoces: boolean };
  admin: boolean;
  /** Exclu du groupé (deux désistements en 12 mois) jusqu'à cette date, AAAA-MM-JJ. */
  excluJusquau: string | null;
}
interface BesoinLot {
  id: string;
  designation: string;
  quantite: string;
  unite: string;
  statut: "en_attente" | "signe" | "retire" | "engage" | "commande" | "livre";
  projectId: string;
  chantier: string;
  lot: { numero: number; statut: string } | null;
  offre: { prixUnitaire: string; negoce: string; dateLivraison: string | null } | null;
  bon: { id: string; envoyeLe: string | null; livraison: { statut: string; datePrevue: string | null } | null } | null;
  /** Nouveau cap (22 octobre) : le compteur du groupe (« 30 couvreurs, 15 demandes envoyées, 3 devis reçus, meilleur prix 1,12 € »). */
  compteur?: { phrase: string };
}

/** L'accroche selon le métier du compte (décision du fondateur, 2026-10-20) ; couvreur par défaut si le métier est inconnu. */
const ACCROCHES: Record<string, { matiere: string; metiers: string }> = {
  roofing: { matiere: "d'ardoise", metiers: "couvreurs" },
  carpentry: { matiere: "de bois de charpente", metiers: "charpentiers" },
  masonry: { matiere: "de parpaings", metiers: "maçons" },
  drywall: { matiere: "de plaques de plâtre", metiers: "plaquistes" },
  painting: { matiere: "de peinture", metiers: "peintres" },
  tiling: { matiere: "de carrelage", metiers: "carreleurs" },
  flooring: { matiere: "de parquet", metiers: "poseurs de sols" },
  electrical: { matiere: "de câble", metiers: "électriciens" },
  plumbing: { matiere: "de tube", metiers: "plombiers" },
  hvac: { matiere: "de gaine", metiers: "chauffagistes" },
  joinery: { matiere: "de menuiseries", metiers: "menuisiers" },
};
export function accroche(metier: string | undefined): string {
  const a = (metier && ACCROCHES[metier]) || ACCROCHES.roofing!;
  return `Tes commandes ${a.matiere} regroupées avec les autres ${a.metiers} du département, un seul négoce, un seul prix.`;
}

const STATUT_LOT: Record<string, string> = {
  ouvert: "On attend d'autres artisans",
  forme: "Commande prête, on prépare la demande",
  envoye: "Demande partie aux négoces, réponse sous 7 jours",
  choisi: "Négoce retenu",
  clos: "Aucun négoce n'a répondu, commande fermée",
  annule: "Commande annulée",
};

/**
 * L'ONGLET « GROUPÉ » (demande du fondateur, 2026-10-20) : visible même sans SIRET ni devis. Une phrase et trois étapes
 * illustrées disent ce que ça fait (section 2 du parcours groupé) ; puis ce qui manque pour en profiter, coché au fur et
 * à mesure ; « Mes lots » dès que le groupé est ouvert à l'entreprise (SIRET vérifié), la liste des manques au-dessus tant qu'il en reste.
 */
export default function GroupePage() {
  const fetchEtat = useCallback((signal: AbortSignal) => api<EtatGroupe>("/v1/groupe", { signal }), []);
  const etat = useResource(fetchEtat);
  const { company } = useSession();
  const [pending, setPending] = useState(false);
  const [siretErreur, setSiretErreur] = useState<string | null>(null);

  if (etat.error && !etat.data) return <ErrorNotice error={etat.error} onRetry={etat.reload} />;
  if (!etat.data) return <Spinner />;
  const { etapes, siret } = etat.data;
  const tout = etapes.siret && etapes.devis && etapes.negoces;

  async function verifierSiret() {
    setPending(true);
    setSiretErreur(null);
    try {
      const r = await api<{ verifie: boolean; statut: string }>("/v1/groupe/siret", { method: "POST" });
      if (!r.verifie) setSiretErreur(r.statut === "ferme" ? "Ce SIRET est fermé à l'INSEE." : r.statut === "inconnu" ? "Ce SIRET est inconnu à l'INSEE : vérifie-le dans Compte." : "La vérification est indisponible pour l'instant, réessaie plus tard.");
      etat.reload();
    } catch (e) {
      setSiretErreur(e instanceof ApiError && e.reason === "siret_invalide" ? "Ce SIRET n'a pas 14 chiffres valides : corrige-le dans Compte." : "La vérification n'a pas abouti, réessaie dans un instant.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <PageTitle>{NOM}</PageTitle>
        <AideBouton sujet="groupe" />
      </div>
      {etat.data.admin ? (
        <Link href="/admin/groupe" className="min-h-10 self-start py-2 text-sm font-bold text-accent-text underline decoration-dotted underline-offset-4">
          {`Admin ${nom}`}
        </Link>
      ) : null}
      {etat.data.raisons.includes("exclu_du_groupe") ? (
        <p role="status" className="rounded-3xl bg-warn-bg p-4 font-semibold text-warn">
          {`La ${nom} t'est fermée`}{etat.data.excluJusquau ? ` jusqu'au ${jourFr(etat.data.excluJusquau)}` : ""} : deux commandes annulées en 12 mois. Tes commandes en cours restent visibles ci-dessous.
        </p>
      ) : null}
      {etat.data.raisons.includes("departement_ferme") ? (
        <p role="status" className="rounded-3xl bg-warn-bg p-4 font-semibold text-warn">
          {`La ${nom} n'est pas encore ouverte dans ton département.`} On te prévient dès que c&apos;est le cas.
        </p>
      ) : null}
      <Card className="flex flex-col gap-4 p-4">
        <p className="text-[17px] leading-snug font-extrabold">{accroche(company?.trades[0])}</p>
        {/* Revue à froid (21 octobre) : une fois les trois étapes faites, « Comment ça marche » se replie derrière un lien. */}
        {tout ? (
          <details className="group">
            <summary className="min-h-10 cursor-pointer list-none text-[14px] font-bold text-accent-text">
              <span className="group-open:hidden">Comment ça marche</span>
              <span className="hidden group-open:inline">Replier</span>
            </summary>
            <Etapes />
          </details>
        ) : (
          <Etapes />
        )}
        <p className="text-[13px] text-muted">Gratuit pour toi. Personne ne voit ton nom ni tes chantiers.</p>
      </Card>
      {/* Landing du 22 octobre : plus on est nombreux, plus on négocie ; le même bloc que la page publique. */}
      <InviterCollegue texte="Plus on est nombreux sur la même ligne, plus les négoces baissent leurs prix." />

      {tout ? null : (
        <Card className="flex flex-col gap-3 p-4">
          <h2 className="font-display text-xl font-extrabold">Pour en profiter</h2>
          <ul aria-label="Ce qui manque" className="flex flex-col gap-2">
            <Etape fait={etapes.siret} titre="Renseigne ton SIRET">
              {siret.renseigne ? (
                <div className="flex flex-col gap-1">
                  <Button variant="secondary" className="min-h-10 self-start px-3.5 text-[14px]" pending={pending} onClick={verifierSiret}>
                    Vérifier mon SIRET
                  </Button>
                  {siretErreur ? <p className="text-[13px] font-semibold text-warn">{siretErreur}</p> : null}
                </div>
              ) : (
                <ButtonLink href="/compte" variant="secondary" className="min-h-10 self-start px-3.5 text-[14px]">
                  Renseigner mon SIRET
                </ButtonLink>
              )}
            </Etape>
            <Etape fait={etapes.devis} titre="Donne ta liste">
              <ButtonLink href="/chantiers/nouveau" variant="secondary" className="min-h-10 self-start px-3.5 text-[14px]">
                Donner ma liste
              </ButtonLink>
            </Etape>
            <Etape fait={etapes.negoces} titre="Ajoute tes négoces">
              <ButtonLink href="/fournisseurs?negoce" variant="secondary" className="min-h-10 self-start px-3.5 text-[14px]">
                Ajouter un négoce
              </ButtonLink>
            </Etape>
          </ul>
        </Card>
      )}
      {/* Un artisan déjà dans un lot (proposé depuis « Ton chantier ») voit toujours ses lots, même sans négoce à lui. */}
      {etat.data.eligible || etat.data.raisons.includes("exclu_du_groupe") ? <MesLots /> : null}
    </>
  );
}

function Etapes() {
  return (
    <ol aria-label="Comment ça marche" className="grid grid-cols-3 gap-2 group-open:mt-2">
      {[
        { icon: FileText, titre: "1. Tu proposes", texte: "Une ligne de ta liste, la date de livraison voulue, « chantier signé »." },
        { icon: Users, titre: "2. On regroupe", texte: "Même produit, même département : une seule commande, un seul négoce." },
        { icon: Tag, titre: "3. Tu commandes", texte: `Au prix de la ${nom}, sur ton compte, livré sur ton chantier.` },
      ].map((e) => (
        <li key={e.titre} className="flex flex-col gap-1.5 rounded-2xl bg-ground p-3">
          <e.icon size={22} aria-hidden="true" className="text-accent-text" />
          <span className="text-[13px] font-extrabold">{e.titre}</span>
          <span className="text-[12px] leading-snug text-muted">{e.texte}</span>
        </li>
      ))}
    </ol>
  );
}

function Etape({ fait, titre, children }: { fait: boolean; titre: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-ground p-3">
      <span
        aria-label={fait ? "Fait" : "À faire"}
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${fait ? "bg-mark-ok text-white" : "border-2 border-mark-warn bg-surface"}`}
      >
        {fait ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : null}
      </span>
      <div className="flex min-w-0 grow flex-col gap-2">
        <span className={`text-[15px] font-bold ${fait ? "text-muted line-through" : ""}`}>{titre}</span>
        {fait ? null : children}
      </div>
    </li>
  );
}

const jourFr = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

/** Étape 7 : le bon de commande est parti ; « Livré » / « Problème » d'un tap, « Je ne commande pas » (désistement, section 4 c). */
function Livraison({ b, onDone }: { b: BesoinLot; onDone: () => void }) {
  const bon = b.bon!;
  const [probleme, setProbleme] = useState<string | null>(null);
  const [desistement, setDesistement] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const run = async (f: () => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await f();
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
    }
  };
  const livraison = bon.livraison;
  if (b.statut === "retire") return <p className="text-[13px] font-semibold text-warn">Tu ne commandes pas. C&apos;est noté.</p>;
  if (livraison?.statut === "livre") return <p className="text-[13px] font-extrabold text-ok">Livré, merci.</p>;
  if (livraison?.statut === "probleme") return <p className="text-[13px] font-semibold text-warn">Problème signalé, on regarde.</p>;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] font-semibold text-muted">
        Bon de commande transmis{bon.envoyeLe ? ` le ${jourFr(bon.envoyeLe)}` : ""}
        {livraison?.datePrevue ? ` · livraison prévue le ${jourFr(livraison.datePrevue)}` : ""}. Tout est arrivé ?
      </p>
      {probleme === null && desistement === null ? (
        <div className="flex flex-wrap gap-2">
          <Button className="min-h-10 px-3.5 text-[14px]" pending={pending} onClick={() => run(() => api(`/v1/groupe/bons/${encodeURIComponent(bon.id)}/livraison`, { method: "POST", body: { statut: "livre" } }))}>
            Livré
          </Button>
          <Button variant="secondary" className="min-h-10 px-3.5 text-[14px]" onClick={() => setProbleme("")}>
            Problème
          </Button>
          <button type="button" onClick={() => setDesistement("")} className="min-h-10 text-[13px] font-bold text-muted underline decoration-dotted underline-offset-4">
            Je ne commande pas
          </button>
        </div>
      ) : probleme !== null ? (
        <div className="flex flex-col gap-2">
          <textarea value={probleme} onChange={(e) => setProbleme(e.target.value)} maxLength={1000} rows={2} aria-label="Quel est le problème de livraison ?" placeholder="Quel est le problème ?" className="rounded-xl border border-line bg-surface px-3 py-2 text-[14px]" />
          <div className="flex gap-2">
            <Button variant="secondary" className="grow" onClick={() => setProbleme(null)} disabled={pending}>
              Annuler
            </Button>
            <Button className="grow" pending={pending} onClick={() => run(() => api(`/v1/groupe/bons/${encodeURIComponent(bon.id)}/livraison`, { method: "POST", body: { statut: "probleme", texte: probleme } }))}>
              Signaler
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-2xl bg-warn-bg p-3">
          <p className="text-[13px] font-bold text-warn">Tu t&apos;étais engagé à commander ces quantités. Première fois : un avertissement ; deuxième fois sur 12 mois : la {nom} se ferme 6 mois. Le négoce sera prévenu.</p>
          <textarea value={desistement ?? ""} onChange={(e) => setDesistement(e.target.value)} maxLength={1000} rows={2} aria-label="Pourquoi tu ne commandes pas" placeholder="Pourquoi ? (facultatif)" className="rounded-xl border border-line bg-surface px-3 py-2 text-[14px]" />
          <div className="flex gap-2">
            <Button variant="secondary" className="grow" onClick={() => setDesistement(null)} disabled={pending}>
              Annuler
            </Button>
            <Button className="grow" pending={pending} onClick={() => run(() => api(`/v1/groupe/bons/${encodeURIComponent(bon.id)}/desistement`, { method: "POST", body: { raison: desistement } }))}>
              Je ne commande pas, c&apos;est sûr
            </Button>
          </div>
        </div>
      )}
      {error ? <ErrorNotice error={error} /> : null}
    </div>
  );
}

function MesLots() {
  const fetchLots = useCallback((signal: AbortSignal) => api<{ besoins: BesoinLot[] }>("/v1/groupe/lots", { signal }), []);
  const { data, error, reload } = useResource(fetchLots);
  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="font-display text-xl font-extrabold">{`Mes ${noms}`}</h2>
      {data.besoins.length === 0 ? (
        <p className="text-[15px] font-semibold text-muted">Rien pour l&apos;instant : ajoute un chantier à la {nom}.</p>
      ) : (
        <ul aria-label={`Mes ${noms}`} className="flex flex-col gap-2">
          {data.besoins.map((b) => (
            <li key={b.id} className="flex flex-col gap-1 rounded-2xl bg-ground p-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 text-[15px] font-bold">{b.designation}</span>
                <span className="shrink-0 text-[15px] font-extrabold">{`${quantiteFr(b.quantite)} ${b.unite}`}</span>
              </div>
              <Link href={`/chantiers/${encodeURIComponent(b.projectId)}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent-text underline decoration-dotted underline-offset-4">
                <Store size={14} aria-hidden="true" />
                {b.chantier}
              </Link>
              {b.compteur ? (
                <p aria-label="Compteur du groupe" className="inline-flex items-center gap-1.5 text-[14px] font-extrabold text-accent-text">
                  <Users size={14} aria-hidden="true" />
                  {b.compteur.phrase}
                </p>
              ) : null}
              <p className="text-[13px] font-semibold text-muted">
                {b.lot ? `${NOM} n° ${b.lot.numero} · ${STATUT_LOT[b.lot.statut] ?? b.lot.statut}` : "En attente d'autres artisans"}
                {b.statut === "en_attente" ? " · devis en attente, tu ne t'engages à rien" : ""}
              </p>
              {b.offre ? (
                <p className="inline-flex items-center gap-1.5 text-[14px] font-extrabold text-ok">
                  <Truck size={14} aria-hidden="true" />
                  {Number(b.offre.prixUnitaire).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € HT l&apos;unité chez {b.offre.negoce}
                </p>
              ) : null}
              {b.bon ? <Livraison b={b} onDone={reload} /> : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
