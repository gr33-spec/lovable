"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, ChevronLeft, ChevronRight, ClipboardList, MessageSquare, MoreHorizontal, Phone, Plus, Search, ShoppingCart, Users, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLienInvitation } from "@/components/inviter";
import { Button, ButtonLink, Card, Field, INPUT, Skeleton } from "@/components/ui";
import { api, messageErreur, type NextAction } from "@/lib/api";
import { dateFr, eurosHt, negocePourApi, quantite, type AchatOuvert, type CarteAchat, type Catalogue, type NoeudCatalogue, type DetailAchat, type Droit, type EngagementTexte, type LignesListe, type MesAchats, type Jauge, type Lance, type NegoceChoisi, type NegocesProposes, type Prevenir, type ResultatAchat } from "@/lib/achat-groupe";
import { useResource } from "@/lib/use-resource";
import { useBrouillon } from "@/lib/brouillon";
import { EtapeIdentite, FORMULAIRE_IDENTITE, useIdentite } from "@/components/envoi-negoces";
import { TON as TON_MOBIIZ } from "../../../../packages/domain/src/groupe/ton";
import { PHRASE_ADRESSE_GENERIQUE, PHRASE_EMAIL_COMMERCIAL, estAdresseGenerique } from "../../../../packages/domain/src/groupe/contact-negoce";

/**
 * L'ACHAT GROUPÉ PAR MÉTIER, CÔTÉ ÉCRAN (Greg, 27 octobre 2026, 2e message), REFAIT « ULTRA INTUITIF » (Greg, même jour :
 * « j'ai du mal à comprendre tellement y a d'info ») : UNE QUESTION PAR ÉCRAN. Ajouter sa liste se fait en quatre étapes
 * (les matériaux, où et pour quand, les négoces, l'engagement), chacune avec un seul bouton « Continuer ». Le détail
 * montre l'état et la prochaine action ; sa liste, ses négoces et les sorties sont derrière un tap. Les offres : la
 * meilleure en grand, les autres repliées. Les textes de Greg (phrase d'engagement, règles, titres) sont inchangés.
 */

const LIEN_SECONDAIRE = "pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-[15px] font-semibold text-ink active:bg-ground";
const LIEN_TEXTE = "min-h-11 self-start text-[15px] font-semibold text-accent-text underline";
const ALERTE = "rounded-xl bg-danger-bg p-4 text-[15px] font-semibold text-danger";

/* ------------------------------------------------------------------------------------------- les deux portes */

/** Les deux portes : sur l'accueil (en grand) et dans la feuille du « + » central. Un titre, une ligne. */
export function DeuxPortes({ grand = false, onChoix }: { grand?: boolean; onChoix?: () => void }) {
  const porte = `pressable flex items-center gap-4 rounded-2xl p-4 text-left shadow-card ${grand ? "min-h-24" : "min-h-20"}`;
  return (
    <div className={`grid gap-3 ${grand ? "sm:grid-cols-2" : ""}`}>
      <Link href="/achats-groupes/lancer" onClick={onChoix} className={`${porte} bg-accent text-on-accent`}>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface/70 text-ink" aria-hidden="true">
          <Users size={24} />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[18px] font-extrabold">Achat groupé de ton métier</span>
          <span className="text-[14px] opacity-80">Plus nombreux, moins cher.</span>
        </span>
        <ChevronRight size={20} className="ml-auto shrink-0 opacity-70" aria-hidden="true" />
      </Link>
      <Link href="/chantiers/nouveau" onClick={onChoix} className={`${porte} border border-line bg-surface text-ink`}>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-ground" aria-hidden="true">
          <ClipboardList size={24} />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[18px] font-extrabold">Ma liste de matériaux</span>
          <span className="text-[14px] text-muted">Devis, photo, ou à la main.</span>
        </span>
        <ChevronRight size={20} className="ml-auto shrink-0 text-muted" aria-hidden="true" />
      </Link>
    </div>
  );
}

/** La feuille du « + » central de la barre du bas. */
export function FeuilleDeuxPortes({ onFermer }: { onFermer: () => void }) {
  useEffect(() => {
    const fermer = (e: KeyboardEvent) => e.key === "Escape" && onFermer();
    document.addEventListener("keydown", fermer);
    return () => document.removeEventListener("keydown", fermer);
  }, [onFermer]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 lg:items-center" onClick={onFermer}>
      <div role="dialog" aria-modal="true" aria-label="Que veux-tu faire ?" onClick={(e) => e.stopPropagation()} className="animate-rise flex w-full max-w-lg flex-col gap-4 rounded-t-3xl bg-ground p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] lg:rounded-3xl">
        <div className="flex items-center justify-between">
          <p className="text-[20px] font-extrabold">Que veux-tu faire ?</p>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="grid size-11 place-items-center rounded-full text-muted">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <DeuxPortes onChoix={onFermer} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- la jauge */

export function JaugeVolume({ j }: { j: Jauge | null }) {
  if (!j) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <div role="meter" aria-label="Volume pour lancer la consultation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={j.pourcent} className="h-2.5 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${j.atteint ? "bg-ok" : "bg-accent"}`} style={{ width: `${Math.max(j.pourcent, 6)}%` }} />
      </div>
      {j.phrase ? <p className="text-[13px] text-muted">{j.phrase}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ les cartes */

const TON: Record<string, string> = { offre: "bg-accent-soft", pas_assez: "bg-warn-bg", commande: "bg-ok-bg" };

/** Une participation : l'état en une phrase, la jauge. Tout le reste est dans le détail. */
export function CarteAchatGroupe({ c }: { c: CarteAchat }) {
  return (
    <Link href={`/achats-groupes/${c.id}`} aria-label={`${c.titreAchat} : ${c.titre}`} className={`pressable flex flex-col gap-3 rounded-2xl p-4 shadow-card ${TON[c.etat] ?? "bg-surface"}`}>
      <span className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[16px] font-extrabold">{c.titreAchat}</span>
          <span className="text-[14px] text-muted">
            {c.lignes.length} ligne{c.lignes.length > 1 ? "s" : ""} · {c.commune}
          </span>
        </span>
        <ChevronRight size={20} className="mt-1 shrink-0 text-muted" aria-hidden="true" />
      </span>
      <span className="text-[15px] font-bold">{c.titre}</span>
      <JaugeVolume j={c.jauge} />
    </Link>
  );
}

/** Un achat groupé ouvert du secteur : le titre, la date limite, un bouton. */
export function CarteAchatOuvert({ a }: { a: AchatOuvert }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card">
      <div className="flex flex-col gap-0.5">
        <span className="text-[16px] font-extrabold">{a.titre}</span>
        <span className="text-[15px]">
          Ajoute ta liste avant le {dateFr(a.clotureLe)}.{a.dateBesoin ? ` Livraison avant le ${dateFr(a.dateBesoin)}.` : ""}
        </span>
        {a.entreprises ? <span className="text-[14px] text-muted">{a.entreprises} artisans du secteur déjà dedans</span> : null}
      </div>
      <JaugeVolume j={a.jauge} />
      <ButtonLink href={`/achats-groupes/lancer?rejoindre=${a.id}&titre=${encodeURIComponent(a.titre)}`} variant="secondary">
        Ajouter ma liste
      </ButtonLink>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------- les étapes */

/** Une étape du parcours : la barre de progression, une question en titre, le contenu, un seul bouton. */
function Etape({ n, total, titre, aide, onRetour, children }: { n: number; total: number; titre: string; aide?: string; onRetour?: () => void; children: React.ReactNode }) {
  return (
    <section aria-label={titre} className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {onRetour ? (
            <button type="button" onClick={onRetour} aria-label="Étape précédente" className="pressable grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface">
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
          ) : null}
          <ol aria-label={`Étape ${n} sur ${total}`} className="flex grow gap-1.5">
            {Array.from({ length: total }, (_, i) => (
              <li key={i} aria-current={i + 1 === n ? "step" : undefined} className={`h-1.5 grow rounded-full ${i < n ? "bg-accent" : "bg-line"}`} />
            ))}
          </ol>
          <span className="shrink-0 text-[13px] font-semibold text-muted">
            {n}/{total}
          </span>
        </div>
        <h2 className="text-[24px] leading-[1.1] font-extrabold tracking-[-0.02em]">{titre}</h2>
        {aide ? <p className="text-[15px] text-muted">{aide}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Le rappel d'une étape passée, en une ligne. */
function Rappel({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-ground px-4 py-3 text-[14px] text-muted">{children}</p>;
}

/* ----------------------------------------------------------------------------------------- choisir ses négoces */

const EMAIL_VALIDE = /^\S+@\S+\.\S+$/;

/**
 * Ses négoces (Greg, 27 octobre, capture iPhone : « il faut pas un SIRET ou un nom, mais un mail ») : les habituels et
 * les inscrits du secteur en un tap ; sinon L'E-MAIL du négoce (c'est là que part la demande) ; un e-mail connu
 * retrouve le négoce, un e-mail nouveau demande son nom (et son téléphone, pour le prévenir).
 */
export function ChoixNegoces({ choisis, onChange }: { choisis: NegoceChoisi[]; onChange: (n: NegoceChoisi[]) => void }) {
  const [email, setEmail] = useState("");
  const [cherche, setCherche] = useState("");
  const fetcher = useCallback((signal: AbortSignal) => api<NegocesProposes>(`/v1/achats-groupes/negoces?q=${encodeURIComponent(cherche)}`, { signal }), [cherche]);
  const { data } = useResource(fetcher);
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [prenom, setPrenom] = useState("");
  const cle = (n: NegoceChoisi) => ("supplierId" in n ? `s:${n.supplierId}` : "negoceId" in n ? `n:${n.negoceId}` : `e:${n.email.toLowerCase()}`);
  const deja = new Set(choisis.map(cle));
  const ajouter = (n: NegoceChoisi) => !deja.has(cle(n)) && onChange([...choisis, n]);
  const propositions: (NegoceChoisi & { email?: string | null })[] = [...(data?.habituels ?? []).map((h) => ({ supplierId: h.supplierId, nom: h.nom, email: h.email })), ...(data?.inscrits ?? []).map((i) => ({ negoceId: i.negoceId, nom: i.nom, email: i.email }))].filter((n) => !deja.has(cle(n)));
  const courriel = email.trim().toLowerCase();
  const valide = EMAIL_VALIDE.test(courriel);
  // Un e-mail déjà connu (carnet ou négoce inscrit) : le négoce lui-même, sans rien retaper.
  const connu = valide ? propositions.find((n) => (n.email ?? "").toLowerCase() === courriel) : undefined;
  const vider = () => {
    setEmail("");
    setCherche("");
    setNom("");
    setTel("");
    setPrenom("");
  };
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">À quels négoces envoyer la demande ?</legend>
      {choisis.length ? (
        <ul aria-label="Négoces choisis" className="flex flex-wrap gap-2">
          {choisis.map((n) => (
            <li key={cle(n)}>
              <button type="button" onClick={() => onChange(choisis.filter((x) => cle(x) !== cle(n)))} aria-label={`Retirer ${n.nom}`} className="pressable inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-[15px] font-semibold text-white">
                <Check size={16} aria-hidden="true" /> {n.nom} <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {!email && propositions.length ? (
        <ul aria-label="Négoces proposés" className="flex flex-wrap gap-2">
          {propositions.slice(0, 8).map((n) => (
            <li key={cle(n)}>
              <button type="button" onClick={() => ajouter(n)} className="pressable inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[15px] font-semibold">
                <Plus size={16} aria-hidden="true" /> {n.nom}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Field
        id="negoce-email"
        label={choisis.length || propositions.length ? "Ou l'e-mail du commercial d'un autre négoce" : "E-mail de ton commercial"}
        hint={PHRASE_EMAIL_COMMERCIAL}
        type="email"
        inputMode="email"
        autoComplete="off"
        placeholder="paul.le-goff@negoce.fr"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setCherche(e.target.value.trim());
        }}
      />
      {connu ? (
        <Button
          variant="ink"
          onClick={() => {
            ajouter(connu);
            vider();
          }}
        >
          <Plus size={18} aria-hidden="true" /> Ajouter {connu.nom}
        </Button>
      ) : valide ? (
        <div className="flex flex-col gap-3 rounded-xl bg-ground p-3">
          {/* Lot final, point 2 : une adresse générale se signale gentiment, sans bloquer. */}
          {estAdresseGenerique(courriel) ? (
            <p role="status" className="text-sm font-semibold text-warn">
              {PHRASE_ADRESSE_GENERIQUE}
            </p>
          ) : null}
          <Field id="negoce-nom" label="Nom du négoce" value={nom} onChange={(e) => setNom(e.target.value)} />
          <Field id="negoce-prenom" label="Prénom du commercial (si tu le connais)" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
          <Field id="negoce-tel" label="Son téléphone (pour le prévenir)" type="tel" inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} />
          <Button
            variant="ink"
            disabled={!nom.trim()}
            onClick={() => {
              ajouter({ nom: nom.trim(), email: courriel, telephone: tel.trim() || null, prenom: prenom.trim() || null });
              vider();
            }}
          >
            <Plus size={18} aria-hidden="true" /> Ajouter ce négoce
          </Button>
        </div>
      ) : null}
    </fieldset>
  );
}

/* ------------------------------------------------------------------------------------- l'engagement (B6 à B9) */

/** Point 9 : les règles en clair (quatre lignes), puis la case obligatoire ; le premier achat groupé est offert. */
export function Engagement({ droit, texte, coche, onCoche }: { droit: Droit; texte: EngagementTexte; coche: boolean; onCoche: (v: boolean) => void }) {
  if (!droit.ok)
    return (
      <div role="status" className="flex flex-col gap-3 rounded-xl bg-accent-soft p-4">
        <p className="text-[16px] font-bold">{droit.phrase}</p>
        <ButtonLink href="/abonnement" variant="secondary">
          M&apos;abonner
        </ButtonLink>
      </div>
    );
  return (
    <section aria-label="Mon engagement" className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2 text-[15px] leading-snug">
        {texte.regles.map((r) => (
          <li key={r} className="flex items-start gap-3">
            <Check size={18} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />
            <span>{r}</span>
          </li>
        ))}
      </ul>
      <p className="text-[15px] font-semibold">{TON_MOBIIZ.engagement}</p>
      <label className={`flex items-start gap-3 rounded-xl border-2 p-4 text-[16px] font-semibold ${coche ? "border-ink bg-surface" : "border-line bg-surface"}`}>
        <input type="checkbox" checked={coche} onChange={(e) => onCoche(e.target.checked)} className="mt-0.5 size-6 shrink-0 accent-accent" />
        <span>{texte.phrase}</span>
      </label>
      {droit.offert && droit.phrase ? <p className="rounded-xl bg-ok-bg p-3 text-[15px] font-bold text-ok">{droit.phrase}</p> : null}
    </section>
  );
}

/* ---------------------------------------------------------------------------------------- ajouter sa liste */

const dansJours = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const nombre = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));

interface SaisieAchat extends Record<string, unknown> {
  lignes: { designation: string; unite: string; qte: string }[];
  livraison: string;
  dateBesoin: string;
  negoces: NegoceChoisi[];
  engage: boolean;
}

interface SaisieChantier extends Record<string, unknown> {
  cochees: string[] | null;
  /** « auto » : l'achat ouvert du secteur, s'il y en a un. */
  achatId: string | null;
  dateBesoin: string;
  livraison: string | null;
  negoces: NegoceChoisi[];
  engage: boolean;
}

/** Le résumé des lignes choisies, pour les étapes suivantes. */
const resumeLignes = (n: number) => `${n} ligne${n > 1 ? "s" : ""}`;

/**
 * Sans liste enregistrée : quatre étapes. 1) Les matériaux au catalogue et leurs quantités ; 2) la commune et la date (sauf
 * quand on rejoint un achat : c'est la sienne) ; 3) ses négoces ; 4) l'engagement et le bouton.
 */
export function FormulaireAchatGroupe({ rejoindre }: { rejoindre: { id: string; titre: string } | null }) {
  // Correction après test de Greg (30 octobre 2026, point 2) : la saisie et l'étape sont gardées sur le serveur à chaque
  // geste ; aller dans le menu puis revenir reprend exactement ici.
  const b = useBrouillon<SaisieAchat>(
    rejoindre ? `achat-groupe:rejoindre:${rejoindre.id}` : "achat-groupe:nouveau",
    {
      type: "achat-groupe",
      url: rejoindre ? `/achats-groupes/lancer?rejoindre=${rejoindre.id}&titre=${encodeURIComponent(rejoindre.titre)}` : "/achats-groupes/lancer",
      titre: (d) => `${rejoindre ? `Achat groupé : ${rejoindre.titre}` : "Ton achat groupé"} · ${resumeLignes(d.lignes.length)}`,
      vide: (d, e) => d.lignes.length === 0 && e === 1,
    },
    { lignes: [], livraison: "", dateBesoin: dansJours(30), negoces: [], engage: false },
  );
  const { lignes, livraison, dateBesoin, negoces, engage } = b.donnees;
  const etape = b.etape;
  const setLignes = (f: SaisieAchat["lignes"] | ((l: SaisieAchat["lignes"]) => SaisieAchat["lignes"])) => b.modifier((d) => ({ ...d, lignes: typeof f === "function" ? f(d.lignes) : f }));
  const setLivraison = (v: string) => b.modifier((d) => ({ ...d, livraison: v }));
  const setDateBesoin = (v: string) => b.modifier((d) => ({ ...d, dateBesoin: v }));
  const setNegoces = (v: NegoceChoisi[]) => b.modifier((d) => ({ ...d, negoces: v }));
  const setEngage = (v: boolean) => b.modifier((d) => ({ ...d, engage: v }));
  const [q, setQ] = useState("");
  const fetchCat = useCallback((signal: AbortSignal) => api<Catalogue>(`/v1/achats-groupes/catalogue?q=${encodeURIComponent(q)}`, { signal }), [q]);
  const fetchMes = useCallback((signal: AbortSignal) => api<MesAchats>("/v1/achats-groupes", { signal }), []);
  const { data } = useResource(fetchCat);
  const { data: mes } = useResource(fetchMes);
  const identite = useIdentite();
  const [pendingSiret, setPendingSiret] = useState(false);
  const [messageSiret, setMessageSiret] = useState<string | null>(null);
  // La commune par défaut : l'adresse de l'entreprise (Profil), modifiable ; jamais par-dessus un brouillon.
  const pret = b.pret;
  useEffect(() => {
    if (!pret) return;
    let vivant = true;
    void api<{ address: string | null }>("/v1/company/profile")
      .then((p) => {
        if (vivant && p.address) b.modifier((d) => (d.livraison ? d : { ...d, livraison: p.address! }));
      })
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pret]);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [lance, setLance] = useState<Lance | null>(null);
  const pretes = lignes.filter((l) => nombre(l.qte) > 0);
  const total = 4;
  const suivant = () => {
    setErreur(null);
    b.allerA((e) => Math.min(total, e + 1));
    window.scrollTo({ top: 0 });
  };
  const precedent = () => {
    setErreur(null);
    b.allerA((e) => Math.max(1, e - 1));
  };
  // Le SIRET se demande ici, sur place, jamais dans le Profil (on y perdait sa saisie).
  const siretAVerifier = !!identite.data && !identite.data.siretVerifie;

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!engage) return setErreur("Coche la case pour t'engager.");
    setPending(true);
    try {
      const fait = (
        await api<Lance>("/v1/achats-groupes", {
          method: "POST",
          body: { achatId: rejoindre?.id ?? null, lignes: pretes.map((l) => ({ designation: l.designation, quantite: nombre(l.qte), unite: l.unite })), livraison: livraison.trim(), dateBesoin: rejoindre ? null : dateBesoin, negoces: negoces.map(negocePourApi), engagement: true },
        })
      );
      b.effacer();
      setLance(fait);
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setPending(false);
    }
  }

  if (!b.pret) return <Skeleton card="h-56" lines={2} label="Je reprends où tu en étais…" />;
  if (lance) return <EcranPrevenir p={lance.prevenir} besoinId={lance.besoinId} message={lance.ajoute ? "Tes lignes s'ajoutent à ta liste dans cet achat groupé." : `Ta liste est dans l'achat groupé : ${lance.titre}.${lance.offert ? " Ton premier achat groupé est offert." : ""}`} />;

  const bloque = !!mes?.exclusion;
  // Le SIRET, sur place, hors du formulaire de l'achat (un formulaire n'en contient jamais un autre).
  if (etape === 4 && siretAVerifier && identite.data)
    return (
      <div className="flex flex-col gap-5">
        {rejoindre ? <Rappel>Achat groupé : {rejoindre.titre}</Rappel> : null}
        <Etape n={4} total={total} titre="Ton entreprise" aide="Une seule fois : l'achat groupé est réservé aux entreprises du bâtiment." onRetour={precedent}>
          <EtapeIdentite
            identite={identite.data}
            onPending={setPendingSiret}
            onFait={(i) => {
              identite.setData(i);
              setMessageSiret(i.siretVerifie ? null : (i.siretMessage ?? "Ce SIRET n'a pas pu être vérifié comme une entreprise du bâtiment. Corrige-le et réessaie."));
            }}
          />
          {messageSiret ? (
            <p role="alert" className={ALERTE}>
              {messageSiret}
            </p>
          ) : null}
          <Button type="submit" form={FORMULAIRE_IDENTITE} pending={pendingSiret}>
            Vérifier et continuer
          </Button>
        </Etape>
      </div>
    );
  return (
    <form onSubmit={(e) => void envoyer(e)} aria-label={rejoindre ? "Rejoindre l'achat groupé" : "Ajouter ma liste à un achat groupé"} className="flex flex-col gap-5">
      {rejoindre ? <Rappel>Achat groupé : {rejoindre.titre}</Rappel> : null}
      {mes?.exclusion ? (
        <p role="alert" className={ALERTE}>
          {mes.exclusion}
        </p>
      ) : null}
      {etape === 1 ? (
        <Etape n={1} total={total} titre="Qu'est-ce que tu commandes ?">
          <ChoixGuide catalogue={data ?? null} q={q} onQ={setQ} deja={lignes.map((l) => l.designation)} onAjouter={(r) => setLignes((ls) => [...ls, { designation: r.designation, unite: r.unite, qte: r.qte }])} />
          {lignes.length ? <LignesPanier lignes={lignes} onChange={setLignes} /> : null}
          <Button disabled={pretes.length === 0 || bloque} onClick={suivant}>
            Continuer
          </Button>
        </Etape>
      ) : null}
      {etape === 2 ? (
        <Etape n={2} total={total} titre="Où et pour quand ?" onRetour={precedent}>
          <Rappel>{resumeLignes(pretes.length)}</Rappel>
          <Field id="commune" label="Commune de livraison" placeholder="22300 Lannion" value={livraison} onChange={(e) => setLivraison(e.target.value)} />
          {rejoindre ? null : <Field id="date-besoin" label="Livraison avant le" type="date" value={dateBesoin} onChange={(e) => setDateBesoin(e.target.value)} />}
          <Button disabled={!livraison.trim() || (!rejoindre && !dateBesoin)} onClick={suivant}>
            Continuer
          </Button>
        </Etape>
      ) : null}
      {etape === 3 ? (
        <Etape n={3} total={total} titre="À quels négoces envoyer la demande ?" aide="Tes négoces habituels, ou un autre." onRetour={precedent}>
          <ChoixNegoces choisis={negoces} onChange={setNegoces} />
          <Button disabled={negoces.length === 0} onClick={suivant}>
            Continuer
          </Button>
        </Etape>
      ) : null}
      {etape === 4 ? (
        <Etape n={4} total={total} titre="Ton engagement" onRetour={precedent}>
          <Rappel>
            {resumeLignes(pretes.length)} · {livraison.trim()} · {negoces.length} négoce{negoces.length > 1 ? "s" : ""}
          </Rappel>
          {mes ? (
            <Engagement droit={mes.droit} texte={mes.engagement} coche={engage} onCoche={setEngage} />
          ) : null}
          {erreur ? (
            <p role="alert" className={ALERTE}>
              {erreur}
            </p>
          ) : null}
          <Button type="submit" pending={pending} disabled={!mes?.droit.ok || bloque}>
            Je m&apos;engage et j&apos;ajoute ma liste
          </Button>
        </Etape>
      ) : null}
    </form>
  );
}

/**
 * LE CHOIX GUIDÉ (Greg, 27 octobre 2026, capture iPhone : « un seul bouton ardoise, puis format, puis choix ; on est
 * multimétier ») : son métier (les autres en un tap), puis un bouton par matériau, par format, par choix ; au bout, la
 * quantité et « Ajouter à ma liste ». La recherche par mot reste derrière « Chercher par mot ».
 */
function ChoixGuide({ catalogue, q, onQ, deja, onAjouter }: { catalogue: Catalogue | null; q: string; onQ: (q: string) => void; deja: string[]; onAjouter: (r: { designation: string; unite: string; qte: string }) => void }) {
  const [famille, setFamille] = useState<string | null>(null);
  const [chemin, setChemin] = useState<string[]>([]);
  const [feuille, setFeuille] = useState<{ designation: string; unite: string } | null>(null);
  const [qte, setQte] = useState("");
  const [parMot, setParMot] = useState(false);
  const [autresMetiers, setAutresMetiers] = useState(false);
  const familles = catalogue?.familles ?? [];
  const courante = famille ?? familles[0]?.famille ?? null;
  const BOUTON = "pressable flex min-h-13 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 text-left text-[16px] font-semibold";
  let niveau: NoeudCatalogue[] = courante ? (catalogue?.arbre[courante] ?? []) : [];
  for (const l of chemin) niveau = niveau.find((n) => n.libelle === l)?.enfants ?? [];
  const choisir = (n: NoeudCatalogue) => {
    if (n.reference) {
      setFeuille(n.reference);
      setQte("");
      return;
    }
    setChemin((c) => [...c, n.libelle]);
  };
  const retour = () => {
    if (feuille) return setFeuille(null);
    setChemin((c) => c.slice(0, -1));
  };
  const ajouter = () => {
    if (!feuille || !(nombre(qte) > 0)) return;
    onAjouter({ ...feuille, qte });
    setFeuille(null);
    setChemin([]);
    setQte("");
  };
  if (!catalogue) return <p className="text-[15px] text-muted">Chargement du catalogue…</p>;
  // Un métier sans catalogue (électricien, plombier…) : on le dit, au lieu de proposer les matériaux d'un autre métier.
  if (catalogue.monMetier && !catalogue.monMetier.catalogue && !autresMetiers)
    return (
      <div role="status" className="flex flex-col gap-3 rounded-xl bg-accent-soft p-4">
        {/* Greg, 28 octobre 2026, point 6 : sa phrase, mot pour mot. */}
        <p className="text-[16px] font-bold">Les achats groupés arrivent bientôt pour ton métier.</p>
        <p className="text-[15px]">En attendant, envoie ta liste à tes négoces : ils te font leur prix.</p>
        <ButtonLink href="/chantiers/nouveau" variant="secondary">
          Ma liste de matériaux
        </ButtonLink>
        {familles.length ? (
          <button type="button" onClick={() => setAutresMetiers(true)} className={LIEN_TEXTE}>
            Je commande aussi pour un autre métier
          </button>
        ) : null}
      </div>
    );
  if (parMot)
    return (
      <div className="flex flex-col gap-3">
        <div className="flex min-h-13 items-center gap-3 rounded-xl border border-line bg-surface px-4 focus-within:border-accent">
          <Search size={18} className="text-muted" aria-hidden="true" />
          <label htmlFor="cherche-materiau" className="sr-only">
            Ajoute tes matériaux
          </label>
          <input id="cherche-materiau" value={q} onChange={(e) => onQ(e.target.value)} placeholder="Ardoise 32×22, liteaux, zinc 0,65…" className="min-h-12 grow bg-transparent text-[16px] outline-none placeholder:text-muted" autoComplete="off" autoFocus />
        </div>
        <ul aria-label="Catalogue" className="flex flex-wrap gap-2">
          {catalogue.references
            .filter((r) => !deja.includes(r.designation))
            .slice(0, 8)
            .map((r) => (
              <li key={r.designation}>
                <button type="button" onClick={() => onAjouter({ designation: r.designation, unite: r.unite, qte: "" })} className="pressable inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-left text-[15px] font-semibold">
                  <Plus size={16} aria-hidden="true" /> {r.designation}
                </button>
              </li>
            ))}
        </ul>
        <button type="button" onClick={() => setParMot(false)} className={LIEN_TEXTE}>
          Choisir bouton par bouton
        </button>
      </div>
    );
  return (
    <div className="flex flex-col gap-3">
      {familles.length > 1 && chemin.length === 0 && !feuille ? (
        <ul aria-label="Métier" className="flex flex-wrap gap-2">
          {familles.map((f) => (
            <li key={f.famille}>
              <button type="button" aria-pressed={f.famille === courante} onClick={() => setFamille(f.famille)} className={`pressable inline-flex min-h-11 items-center rounded-full px-4 text-[15px] font-semibold ${f.famille === courante ? "bg-ink text-white" : "border border-line bg-surface"}`}>
                {f.libelle}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {chemin.length || feuille ? (
        <div className="flex items-center gap-2">
          <button type="button" onClick={retour} aria-label="Choix précédent" className="pressable grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface">
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <p className="text-[15px] font-semibold">{[...chemin, ...(feuille ? [feuille.designation] : [])].join(" › ")}</p>
        </div>
      ) : null}
      {feuille ? (
        <div className="flex flex-col gap-3 rounded-xl bg-ground p-4">
          <label htmlFor="qte-feuille" className="text-[16px] font-semibold">
            Combien de {feuille.designation} ?
          </label>
          <div className="flex items-center gap-3">
            <input id="qte-feuille" aria-label={`Quantité de ${feuille.designation}`} inputMode="decimal" value={qte} onChange={(e) => setQte(e.target.value)} placeholder="Quantité" className={`${INPUT} max-w-40`} autoFocus onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), ajouter())} />
            <span className="text-[16px] text-muted">{feuille.unite}</span>
          </div>
          <Button variant="ink" disabled={!(nombre(qte) > 0)} onClick={ajouter}>
            <Plus size={18} aria-hidden="true" /> Ajouter à ma liste
          </Button>
        </div>
      ) : (
        <ul aria-label={chemin.length ? chemin[chemin.length - 1] : "Matériau"} className="flex flex-col gap-2">
          {niveau.map((n) => (
            <li key={n.libelle}>
              <button type="button" onClick={() => choisir(n)} className={BOUTON}>
                {n.libelle}
                <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {!feuille ? (
        <button type="button" onClick={() => setParMot(true)} className={LIEN_TEXTE}>
          Chercher par mot
        </button>
      ) : null}
    </div>
  );
}

/** Les lignes du panier : la référence, sa quantité, une croix. */
function LignesPanier({ lignes, onChange }: { lignes: { designation: string; unite: string; qte: string }[]; onChange: (l: { designation: string; unite: string; qte: string }[]) => void }) {
  return (
    <ul aria-label="Ma liste" className="flex flex-col gap-2">
      {lignes.map((l, i) => (
        <li key={l.designation} className="flex items-end gap-2 rounded-xl border border-line bg-surface p-3">
          <div className="flex min-w-0 grow flex-col gap-1">
            <span className="text-[15px] font-semibold">{l.designation}</span>
            <label className="flex items-center gap-2 text-[14px] text-muted">
              <span className="sr-only">Quantité de {l.designation}</span>
              <input inputMode="decimal" value={l.qte} placeholder="Quantité" onChange={(e) => onChange(lignes.map((x, j) => (j === i ? { ...x, qte: e.target.value } : x)))} className={`${INPUT} max-w-36`} />
              {l.unite}
            </label>
          </div>
          <button type="button" aria-label={`Retirer ${l.designation}`} onClick={() => onChange(lignes.filter((_, j) => j !== i))} className="grid size-11 shrink-0 place-items-center rounded-full text-muted">
            <X size={20} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------------------------- « Préviens ton négoce » */

/** Point 12 : le texte exact, Appeler, le SMS prérempli, « Je l'ai prévenu ». */
export function EcranPrevenir({ p, besoinId, message }: { p: Prevenir; besoinId: string; message?: string }) {
  const [faits, setFaits] = useState<string[]>(p.negoces.filter((n) => n.prevenu).map((n) => n.id));
  async function prevenu(id: string) {
    await api(`/v1/achats-groupes/negoces/${id}/prevenu`, { method: "POST" }).catch(() => undefined);
    setFaits((f) => [...f, id]);
  }
  return (
    <section aria-label="Préviens ton négoce" className="flex flex-col gap-5">
      {message ? (
        <p role="status" className="rounded-xl bg-ok-bg p-4 text-[15px] font-semibold text-ok">
          {message}
        </p>
      ) : null}
      <h1 className="text-[28px] leading-[1.05] font-extrabold tracking-[-0.03em]">{p.titre}</h1>
      <p className="text-[16px] leading-relaxed">{p.texte}</p>
      {p.negoces.map((n) => (
        <Card key={n.id} className="flex flex-col gap-3 p-4">
          <span className="text-[17px] font-extrabold">{n.nom}</span>
          <div className="grid grid-cols-2 gap-2">
            {n.tel ? (
              <a href={n.tel} className={LIEN_SECONDAIRE}>
                <Phone size={18} aria-hidden="true" /> Appeler
              </a>
            ) : null}
            <a href={n.smsLien} className={`${LIEN_SECONDAIRE} ${n.tel ? "" : "col-span-2"}`}>
              <MessageSquare size={18} aria-hidden="true" /> SMS
            </a>
          </div>
          {faits.includes(n.id) ? (
            <p className="flex min-h-12 items-center justify-center gap-2 text-[15px] font-semibold text-ok">
              <Check size={18} aria-hidden="true" /> Prévenu
            </p>
          ) : (
            <Button variant="secondary" onClick={() => void prevenu(n.id)}>
              Je l&apos;ai prévenu
            </Button>
          )}
        </Card>
      ))}
      <details className="rounded-xl bg-ground p-3 text-[14px] text-muted">
        <summary className="min-h-11 cursor-pointer list-none font-semibold text-ink">Le SMS envoyé</summary>
        <p className="pt-2">« {p.sms} »</p>
      </details>
      <ButtonLink href={`/achats-groupes/${besoinId}`}>Voir mon achat groupé</ButtonLink>
    </section>
  );
}

/* ---------------------------------------------------------------------------------------------------- le détail */

/**
 * Le détail : l'état et la prochaine action en haut ; sa liste et ses négoces repliés ; les sorties derrière
 * « Autres actions ». Un seul bouton jaune.
 */
export function DetailAchatGroupe({ id }: { id: string }) {
  const router = useRouter();
  const fetcher = useCallback((signal: AbortSignal) => api<DetailAchat>(`/v1/achats-groupes/${id}`, { signal }), [id]);
  const { data: d, error, reload } = useResource(fetcher);
  const [confirmer, setConfirmer] = useState<"retirer" | string | null>(null);
  const [sortie, setSortie] = useState(false);
  const [modifier, setModifier] = useState<Record<string, string> | null>(null);
  const [probleme, setProbleme] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  // Point 8 (Greg, 28 octobre 2026) : un seul bouton principal par étape ; le reste dans le menu « ··· » en haut à droite.
  const [menu, setMenu] = useState(false);
  const [listeOuverte, setListeOuverte] = useState(false);
  const [inviter, setInviter] = useState(false);
  if (error) return <p role="alert" className={ALERTE}>{messageErreur(error)}</p>;
  if (!d) return null;

  async function geste(nom: string, chemin: string, corps?: unknown, apres?: (r: unknown) => void, methode: "POST" | "PUT" = "POST") {
    setPending(nom);
    setErreur(null);
    try {
      const r = await api(chemin, { method: methode, body: corps });
      apres?.(r);
      setConfirmer(null);
      setSortie(false);
      setModifier(null);
      setProbleme(null);
      reload();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setPending(null);
    }
  }

  const r = d.resultat;
  const enAttente = d.etat === "seul" || d.etat === "regroupe" || d.etat === "regroupe_total";
  const elements: { label: string; run: () => void }[] = [];
  if (d.actions.modifier) elements.push({ label: "Modifier mes quantités", run: () => (setListeOuverte(true), setModifier(Object.fromEntries(d.lignes.map((l) => [l.id, String(l.quantite)])))) });
  if (enAttente) elements.push({ label: "Inviter un collègue", run: () => setInviter(true) });
  if (d.actions.livre && probleme === null) elements.push({ label: "Signaler un problème", run: () => setProbleme("") });
  if (d.actions.retirer) elements.push({ label: "Retirer ma liste", run: () => setConfirmer("retirer") });
  if (d.actions.sortir) elements.push({ label: "Sortir de l'achat groupé", run: () => setSortie(true) });
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-start gap-2">
          <h1 className="grow text-[26px] leading-[1.08] font-extrabold tracking-[-0.03em]">{d.titreAchat}</h1>
          {elements.length ? (
            <button type="button" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Plus d'actions sur l'achat groupé" className="pressable bouton-nuit flex size-11 shrink-0 items-center justify-center rounded-full">
              <MoreHorizontal size={20} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {menu ? (
          <ul role="menu" aria-label="Actions sur l'achat groupé" className="animate-rise flex flex-col divide-y divide-line rounded-xl border border-line bg-surface px-4 shadow-card">
            {elements.map((e) => (
              <li key={e.label} role="none">
                <button type="button" role="menuitem" onClick={() => (setMenu(false), e.run())} className="flex min-h-13 w-full items-center text-left text-[16px] font-semibold">
                  {e.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-[16px] text-muted">
          {d.lignes.length} ligne{d.lignes.length > 1 ? "s" : ""} · {d.commune}
          {d.offert ? " · offert" : ""}
        </p>
      </div>
      <Card className={`flex flex-col gap-3 p-4 ${TON[d.etat] ?? ""}`}>
        <p className="text-[18px] font-extrabold">{d.titre}</p>
        {d.sousTitre ? <p className="text-[15px] text-muted">{d.sousTitre}</p> : null}
        <JaugeVolume j={d.jauge} />
        <ol aria-label="Étapes" className="grid grid-cols-4 gap-1 pt-1">
          {d.frise.etapes.map((e, i) => (
            <li key={e} aria-current={i === d.frise.courante ? "step" : undefined} className="flex flex-col gap-1.5">
              <span className={`h-1.5 rounded-full ${i <= d.frise.courante ? "bg-accent" : "bg-line"}`} />
              <span className={`text-[12px] leading-tight ${i === d.frise.courante ? "font-bold text-ink" : "text-muted"}`}>{e}</span>
            </li>
          ))}
        </ol>
      </Card>
      {fait ? (
        <p role="status" className="rounded-xl bg-ok-bg p-4 text-[15px] font-semibold text-ok">
          {fait}
        </p>
      ) : null}

      {r ? <Resultat id={id} d={d} r={r} pending={pending} geste={geste} /> : null}

      {d.bonNumero ? (
        <div className="flex flex-col gap-2">
          <p className="text-[15px] font-semibold">{d.commandeRecue ? "Commande reçue par le négoce." : "En attente de « Commande reçue » du négoce."}</p>
          <a href={`/v1/achats-groupes/${id}/bon.pdf`} className={LIEN_SECONDAIRE}>
            Mon bon de commande n° {d.bonNumero}
          </a>
        </div>
      ) : null}
      {d.livre ? <p className="rounded-xl bg-ok-bg p-3 text-[15px] font-semibold text-ok">Livré.</p> : null}
      {d.probleme ? <p className="rounded-xl bg-warn-bg p-3 text-[15px] font-semibold">Problème signalé : {d.probleme}</p> : null}
      {d.actions.livre ? (
        probleme !== null ? (
          <Card className="flex flex-col gap-3 p-4">
            <Field id="probleme" label="Quel problème ?" value={probleme} onChange={(e) => setProbleme(e.target.value)} />
            <Button variant="secondary" disabled={!probleme.trim()} pending={pending === "probleme"} onClick={() => void geste("probleme", `/v1/achats-groupes/${id}/livre`, { probleme: probleme.trim() })}>
              Envoyer
            </Button>
          </Card>
        ) : (
          <Button pending={pending === "livre"} onClick={() => void geste("livre", `/v1/achats-groupes/${id}/livre`, {}, () => setFait("Merci, c'est noté : livré."))}>
            <Check size={18} aria-hidden="true" /> Livré
          </Button>
        )
      ) : null}

      {d.actions.planB ? (
        <Button pending={pending === "planB"} onClick={() => void geste("planB", `/v1/achats-groupes/${id}/plan-b`, undefined, () => setFait("Ta liste est partie chez tes négoces. Les prix arrivent dans Mes listes."))}>
          Envoyer ma liste à mes négoces
        </Button>
      ) : null}

      {enAttente && d.negoces.some((n) => !n.prevenu) ? <PrevenirDepuisDetail id={id} /> : null}

      <details open={listeOuverte || !!modifier} onToggle={(e) => setListeOuverte((e.target as HTMLDetailsElement).open)} className="rounded-2xl bg-surface p-4 shadow-card">
        <summary aria-label="Ma liste" className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-[16px] font-extrabold">
          {`Ma liste · ${d.lignes.length} ligne${d.lignes.length > 1 ? "s" : ""}`}
          <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />
        </summary>
        <section aria-label="Ma liste" className="flex flex-col gap-2 pt-2">
          <ul className="flex flex-col divide-y divide-line">
            {d.lignes.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2 text-[15px]">
                <span>{l.libelle}</span>
                {modifier ? (
                  <input aria-label={`Quantité de ${l.libelle}`} inputMode="decimal" value={modifier[l.id] ?? ""} onChange={(e) => setModifier({ ...modifier, [l.id]: e.target.value })} className={`${INPUT} max-w-28`} />
                ) : (
                  <span className="shrink-0 font-semibold whitespace-nowrap">
                    {quantite(l.quantite)} {l.unite}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {modifier ? (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setModifier(null)}>
                Annuler
              </Button>
              <Button variant="ink" pending={pending === "modifier"} onClick={() => void geste("modifier", `/v1/achats-groupes/${id}`, { quantites: Object.fromEntries(Object.entries(modifier).map(([k, v]) => [k, nombre(v) || 0])) }, undefined, "PUT")}>
                Enregistrer
              </Button>
            </div>
          ) : null}
          <p className="pt-2 text-[14px] text-muted">
            Tes négoces :{" "}
            {d.negoces.map((n, i) => (
              <span key={n.id} className="font-semibold text-ink">
                {i ? ", " : ""}
                {n.nom}
                <span className="font-normal text-muted">{n.parti ? " (demande partie)" : n.prevenu ? " (prévenu)" : ""}</span>
              </span>
            ))}
          </p>
        </section>
      </details>

      {confirmer === "retirer" ? (
        <Card role="alertdialog" aria-label="Retirer ma liste" className="flex flex-col gap-3 p-4">
          <p className="text-[16px] font-bold">Tu retires ta liste de cet achat groupé ?</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setConfirmer(null)}>
              Annuler
            </Button>
            <Button variant="ink" pending={pending === "retirer"} onClick={() => void geste("retirer", `/v1/achats-groupes/${id}/retirer`, undefined, () => router.push("/achats-groupes"))}>
              Oui, retirer
            </Button>
          </div>
        </Card>
      ) : confirmer ? (
        <Card role="alertdialog" aria-label="Sortir de l'achat groupé" className="flex flex-col gap-3 p-4">
          <p className="text-[16px] font-bold">Tu sors de l&apos;achat groupé : « {d.motifsSortie.find((m) => m.valeur === confirmer)?.libelle} » ?</p>
          <p className="text-[14px] text-muted">Deux sorties en trois mois, ou une commande pas passée sans motif : plus d&apos;achat groupé pendant 3 mois.</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setConfirmer(null)}>
              Annuler
            </Button>
            <Button variant="ink" pending={pending === "sortir"} onClick={() => void geste("sortir", `/v1/achats-groupes/${id}/sortir`, { motif: confirmer }, (x) => setFait((x as { exclusion: string | null }).exclusion ?? "C'est noté : tu es sorti de cet achat groupé."))}>
              Oui, sortir
            </Button>
          </div>
        </Card>
      ) : sortie && d.actions.sortir ? (
        <Card aria-label="Sortir de l'achat groupé" className="flex flex-col gap-2 p-4">
          <p className="text-[16px] font-bold">Pourquoi tu sors ?</p>
          {d.motifsSortie.map((m) => (
            <Button key={m.valeur} variant="secondary" onClick={() => setConfirmer(m.valeur)}>
              {m.libelle}
            </Button>
          ))}
          <Button variant="ghost" onClick={() => setSortie(false)}>
            Finalement, je reste
          </Button>
        </Card>
      ) : null}
      {erreur ? (
        <p role="alert" className={ALERTE}>
          {erreur}
        </p>
      ) : null}
      {enAttente && inviter ? <InviteLe phrase={d.invite} libelle={d.metier.toLowerCase()} /> : null}
    </div>
  );
}

/**
 * Points 13, 17 à 19 : la phrase de la publication, la meilleure offre en grand (sur SES lignes), les autres repliées ;
 * pour commander : son négoce habituel, ou ouvrir un compte (conditions, coordonnées avec son accord).
 */
function Resultat({ id, d, r, pending, geste }: { id: string; d: DetailAchat; r: ResultatAchat; pending: string | null; geste: (nom: string, chemin: string, corps?: unknown, apres?: (r: unknown) => void) => Promise<void> }) {
  const [accord, setAccord] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [meilleure, ...autres] = r.offres;
  const carte = (o: NonNullable<typeof meilleure>, principale: boolean) => (
    <Card key={o.consultationId} className={`flex flex-col gap-3 p-4 ${principale ? "border-2 border-accent" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-[13px] font-semibold text-muted">{principale ? "La meilleure offre" : o.habituel ? "Ton négoce" : "Négoce du groupe"}</p>
          <p className="text-[18px] font-extrabold">{o.nom}</p>
        </div>
        <p className={`shrink-0 font-extrabold whitespace-nowrap ${principale ? "text-[22px]" : "text-[16px]"}`}>{eurosHt(o.totalHt)}</p>
      </div>
      <p className={`text-[14px] font-semibold ${o.complete ? "text-ok" : "text-warn"}`}>{o.complete ? "Toute ta liste, livraison comprise" : o.manquantes}</p>
      <button type="button" aria-expanded={ouvert === o.consultationId} onClick={() => setOuvert(ouvert === o.consultationId ? null : o.consultationId)} className="min-h-11 self-start text-[14px] font-semibold text-accent-text underline">
        {ouvert === o.consultationId ? "Masquer le détail" : "Voir le détail"}
      </button>
      {ouvert === o.consultationId ? (
        <ul className="flex flex-col divide-y divide-line text-[14px]">
          {o.lignes.map((l) => (
            <li key={l.libelle} className="flex justify-between gap-2 py-1.5">
              <span>
                {l.libelle} · {quantite(l.quantite)} {l.unite}
              </span>
              <span className={l.prixHt === null ? "text-danger" : "font-semibold"}>{l.prixHt === null ? "non chiffrée" : eurosHt(l.prixHt)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {d.actions.commander ? (
        o.habituel ? (
          <Button variant={principale ? "primary" : "secondary"} pending={pending === o.consultationId} onClick={() => void geste(o.consultationId, `/v1/achats-groupes/${id}/commander`, { consultationId: o.consultationId })}>
            <ShoppingCart size={18} aria-hidden="true" /> Commander chez {o.nom}
          </Button>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl bg-ground p-3">
            <p className="text-[15px] font-semibold">{o.ouvertureCompte}</p>
            {r.coordonneesTransmises === o.nom ? (
              <p className="text-[15px] font-semibold text-ok">Tes coordonnées sont parties : {o.nom} te rappelle de la part de Mobiiz.</p>
            ) : (
              <>
                <label className="flex items-start gap-3 text-[14px]">
                  <input type="checkbox" checked={accord === o.consultationId} onChange={(e) => setAccord(e.target.checked ? o.consultationId : null)} className="mt-0.5 size-5 shrink-0 accent-accent" />
                  <span>J&apos;accepte que Mobiiz transmette mes coordonnées (nom, entreprise, téléphone, e-mail, SIRET) à {o.nom} pour ouvrir un compte.</span>
                </label>
                <Button variant={principale ? "primary" : "secondary"} disabled={accord !== o.consultationId} pending={pending === `c-${o.consultationId}`} onClick={() => void geste(`c-${o.consultationId}`, `/v1/achats-groupes/${id}/coordonnees`, { consultationId: o.consultationId, consentement: true })}>
                  Je suis intéressé, transmettre mes coordonnées
                </Button>
              </>
            )}
            <button type="button" disabled={pending === o.consultationId} onClick={() => void geste(o.consultationId, `/v1/achats-groupes/${id}/commander`, { consultationId: o.consultationId })} className={LIEN_TEXTE}>
              J&apos;ai déjà un compte : commander
            </button>
          </div>
        )
      ) : null}
    </Card>
  );
  return (
    <section aria-label="Les offres" className="flex flex-col gap-3">
      {r.phrase ? <p className="rounded-xl bg-ok-bg p-4 text-[17px] font-bold text-ok">{r.phrase}</p> : null}
      {r.commandeChez ? <p className="text-[15px] font-semibold">Commandé chez {r.commandeChez}.</p> : null}
      {r.commandeChez && r.economie ? <p className="rounded-xl bg-ok-bg p-3 text-[15px] font-bold text-ok">{r.economie}</p> : null}
      {d.commandeAvantLe && d.actions.commander ? <p className="text-[14px] text-muted">Commande avant le {dateFr(d.commandeAvantLe)}.</p> : null}
      {meilleure ? carte(meilleure, true) : null}
      {autres.length ? (
        <details className="flex flex-col gap-3">
          <summary className="min-h-11 cursor-pointer list-none text-[15px] font-semibold text-accent-text underline">
            {autres.length === 1 ? "L'autre offre" : `Les ${autres.length} autres offres`}
          </summary>
          <div className="flex flex-col gap-3 pt-3">{autres.map((o) => carte(o, false))}</div>
        </details>
      ) : null}
    </section>
  );
}

/** « Préviens ton négoce » depuis le détail, tant que la demande n'est pas partie. */
function PrevenirDepuisDetail({ id }: { id: string }) {
  const [p, setP] = useState<Prevenir | null>(null);
  if (p) return <EcranPrevenir p={p} besoinId={id} />;
  return (
    <Button variant="secondary" onClick={() => void api<{ prevenir: Prevenir }>(`/v1/achats-groupes/${id}/prevenir`).then((r) => setP(r.prevenir))}>
      <Phone size={18} aria-hidden="true" /> Préviens ton négoce
    </Button>
  );
}

/** « Un collègue commande aussi des ardoises ? Invite-le » : le lien partagé par SMS ou WhatsApp. */
function InviteLe({ phrase, libelle }: { phrase: string; libelle: string }) {
  const lien = useLienInvitation();
  const message = `Je mets ma liste en achat groupé ${libelle} sur Mobiiz : plus on est nombreux, meilleur est le prix. Rejoins-nous : ${lien}`;
  return (
    <section aria-label="Inviter un collègue" className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <p className="text-[16px] font-bold">{phrase}</p>
      <div className="grid grid-cols-2 gap-2">
        <a href={`sms:?&body=${encodeURIComponent(message)}`} className={LIEN_SECONDAIRE}>
          SMS
        </a>
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className={LIEN_SECONDAIRE}>
          WhatsApp
        </a>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------------------------------- la cloche */

/** Les actions qui attendent l'artisan : une offre à comparer, un plan B, puis la prochaine action de chaque liste. */
export function actionsEnAttente(achats: CarteAchat[], next: NextAction[]): { cle: string; texte: string; href: string }[] {
  const a = [
    ...achats.filter((c) => c.etat === "offre").map((c) => ({ cle: `o-${c.id}`, texte: `Résultats : ${c.titreAchat}`, href: `/achats-groupes/${c.id}` })),
    ...achats.filter((c) => c.etat === "pas_assez" && c.actions.planB).map((c) => ({ cle: `p-${c.id}`, texte: `Pas assez de volume : envoie ta liste à tes négoces`, href: `/achats-groupes/${c.id}` })),
    ...next.slice(0, 3).map((n) => ({ cle: `n-${n.projectId}`, texte: `${n.projectName} : ${n.label}`, href: `/chantiers/${n.projectId}#${n.target}` })),
  ];
  return a.slice(0, 5);
}

/**
 * La cloche en haut à droite (point 10) : les mêmes actions que l'accueil, sur chaque écran ; un point jaune quand il y en
 * a, la liste en un appui.
 */
export function Cloche() {
  const fetchMes = useCallback((signal: AbortSignal) => api<MesAchats>("/v1/achats-groupes", { signal }).catch(() => null), []);
  const fetchNext = useCallback((signal: AbortSignal) => api<{ items: NextAction[] }>("/v1/next-actions", { signal }).catch(() => null), []);
  const { data: mes } = useResource(fetchMes);
  const { data: next } = useResource(fetchNext);
  const [ouvert, setOuvert] = useState(false);
  const actions = actionsEnAttente(mes?.achats ?? [], next?.items ?? []);
  return (
    <div className="relative">
      <button type="button" aria-label={actions.length ? `Notifications : ${actions.length}` : "Notifications"} aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)} className="pressable bouton-nuit relative flex size-11 items-center justify-center rounded-full">
        <Bell size={20} aria-hidden="true" />
        {actions.length ? <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-3 rounded-full bg-accent ring-2 ring-surface" /> : null}
      </button>
      {ouvert ? (
        <div role="dialog" aria-label="Notifications" className="animate-rise absolute top-13 right-0 z-40 flex w-72 flex-col divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          {actions.length === 0 ? <p className="p-4 text-[15px] text-muted">Rien de nouveau. On te prévient dès qu&apos;il y a du nouveau.</p> : null}
          {actions.map((a) => (
            <Link key={a.cle} href={a.href} onClick={() => setOuvert(false)} className="flex min-h-13 items-center justify-between gap-2 px-4 py-2 text-[15px] font-semibold hover:bg-ground">
              {a.texte}
              <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-muted" />
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------- « Acheter en groupe » depuis une liste */

/**
 * Depuis la liste (points 2, 3 et 22), en quatre étapes : 1) une case par ligne (cocher, c'est confirmer d'un tap sa
 * référence du catalogue ; « Tout cocher » ; une ligne sans référence reste en demande perso ; une grosse quantité amène
 * la suggestion, qui ouvre les cases avec ces lignes déjà cochées) ; 2) l'achat ouvert du secteur ou une date, la
 * commune ; 3) ses négoces ; 4) l'engagement.
 */
export function AcheterEnGroupe({ projectId }: { projectId: string }) {
  const fetcher = useCallback((signal: AbortSignal) => api<LignesListe>(`/v1/projects/${projectId}/achat-groupe`, { signal }).catch(() => null), [projectId]);
  const { data } = useResource(fetcher);
  // Correction après test de Greg (30 octobre 2026, point 2) : gardé sur le serveur, repris à l'étape quittée.
  const b = useBrouillon<SaisieChantier>(
    `achat-groupe:chantier:${projectId}`,
    { type: "achat-groupe", url: `/chantiers/${projectId}`, titre: (d) => `Ton achat groupé · ${resumeLignes(d.cochees?.length ?? 0)}`, vide: (d) => d.cochees === null },
    { cochees: null, achatId: "auto", dateBesoin: dansJours(30), livraison: null, negoces: [], engage: false },
  );
  const { cochees, dateBesoin, livraison, negoces, engage } = b.donnees;
  const achatId = b.donnees.achatId === "auto" ? undefined : b.donnees.achatId;
  const etape = b.etape;
  const setEtape = b.allerA;
  const setCochees = (f: string[] | null | ((c: string[] | null) => string[] | null)) => b.modifier((d) => ({ ...d, cochees: typeof f === "function" ? f(d.cochees) : f }));
  const setAchatId = (v: string | null) => b.modifier((d) => ({ ...d, achatId: v }));
  const setDateBesoin = (v: string) => b.modifier((d) => ({ ...d, dateBesoin: v }));
  const setLivraison = (v: string) => b.modifier((d) => ({ ...d, livraison: v }));
  const setNegoces = (v: NegoceChoisi[]) => b.modifier((d) => ({ ...d, negoces: v }));
  const setEngage = (v: boolean) => b.modifier((d) => ({ ...d, engage: v }));
  const identite = useIdentite();
  const [pendingSiret, setPendingSiret] = useState(false);
  const [messageSiret, setMessageSiret] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<(Lance & { perso: unknown[]; lancees: unknown[] }) | null>(null);
  if (!data || !b.pret) return null;
  const rattachables = data.lignes.filter((l) => l.question);
  if (rattachables.length === 0) return null;
  const achat = achatId === undefined ? (data.achatsOuverts[0]?.id ?? null) : achatId;
  const commune = (livraison ?? data.adresse ?? "").trim();
  const total = 4;
  const suivant = () => {
    setErreur(null);
    setEtape((e) => Math.min(total, e + 1));
  };
  const precedent = () => {
    setErreur(null);
    setEtape((e) => Math.max(1, e - 1));
  };

  async function lancer() {
    setErreur(null);
    if (!engage) return setErreur("Coche la case pour t'engager.");
    setPending(true);
    try {
      const r = await api<Lance & { perso: unknown[]; lancees: unknown[] }>(`/v1/projects/${projectId}/achat-groupe`, { method: "POST", body: { confirmees: cochees ?? [], achatId: achat, livraison: commune || null, dateBesoin: achat ? null : dateBesoin, negoces: negoces.map(negocePourApi), engagement: true } });
      b.effacer();
      setFait(r);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setPending(false);
    }
  }
  if (fait)
    return (
      <div role="status" className="flex flex-col gap-3 rounded-xl bg-ok-bg p-4 text-ok">
        <p className="text-[15px] font-semibold">
          {fait.lancees.length} ligne{fait.lancees.length > 1 ? "s" : ""} dans l&apos;achat groupé : {fait.titre}. {fait.perso.length ? `Les ${fait.perso.length} autres restent pour ta demande à tes négoces.` : ""}
        </p>
        {fait.offert ? <p className="text-[15px] font-bold">Ton premier achat groupé est offert.</p> : null}
        <ButtonLink href={`/achats-groupes/${fait.besoinId}`} variant="secondary">
          Préviens ton négoce
        </ButtonLink>
      </div>
    );
  // Point 8 (Greg, 28 octobre 2026) : une seule suggestion, la carte jaune ; « Acheter en groupe » (doublon) disparaît.
  // Elle ne vient que si un achat groupé de son métier est ouvert dans son secteur, ou si ses quantités en justifient un.
  if (cochees === null) {
    const ouvert = data.achatsOuverts[0] ?? null;
    if (!data.suggestion && !ouvert) return null;
    return (
      <div className="flex flex-col gap-3 rounded-xl bg-accent-soft p-4">
        <p className="text-[16px] font-bold">{data.suggestion ? data.suggestion.phrase : `Achat groupé ouvert dans ton secteur : ${ouvert!.titre}.`}</p>
        <p className="text-[15px]">{TON_MOBIIZ.avantAchatGroupe}</p>
        <Button onClick={() => setCochees(data.suggestion ? data.suggestion.keys : [])}>
          <Users size={18} aria-hidden="true" /> Mettre en achat groupé
        </Button>
      </div>
    );
  }
  const tout = rattachables.every((l) => cochees.includes(l.key));
  const achatChoisi = data.achatsOuverts.find((a) => a.id === achat);
  return (
    <Card className="flex flex-col gap-4 p-4" aria-label="Acheter en groupe">
      {etape === 1 ? (
        <Etape n={1} total={total} titre="Quelles lignes mettre en achat groupé ?" aide="Cocher une ligne, c'est confirmer sa référence. Le reste part en demande à tes négoces.">
          <button type="button" onClick={() => setCochees(tout ? [] : rattachables.map((l) => l.key))} className={LIEN_TEXTE}>
            {tout ? "Tout décocher" : "Tout cocher"}
          </button>
          <ul className="flex flex-col gap-2">
            {data.lignes.map((l) => (
              <li key={l.key}>
                {l.question ? (
                  <label className={`flex items-start gap-3 rounded-xl border p-3 ${cochees.includes(l.key) ? "border-ink bg-ground" : "border-line"}`}>
                    <input type="checkbox" checked={cochees.includes(l.key)} onChange={(e) => setCochees((c) => (e.target.checked ? [...(c ?? []), l.key] : (c ?? []).filter((k) => k !== l.key)))} className="mt-0.5 size-6 shrink-0 accent-accent" />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-semibold">
                        {l.designation} · {quantite(l.quantite)} {l.unite}
                      </span>
                      <span className="text-[14px] text-muted">{l.question}</span>
                    </span>
                  </label>
                ) : (
                  <div className="flex flex-col gap-0.5 rounded-xl border border-dashed border-line p-3">
                    <span className="text-[15px] font-semibold">
                      {l.designation} · {quantite(l.quantite)} {l.unite}
                    </span>
                    <span className="text-[14px] text-muted">Reste en demande perso à tes négoces.</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Button disabled={cochees.length === 0 || !data.droit.ok} onClick={suivant}>
            Continuer
          </Button>
        </Etape>
      ) : null}
      {etape === 2 ? (
        <Etape n={2} total={total} titre="Où et pour quand ?" onRetour={precedent}>
          <Rappel>{resumeLignes(cochees.length)}</Rappel>
          {data.achatsOuverts.length ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-[14px] font-semibold">Quel achat groupé ?</legend>
              {data.achatsOuverts.map((a) => (
                <label key={a.id} className="flex items-start gap-3 rounded-xl border border-line p-3 text-[15px]">
                  <input type="radio" name="achat" checked={achat === a.id} onChange={() => setAchatId(a.id)} className="mt-0.5 size-5 accent-accent" />
                  <span>
                    <span className="font-semibold">{a.titre}</span>
                    <span className="block text-[14px] text-muted">Ajoute ta liste avant le {dateFr(a.clotureLe)}.</span>
                  </span>
                </label>
              ))}
              <label className="flex items-center gap-3 rounded-xl border border-line p-3 text-[15px]">
                <input type="radio" name="achat" checked={achat === null} onChange={() => setAchatId(null)} className="size-5 accent-accent" />
                Une autre date de livraison
              </label>
            </fieldset>
          ) : null}
          <Field id="liste-commune" label="Commune de livraison" placeholder="22300 Lannion" value={livraison ?? data.adresse ?? ""} onChange={(e) => setLivraison(e.target.value)} />
          {achat === null ? <Field id="liste-date-besoin" label="Livraison avant le" type="date" value={dateBesoin} onChange={(e) => setDateBesoin(e.target.value)} /> : null}
          <Button disabled={!commune || (achat === null && !dateBesoin)} onClick={suivant}>
            Continuer
          </Button>
        </Etape>
      ) : null}
      {etape === 3 ? (
        <Etape n={3} total={total} titre="À quels négoces envoyer la demande ?" aide="Tes négoces habituels, ou un autre." onRetour={precedent}>
          <ChoixNegoces choisis={negoces} onChange={setNegoces} />
          <Button disabled={negoces.length === 0} onClick={suivant}>
            Continuer
          </Button>
        </Etape>
      ) : null}
      {etape === 4 ? (
        <Etape n={4} total={total} titre="Ton engagement" onRetour={precedent}>
          <Rappel>
            {resumeLignes(cochees.length)} · {achatChoisi ? achatChoisi.titre : commune} · {negoces.length} négoce{negoces.length > 1 ? "s" : ""}
          </Rappel>
          {identite.data && !identite.data.siretVerifie ? (
            // Le SIRET sur place, jamais dans le Profil : la saisie reste, et l'étape continue une fois vérifié.
            <>
              <EtapeIdentite
                identite={identite.data}
                onPending={setPendingSiret}
                onFait={(i) => {
                  identite.setData(i);
                  setMessageSiret(i.siretVerifie ? null : (i.siretMessage ?? "Ce SIRET n'a pas pu être vérifié comme une entreprise du bâtiment. Corrige-le et réessaie."));
                }}
              />
              {messageSiret ? (
                <p role="alert" className="text-[15px] font-semibold text-danger">
                  {messageSiret}
                </p>
              ) : null}
              <Button type="submit" form={FORMULAIRE_IDENTITE} pending={pendingSiret}>
                Vérifier et continuer
              </Button>
            </>
          ) : (
            <>
              <Engagement droit={data.droit} texte={data.engagement} coche={engage} onCoche={setEngage} />
              {erreur ? (
                <p role="alert" className="text-[15px] font-semibold text-danger">
                  {erreur}
                </p>
              ) : null}
              <Button pending={pending} disabled={cochees.length === 0 || !data.droit.ok} onClick={() => void lancer()}>
                Je m&apos;engage et j&apos;ajoute {cochees.length > 1 ? `ces ${cochees.length} lignes` : "cette ligne"}
              </Button>
            </>
          )}
        </Etape>
      ) : null}
    </Card>
  );
}
