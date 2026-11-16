"use client";

import { BarreSaisie, Bulle, COULEURS_CHAT, EnTeteChat, EtapesIa, Puce, TexteMobiiz, useChampDicte, useFil, useZoneVisible } from "@/components/chat-mobiiz";
import { api } from "@/lib/api";
import { useDictee } from "@/lib/dictee";
import { interpreterReponsesNumerotees, phraseNotee, type ReponseInterpretee } from "../../../../packages/domain/src/assistant/reponses-libres-numerotees";
import { questionEnMotsSimples } from "../../../../packages/domain/src/assistant/questions-simples";
import { Check, FileUp, ListChecks, Loader2, Pencil, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button, ErrorNotice } from "@/components/ui";
import { QUESTION_DE_MODELE, ReferencesCatalogue, useReferencesCatalogue } from "@/components/references-catalogue";
import type { ApiError, Takeoff } from "@/lib/api";
import { NOM_APP } from "@/lib/nom";
import { origineDeLaLigne } from "@/lib/origine-ligne";

/*
 * §50 « Ce que voit l'artisan » (fondateur, 2026-10-09) : TROIS ÉCRANS, rien d'autre.
 *  1. je dépose mon devis : un bouton ; pendant la lecture, « Je lis ton devis » ; en cas d'échec, la raison et « Réessayer » ;
 *  2. les questions : une par carte, en boutons, groupées par ouvrage, puis « Calculer ma liste » ;
 *  3. ma liste (supply-list.tsx).
 */

// ——— 1. Déposer le devis ———

/**
 * LA SEULE ACTION D'UN NOUVEAU CHANTIER : déposer le PDF. Une grande zone (toucher pour choisir, ou glisser le fichier
 * sur ordinateur), l'animation, une phrase. Le nom, l'adresse et le client viennent du devis.
 */
export function DropZone({
  onFile,
  pending,
  error,
  kind = "devis",
  small = false,
  titre,
  sousTitre,
}: {
  onFile: (file: File) => void;
  pending: boolean;
  error: ApiError | null;
  /** « liste » : « Donne ta liste de matériaux », une photo, un PDF ou une capture de ce que l'artisan a déjà compté. */
  kind?: "devis" | "liste";
  /** Nouveau cap (22 octobre) : le devis passe en petit bouton sous la liste, « Je n'ai qu'un devis ». */
  small?: boolean;
  /** Achat groupé par métier (27 octobre 2026, point 31) : le titre et la phrase du petit bouton. */
  titre?: string;
  sousTitre?: string;
}) {
  const liste = kind === "liste";
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = (file: File | undefined) => {
    if (!file || pending) return;
    onFile(file);
    if (input.current) input.current.value = "";
  };
  // §50.1 : un bouton, « Déposer mon devis » (toucher pour choisir, ou glisser le fichier sur ordinateur). Rien d'autre.
  return (
    <section aria-label={liste ? "Dépôt de la liste" : "Dépôt du devis"} className="flex flex-col gap-4">
      {error ? <ErrorNotice error={error} /> : null}
      {/* La liste : une photo (JPEG, PNG, WebP : l'iPhone convertit tout seul) ou un PDF ; le devis : un PDF. */}
      <input
        ref={input}
        id={id}
        type="file"
        aria-label={liste ? "Déposer ma liste" : "Déposer mon devis"}
        accept={liste ? "image/jpeg,image/png,image/webp,application/pdf,.pdf" : "application/pdf,.pdf"}
        className="sr-only"
        disabled={pending}
        onChange={(e) => take(e.target.files?.[0])}
      />
      {small ? (
        // Le petit bouton « Je n'ai qu'un devis » (nouveau cap, 22 octobre) : le parcours du devis reste, en second.
        <label
          htmlFor={id}
          aria-disabled={pending}
          className={`pressable flex min-h-16 cursor-pointer items-center gap-3 rounded-xl bg-surface px-4 py-3 shadow-card focus-within:outline-3 focus-within:outline-accent ${pending ? "pointer-events-none opacity-80" : "active:bg-ground"}`}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ground text-ink">
            {pending ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <FileUp size={20} aria-hidden="true" />}
          </span>
          <span className="flex flex-col">
            <span className="text-[16px] font-semibold">{pending && liste ? "Je lis ta liste…" : (titre ?? "Je n'ai qu'un devis")}</span>
            <span className="text-[14px] leading-snug text-muted">{sousTitre ?? "On t'avance la liste, sans garantie, tu la peaufines."}</span>
          </span>
        </label>
      ) : (
      <label
        htmlFor={id}
        aria-disabled={pending}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files?.[0]);
        }}
        className={`pressable flex min-h-56 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-8 text-center focus-within:outline-3 focus-within:outline-accent ${
          over ? "border-accent bg-accent/5" : "border-line bg-surface"
        } ${pending ? "pointer-events-none opacity-80" : ""}`}
      >
        <span className={`flex size-16 items-center justify-center rounded-full ${liste ? "bg-ink text-white" : "bg-accent text-on-accent"}`}>
          {pending ? <Loader2 size={28} className="animate-spin" aria-hidden="true" /> : liste ? <ListChecks size={28} aria-hidden="true" /> : <FileUp size={28} aria-hidden="true" />}
        </span>
        <span className="text-[22px] leading-tight font-extrabold tracking-[-0.02em]">{pending && liste ? "Je lis ta liste…" : liste ? "Donne ta liste de matériaux" : "J'ai un devis"}</span>
        {liste && !pending ? <span className="text-[15px] leading-snug text-muted">Une photo, un PDF ou une capture : je la remets au propre.</span> : null}
      </label>
      )}
    </section>
  );
}

// ——— 2. L'analyse ———

/**
 * LE TRAVAIL SE VOIT DANS LA DISCUSSION (Greg, 16 novembre 2026 ; RÈGLE CHANGÉE pour §50.1 : avant, une animation plein
 * écran, le devis au surligneur et des fournitures qui en sortaient) : « N'hésite pas à revoir l'animation, quelque chose
 * de plus neutre et plus moderne », « Étapes visibles pendant le travail (« Lecture… », « Vérification… ») ». Le même
 * écran que les questions : la discussion Mobiiz, une phrase dans une bulle, et l'étape en cours, dépliable. Ce sont les
 * vraies phases du serveur (la lecture, puis le calcul), jamais une barre qui ferait semblant d'avancer. Plein écran,
 * par-dessus le menu ; le retour laisse le travail continuer (le serveur prévient quand c'est prêt).
 */
function DiscussionEnCours({ region, phrase, etape, detail }: { region: string; phrase: string; etape: string; detail: string }) {
  const router = useRouter();
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <section aria-label={region} className="fixed top-0 left-0 z-[45] flex h-dvh w-full flex-col overflow-hidden text-[var(--chat-texte)]" style={{ backgroundColor: COULEURS_CHAT.fond }}>
      <EnTeteChat onFermer={() => router.push("/chantiers?vue=suivi")} libelleFermer="Revenir à mes listes" titreEnTexte />
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-3 overflow-y-auto px-3 py-4">
        <Bulle de="mobiiz">
          <h2 aria-live="polite" className="rounded-[22px] rounded-bl-md px-4 py-2.5 text-[16px] leading-snug font-semibold text-[var(--chat-texte)]" style={{ backgroundColor: COULEURS_CHAT.bulle }}>
            {phrase}
          </h2>
        </Bulle>
        <EtapesIa etapes={[{ cle: etape, titre: etape, detail }]} fini={false} />
      </div>
    </section>
  );
}

/** Au-delà, « Je lis ton devis » devient « Gros devis, j'y suis encore… » (décision du fondateur, 2026-10-13). */
export const LECTURE_LONGUE_MS = 30_000;

export function AnalysisScreen() {
  // Décision du fondateur (2026-10-13, « Je lis ton devis » longtemps, « plus rien ne se passe ») : passé 30 s, la phrase
  // dit que la lecture continue ; toujours une seule phrase (§50.1).
  const [longue, setLongue] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLongue(true), LECTURE_LONGUE_MS);
    return () => clearTimeout(t);
  }, []);
  return <DiscussionEnCours region="Analyse du devis" phrase={longue ? "Gros devis, j'y suis encore…" : "Je lis ton devis"} etape="Lecture…" detail="Je lis ton document ligne par ligne. Tu peux revenir à tes listes : je te préviens quand c'est prêt." />;
}

// ——— Prévenir l'artisan quand c'est prêt ———


/**
 * Quand l'artisan a regardé ailleurs, l'onglet change de titre et, si la page tourne encore, elle montre la
 * notification elle-même. Le SERVEUR envoie la même (Web Push, même étiquette : une seule s'affiche) : c'est elle qui
 * arrive téléphone verrouillé ou application fermée.
 */
export function notifyReady(title: string, body: string, tag: string): void {
  if (typeof document === "undefined") return;
  if (!document.hidden) return;
  document.title = `✓ ${title}`;
  const restore = () => {
    document.title = NOM_APP;
    document.removeEventListener("visibilitychange", restore);
  };
  document.addEventListener("visibilitychange", restore);
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const options = { body, tag, icon: "/icon-192.png", data: { url: window.location.href } };
  // Sur téléphone, une notification passe par le service worker ; sur ordinateur, directement.
  const sw = "serviceWorker" in navigator ? navigator.serviceWorker.getRegistration("/sw.js") : Promise.resolve(undefined);
  void sw
    .then((reg) => (reg ? reg.showNotification(title, options) : void new Notification(title, options)))
    .catch(() => undefined);
}

// ——— 4. Le calcul ———

/** Après « Calculer ma liste » : la même discussion, une phrase et l'étape du calcul (les quantités sont calculées par le code, avec les règles du métier). */
export function CalculScreen() {
  return <DiscussionEnCours region="Calcul de la liste" phrase="Je prépare ta liste" etape="Vérification des quantités…" detail="Chaque quantité est calculée avec les règles du métier, à partir de ton document et de tes réponses." />;
}

/**
 * LE RÉCAPITULATIF (Greg, 16 novembre 2026 : « À la fin : récapitulatif court dans la discussion, puis un bouton "Voir ma
 * liste" qui ouvre l'écran de liste habituel (le même que la saisie à la main) »). Toujours la même discussion : combien
 * d'articles, d'où ils viennent (dits, calculés, à vérifier), et un seul bouton. Rien n'est envoyé d'ici.
 */
export function RecapScreen({ takeoff, onVoir }: { takeoff: Takeoff; onVoir: () => void }) {
  const router = useRouter();
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  const articles = takeoff.purchase.toBuy;
  const compte = (o: ReturnType<typeof origineDeLaLigne>) => articles.filter((a) => origineDeLaLigne(a) === o).length;
  const [dits, calcules, aVerifier] = [compte("Dit par toi"), compte("Calculé"), compte("À vérifier")];
  const detail = [dits ? `${dits} dit${dits > 1 ? "s" : ""} par toi` : null, calcules ? `${calcules} calculé${calcules > 1 ? "s" : ""}` : null, aVerifier ? `${aVerifier} à vérifier` : null].filter(Boolean).join(", ");
  return (
    <section aria-label="Récapitulatif" className="fixed top-0 left-0 z-[45] flex h-dvh w-full flex-col overflow-hidden text-[var(--chat-texte)]" style={{ backgroundColor: COULEURS_CHAT.fond }}>
      <EnTeteChat onFermer={() => router.push("/chantiers?vue=suivi")} libelleFermer="Revenir à mes listes" titreEnTexte />
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-3 overflow-y-auto px-3 py-4">
        <Bulle de="mobiiz" label="Message de MOBIIZ">
          <TexteMobiiz>
            {`Ta liste est prête : ${articles.length} article${articles.length > 1 ? "s" : ""}${detail ? ` (${detail})` : ""}.\n${aVerifier ? "Les lignes à vérifier sont en haut de ta liste." : "Vérifie-la, corrige ce que tu veux, puis envoie-la à tes négoces."}`}
          </TexteMobiiz>
        </Bulle>
        <div className="pl-10">
          <Button className="shadow-card!" onClick={onVoir}>
            Voir ma liste
          </Button>
        </div>
      </div>
    </section>
  );
}

// ——— 3. Les questions de comptoir ———

/**
 * §48.2 / §48.4 : TOUT ce qui manque pour calculer se demande ICI, en une fois, AU BOUTON (ni texte ni micro sur cet
 * écran). Après la sortie de la liste, plus aucune question : ce qui reste sans réponse est clos au calcul et la ligne
 * sort orange. Cinq familles :
 *  - « ce que le devis ne dit pas » : les questions du calcul (format, développé, façonnage pièce par pièce…) ;
 *  - « comme d'habitude ? » : les habitudes établies de l'entreprise ;
 *  - « je pars sur… » : les hypothèses du calcul (rampant, pente, liteaux…), la valeur prise par défaut est marquée ;
 *  - « déjà sur place ? » : liteaux, écran, voliges d'un ouvrage en dépose / repose ;
 *  - « consommables de pose » : UNE question (§49.1.4), seuls ceux des lignes écrites entrent dans la liste.
 */
type QuestionKind = "decision" | "habit" | "assumption" | "onsite" | "ajout";

interface CounterQuestion {
  key: string;
  kind: QuestionKind;
  text: string;
  options: { label: string; value: string }[];
  unit: string | null;
  /** De quoi parle la question (la ligne du devis), en petit au-dessus. */
  about: string | null;
  hint: string | null;
  /** Une valeur sans boutons proposés : elle se règle au plus / moins (jamais au clavier). */
  numeric: boolean;
  /** §50.2 : l'ouvrage sous lequel la carte se range (« Gouttière zinc », « Couverture zinc à joint debout »). */
  group: string;
  /**
   * Retour du fondateur (2026-10-10) : « quand l'application ne sait pas, elle demande et laisse de quoi écrire ». Une valeur
   * (pente, entraxe, développé) ou un modèle (tuile) qui n'est pas dans les boutons s'écrit sous « Autre ».
   */
  free?: "number" | "text" | "written";
  /** La valeur prise sans réponse (hypothèse dite, habitude) : marquée sur son bouton. */
  usual: string | null;
}

export interface CounterAnswers {
  /** `valeur: null` : la question retirée par l'artisan (la poubelle), partie sans réponse. */
  reponses: { question: string; valeur: string | null; unite?: string }[];
  ajouts: { id: string; reponse: "oui" | "non" }[];
  retraits?: string[];
}

type Given = { value: string; label: string; custom?: boolean };

/** Ce qui s'écrit sous « Autre » : un modèle (produit, question du comptoir), ou une valeur qui a son unité. */
function freeOf(key: string, kind: string | null, unit: string | null, options: readonly { value: string }[], named = false): CounterQuestion["free"] {
  // Un modèle, ou une qualité qui se nomme (l'ardoise, l'aspect du zinc, une teinte) : les boutons ne sont que les plus courants.
  // §51.2 : une donnée qu'une relecture a ouverte se répond en écrivant.
  if (key.startsWith("fiche:")) return "written";
  if (named || /^(?:engine:)?product:/.test(key) || kind === "choose_product" || kind === "confirm_product" || key.startsWith("comptoir:")) return "text";
  // Une valeur chiffrée à boutons (« 30° · 35° · 45° ») : toute autre valeur s'écrit, dans son unité.
  if (unit && unit !== "u" && options.length > 0 && options.every((o) => /^\d+(?:[.,]\d+)?$/.test(o.value))) return "number";
  // §51.2 et §51.4 : un choix du calcul (le façonnage) a aussi « Autre » ; ce qui s'y écrit est relu par l'IA, qui met la
  // fiche à jour. Pas pour oui / non (consommables).
  // Temps deux (directive du fondateur, 2026-10-12) : « Autre » PARTOUT où il y a des boutons, consommables compris.
  if (/^(?:engine:)?(?:param|fiche):/.test(key) && options.length > 0) return "written";
  if (options.length > 0) return "text";
  return undefined;
}

/** La question consommables du moteur (§49.1 point 4). */
const CONSUMABLES_KEY = "param:consommables";

const ONSITE = /\b(liteaux?|contre-?liteaux?|[ée]cran|pare-?pluie|hpv|voliges?|voligeage)\b/i;
const REWORK = /\b(d[ée]pose|repose|r[ée]fection|r[ée]novation|reprise)\b/i;

/** Les questions de comptoir d'un quantitatif lu, rangées par famille. */
export function counterQuestions(takeoff: Takeoff): CounterQuestion[] {
  const groupOf = ouvrageOf(takeoff);
  const decisions: CounterQuestion[] = takeoff.view.decisions
    .filter((d) => d.question)
    .map((d) => {
      const q = d.question!;
      const engine = d.key.startsWith("engine:") || q.key.startsWith("param:");
      return {
        key: d.key,
        // §49.4 : la question consommables (oui / non) a son bloc, « Consommables de pose ».
        kind: q.key === CONSUMABLES_KEY ? "ajout" : "decision",
        text: engine ? d.text.replace(/ Cela change la commande :.*$/, "") : d.text,
        options: q.options,
        unit: q.unit,
        about: engine ? null : d.title,
        hint: q.hint,
        numeric: q.kind === "param" && q.options.length === 0,
        usual: null,
        ...(freeOf(q.key, q.kind, q.unit, q.options, q.named) ? { free: freeOf(q.key, q.kind, q.unit, q.options, q.named)! } : {}),
        group: q.key === CONSUMABLES_KEY ? CONSUMABLES_GROUP : groupOf({ key: q.key, lineIds: d.lineIds }),
      };
    });
  const asked = new Set(decisions.map((d) => d.key.replace(/^engine:/, "")));
  const habits: CounterQuestion[] = (takeoff.habits ?? []).map((h) => ({ key: h.key, kind: "habit", text: h.question, options: h.options, unit: h.unit, about: null, hint: null, numeric: false, usual: h.value, group: groupOf({ key: h.key, lineIds: [] }), ...(freeOf(h.key, null, h.unit, h.options) ? { free: freeOf(h.key, null, h.unit, h.options)! } : {}) }));
  for (const h of habits) asked.add(h.key);
  // Les hypothèses à boutons (param ou produit) : « je pars sur 5,5 m de rampant », la valeur prise est marquée.
  const assumptions: CounterQuestion[] = takeoff.purchase.assumptions
    .filter((a) => /^(param|product):/.test(a.key) && a.choices.length > 1 && !asked.has(a.key))
    .map((a) => {
      // La valeur dite (« 5,5 », « standard ») retrouvée parmi les boutons, quelle que soit sa graphie (§49.2.5 : elle part
      // comme confirmée au calcul).
      const plain = (t: string) => t.toLowerCase().replace(",", ".").trim();
      const said = plain(a.value);
      const usual = a.choices.find((c) => plain(c.label) === said || plain(c.value) === said || plain(c.label).startsWith(said) || plain(c.label).startsWith(`${said} `))?.value ?? null;
      const unit = a.key.startsWith("param:") ? a.unit : null;
      const free = freeOf(a.key, null, unit, a.choices, a.named);
      return { key: a.key, kind: "assumption", text: `${a.label} ?`, options: a.choices, unit, about: null, hint: a.note, numeric: false, usual, group: groupOf({ key: a.key, lineIds: [] }), ...(free ? { free } : {}) };
    });
  // §48.2 : en dépose / repose, ce qui sert de support est peut-être déjà sur place.
  const rework = takeoff.lines.some((l) => REWORK.test(l.designation));
  const onsite: CounterQuestion[] = rework
    ? takeoff.purchase.toBuy
        .filter((b) => ONSITE.test(b.label))
        .map((b) => ({
          key: `onsite:${b.key}`,
          kind: "onsite",
          text: `${b.label} : à fournir, ou déjà sur place ?`,
          options: [
            { label: "À fournir", value: "fournir" },
            { label: "Déjà sur place", value: "place" },
          ],
          unit: null,
          about: null,
          hint: b.quantity,
          numeric: false,
          usual: null,
          group: groupOf({ key: b.key, lineIds: b.lineIds, itemKey: b.key }),
        }))
    : [];
  const ajouts: CounterQuestion[] = takeoff.purchase.suggestions.map((s) => ({
    key: `ajout:${s.key}`,
    kind: "ajout",
    text: `${s.label}${s.quantity ? ` (${s.quantity})` : ""}`,
    options: [
      { label: "Oui", value: "oui" },
      { label: "Non", value: "non" },
    ],
    unit: null,
    about: null,
    hint: null,
    numeric: false,
    usual: null,
    group: CONSUMABLES_GROUP,
  }));
  return [...decisions, ...habits, ...assumptions, ...onsite, ...ajouts];
}

const CONSUMABLES_GROUP = "Consommables";
const SITE_GROUP = "Le chantier";

/**
 * §50.2 : l'ouvrage d'une question, lu dans la liste déjà calculée : la ligne du devis qu'elle concerne, sinon l'ouvrage
 * nommé dans sa clé (« param:faconnage@bandes-zinc »), sinon le chantier en entier (pente, zone).
 */
function ouvrageOf(takeoff: Takeoff) {
  const groups = takeoff.purchase.screen.groups;
  const byWork = (work: string) =>
    groups.find((g) => g.key === work) ?? groups.find((g) => g.key.startsWith(work) || work.startsWith(g.key)) ?? takeoff.purchase.groups.find((g) => g.key === work || work.startsWith(g.key));
  return ({ key, lineIds, itemKey }: { key: string; lineIds: readonly string[]; itemKey?: string }): string => {
    const byLine = lineIds.length > 0 ? groups.find((g) => g.rows.some((r) => r.lineIds.some((id) => lineIds.includes(id)))) : undefined;
    if (byLine) return byLine.label;
    const byItem = itemKey ? groups.find((g) => g.rows.some((r) => r.itemKey === itemKey)) : undefined;
    if (byItem) return byItem.label;
    const work = /@([^:@]+)$/.exec(key)?.[1];
    const found = work ? byWork(work) : undefined;
    if (found) return found.label;
    const param = /^(?:engine:)?param:([a-z0-9_]+)/.exec(key)?.[1];
    if (param) {
      // Une donnée d'un seul ouvrage de ce devis (« développé » de la gouttière) se range sous lui.
      const owners = groups.filter((g) => g.rows.some((r) => r.decisionKey?.includes(param)));
      if (owners.length === 1) return owners[0]!.label;
    }
    return SITE_GROUP;
  };
}

/**
 * Ce qui part au calcul : ce que l'artisan a touché, et les valeurs de « Je pars sur ces valeurs » qu'il a vues sans les
 * changer : il les CONFIRME en lançant le calcul (§49.2.5 : une ligne reste orange tant qu'un défaut non confirmé la porte).
 */
export function counterAnswers(questions: readonly CounterQuestion[], given: Readonly<Record<string, Given>>, retired: ReadonlySet<string> = new Set()): CounterAnswers {
  const out: Required<CounterAnswers> = { reponses: [], ajouts: [], retraits: [] };
  for (const q of questions) {
    // Retour du fondateur (2026-10-12) : une question retirée part sans réponse ; sa ligne reste orange, réglée dans la liste.
    if (retired.has(q.key)) {
      if (q.kind !== "ajout" && q.kind !== "onsite") out.reponses.push({ question: q.key, valeur: null });
      continue;
    }
    const g = given[q.key] ?? (q.kind === "assumption" && q.key.startsWith("param:") && q.usual !== null ? { value: q.usual, label: q.usual } : undefined);
    if (!g) continue;
    if (q.kind === "ajout" && !q.key.startsWith("ajout:")) out.reponses.push({ question: q.key, valeur: g.value, unite: q.unit || "u" });
    else if (q.kind === "ajout") out.ajouts.push({ id: q.key.slice("ajout:".length), reponse: g.value === "oui" ? "oui" : "non" });
    else if (q.kind === "onsite") {
      if (g.value === "place") out.retraits.push(q.key.slice("onsite:".length));
    } else if (q.unit !== null && (q.numeric || q.kind === "habit" || (q.kind === "assumption" && q.key.startsWith("param:")))) out.reponses.push({ question: q.key, valeur: g.value, unite: q.unit || "u" });
    else out.reponses.push({ question: q.key, valeur: g.value });
  }
  return out;
}

/** §49.4 : le façonnage d'une pièce de zinguerie écrite est obligatoire avant le calcul (même règle que l'API). */
const mandatory = (q: CounterQuestion) => /^(?:engine:)?param:faconnage(?:@|$)/.test(q.key);

/**
 * Retour du fondateur (2026-10-12) : « Il faut mettre le voyant rouge avec une phrase là où il y a le problème. » Un refus du
 * serveur nomme la réponse fautive (`reponses.N.valeur`) : la phrase va sur la carte de cette question.
 */
function cardErrors(error: ApiError | null, sent: readonly string[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const d of error?.details ?? []) {
    const n = /^reponses\.(\d+)(?:\.|$)/.exec(d.path)?.[1];
    const key = n !== undefined ? sent[Number(n)] : undefined;
    if (!key || out.has(key)) continue;
    const max = /<=\s*(\d+)/.exec(d.message)?.[1];
    out.set(key, max ? `Réponse trop longue : ${max} caractères au plus.` : "Cette réponse ne passe pas : choisis un bouton ou réécris-la.");
  }
  return out;
}

type MessageQuestions = { de: "mobiiz" | "moi"; texte: string; cle?: string };

/** Les morceaux d'une réponse écrite (même découpe que le moteur) : pour savoir s'il reste du texte que le code n'a pas rangé. */
const morceauxDe = (texte: string) => texte.split(/\n|;|,(?!\d)|\bet\b/).map((m) => m.trim()).filter(Boolean).length;

/**
 * UN SEUL ÉCRAN, LA DISCUSSION (Greg, 16 novembre 2026 ; RÈGLE CHANGÉE : avant, une conversation en haut et les mêmes
 * questions en cartes dessous, « réponds avec les numéros »). Tout se passe dans le fil, comme l'assistant : UNE question à
 * la fois dans une bulle de Mobiiz, ses boutons juste dessous ; l'artisan touche un bouton OU répond au clavier ou à la
 * voix dans la barre du bas, toujours. Sa réponse s'affiche comme son message, les boutons disparaissent, la question
 * suivante arrive. Une réponse brève, ou plusieurs d'un coup, est lue par le sens et par l'ordre (le code d'abord, puis le
 * serveur et son IA pour ce qui reste) ; Mobiiz confirme en UNE ligne et ne pose que ce qui manque. Quand tout est
 * répondu, « Calculer ma liste » est proposé dans le fil. Le serveur revalide tout au calcul.
 */
export function QuestionsScreen({ takeoff, pending, error, onSubmit, onReponses }: { takeoff: Takeoff; pending: boolean; error: ApiError | null; onSubmit: (answers: CounterAnswers) => void; onReponses?: (reponses: NonNullable<CounterAnswers["reponses"]>) => void }) {
  const router = useRouter();
  const duServeur = useMemo(() => counterQuestions(takeoff), [takeoff]);
  // Une question déjà répondue et partie au serveur n'est plus dans sa liste : on la garde ici, pour que « toucher une de
  // ses réponses la rouvre » marche jusqu'au calcul (Greg, 16 novembre 2026).
  const [memoire, setMemoire] = useState<readonly CounterQuestion[]>(duServeur);
  const [vues, setVues] = useState(duServeur);
  if (vues !== duServeur) {
    setVues(duServeur);
    const cles = new Set(duServeur.map((q) => q.key));
    setMemoire((m) => [...m.filter((q) => !cles.has(q.key)), ...duServeur]);
  }
  const questions = useMemo(() => {
    const cles = new Set(duServeur.map((q) => q.key));
    return [...memoire.filter((q) => !cles.has(q.key)), ...duServeur];
  }, [memoire, duServeur]);
  // §50.2 : dans l'ordre où l'ouvrage arrive ; le chantier et les consommables à la fin.
  const ordonnees = useMemo(() => {
    const order = [...new Set(questions.map((q) => q.group))].sort((a, b) => Number(a === SITE_GROUP || a === CONSUMABLES_GROUP) - Number(b === SITE_GROUP || b === CONSUMABLES_GROUP) || Number(a === CONSUMABLES_GROUP) - Number(b === CONSUMABLES_GROUP));
    return order.flatMap((group) => questions.filter((q) => q.group === group)).map((q) => ({ ...q, simple: questionEnMotsSimples(q.key, q.text, q.options) }));
  }, [questions]);
  const [given, setGiven] = useState<Record<string, Given>>(() => {
    // « Comme d'habitude » : la réponse habituelle est déjà prise, elle se dit en une ligne et se change d'un tap.
    const start: Record<string, Given> = {};
    for (const q of questions) {
      if (q.kind !== "habit" || q.usual === null) continue;
      const o = q.options.find((x) => x.value === q.usual);
      if (o) start[q.key] = { value: o.value, label: o.label };
    }
    return start;
  });
  const [retired, setRetired] = useState<ReadonlySet<string>>(() => new Set());
  const [messages, setMessages] = useState<MessageQuestions[]>(() => {
    const habitudes = questions.filter((q) => q.kind === "habit" && q.usual !== null).map((q) => q.options.find((o) => o.value === q.usual)?.label).filter(Boolean);
    const aPoser = questions.length - habitudes.length;
    const tete = aPoser > 1 ? "J'ai lu ton devis. Il me manque quelques réponses pour calculer ta liste." : aPoser === 1 ? "J'ai lu ton devis. Il me manque une réponse pour calculer ta liste." : "J'ai lu ton devis.";
    return [{ de: "mobiiz", texte: habitudes.length ? `${tete}\nComme d'habitude : ${habitudes.join(", ")}.` : tete }];
  });
  const [reflexion, setReflexion] = useState(false);
  const [autre, setAutre] = useState(false);
  // « Ma liste · 5 articles » (Greg, 16 novembre 2026) : la liste se construit sous les yeux de l'artisan ; le bandeau
  // l'ouvre à tout moment, chaque article avec son origine.
  const [listeOuverte, setListeOuverte] = useState(false);
  const articles = takeoff.purchase.toBuy;
  const champ = useChampDicte();
  const dictee = useDictee(champ.surVoix);
  const restantes = ordonnees.filter((q) => !given[q.key] && !retired.has(q.key));
  const courante = restantes[0] ?? null;
  // Catalogue métier (Greg, 31 octobre 2026) : sur une question de modèle, ce qui se tape propose ses références.
  const references = useReferencesCatalogue(champ.saisie, Boolean(courante && QUESTION_DE_MODELE.test(courante.text)));
  const { fil, enBas } = useFil([messages.length, reflexion, courante?.key, pending]);
  const zone = useZoneVisible(enBas);

  // Un refus du serveur nomme la réponse fautive (`reponses.N`) : sa question revient dans le fil, avec la phrase.
  const [sent, setSent] = useState<readonly string[]>([]);
  const [vu, setVu] = useState<ApiError | null>(null);
  if (error && vu !== error) {
    setVu(error);
    const fautes = cardErrors(error, sent);
    if (fautes.size === 0) setMessages((m) => [...m, { de: "mobiiz", texte: error.message || "Le calcul n'est pas parti. Réessaie dans un instant." }]);
    else {
      setGiven((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !fautes.has(k))));
      setMessages((m) => [...m, ...[...fautes.values()].map((texte) => ({ de: "mobiiz" as const, texte }))]);
    }
  }

  const noter = (q: (typeof ordonnees)[number], g: Given) => {
    setAutre(false);
    setGiven((prev) => ({ ...prev, [q.key]: g }));
    setMessages((m) => [...m, { de: "moi", texte: g.label, cle: q.key }]);
  };
  const sansReponse = (q: (typeof ordonnees)[number]) => {
    setAutre(false);
    setRetired((prev) => new Set(prev).add(q.key));
    setMessages((m) => [...m, { de: "moi", texte: "Je ne sais pas", cle: q.key }, { de: "mobiiz", texte: "Pas de souci : la ligne restera à vérifier dans ta liste." }]);
  };
  /** Toucher une de ses réponses la rouvre : la question revient dans le fil. */
  const reprendre = (cle: string) => {
    setGiven((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== cle)));
    setRetired((prev) => new Set([...prev].filter((k) => k !== cle)));
    setMessages((m) => [...m, { de: "mobiiz", texte: "D'accord, on reprend cette question." }]);
  };

  const envoyer = async () => {
    const texte = champ.saisie.trim();
    if (!texte || reflexion || pending || restantes.length === 0) return;
    dictee.arreter();
    champ.setSaisie("");
    setAutre(false);
    setMessages((m) => [...m, { de: "moi", texte }]);
    const posees = restantes.map((q, i) => ({ numero: i + 1, cle: q.key, texte: q.simple.texte, options: q.simple.options, unite: q.unit, libre: q.options.length === 0 && !q.free ? (q.numeric || (q.unit && q.unit !== "u") ? ("number" as const) : ("written" as const)) : q.free, numerique: q.numeric }));
    let lues: ReponseInterpretee[] = interpreterReponsesNumerotees(posees, texte);
    const compris = (rs: readonly ReponseInterpretee[]) => rs.filter((r) => r.statut === "compris").length;
    // Ce que le code n'a pas rangé passe au serveur (son IA, si elle est allumée, puis la revalidation par le code).
    if (compris(lues) < Math.min(morceauxDe(texte), posees.length)) {
      setReflexion(true);
      const r = await api<{ ia: boolean; reponses: ReponseInterpretee[] }>("/v1/assistant/interpretation", {
        method: "POST",
        body: { questions: posees.map((q) => ({ numero: q.numero, cle: q.cle, texte: q.texte, options: q.options, unite: q.unite, ...(q.libre ? { libre: q.libre } : {}), ...(q.numerique ? { numerique: true } : {}) })), texte: texte.slice(0, 2000) },
      }).catch(() => null);
      if (r?.ia && r.reponses.length === lues.length && compris(r.reponses) >= compris(lues)) lues = r.reponses;
      setReflexion(false);
    }
    const prises: Record<string, Given> = {};
    const laissees: string[] = [];
    for (const r of lues) {
      const q = restantes[r.numero - 1]!;
      if (r.statut === "compris" && r.valeur !== null) prises[q.key] = { value: r.valeur, label: r.libelle ?? r.valeur, ...(r.libreEcrite ? { custom: true } : {}) };
      else if (r.statut === "sans_reponse" && r.raison && !mandatory(q)) laissees.push(q.key);
    }
    if (Object.keys(prises).length) setGiven((prev) => ({ ...prev, ...prises }));
    if (laissees.length) setRetired((prev) => new Set([...prev, ...laissees]));
    // UNE ligne : ce qui est compris ; sinon, pourquoi la question posée revient. Jamais la liste de tout.
    const notee = phraseNotee(Object.values(prises).map((g) => g.label));
    const premiere = lues[0];
    const suite = notee
      ? notee
      : laissees.length
        ? "Pas de souci : la ligne restera à vérifier dans ta liste."
        : (premiere?.raison ?? "Je n'ai pas compris. Touche un bouton ou redis-le autrement.");
    setMessages((m) => [...m, { de: "mobiiz", texte: suite }]);
  };

  const calculer = () => {
    // Ce qui est déjà parti au serveur ne repart pas.
    const tout = counterAnswers(questions, given, retired);
    const answers = { ...tout, reponses: tout.reponses.filter((r) => r.valeur === null || !parties.current.has(`${r.question}=${r.valeur}`)) };
    setSent(answers.reponses.map((r) => r.question));
    onSubmit(answers);
  };
  // « Quand tout est répondu, elle réfléchit, pose d'éventuelles dernières questions de la même façon, puis propose
  // "Calculer ma liste" » (Greg, 16 novembre 2026). Recette en ligne du même jour : une réponse peut faire naître une
  // question du calcul (le nombre de descentes, le façonnage d'une autre pièce). Dès que tout est répondu, les réponses
  // partent donc au serveur ; ce qu'il lui manque encore arrive dans le fil, AVANT « Calculer ma liste ». Chaque réponse
  // ne part qu'une fois ; « Je ne sais pas » ne part qu'au calcul.
  const parties = useRef<Set<string>>(new Set());
  const dernierEnvoi = useRef<readonly string[]>([]);
  // Un envoi refusé n'a rien enregistré : ses réponses repartiront avec la réponse corrigée.
  useEffect(() => {
    if (!error) return;
    for (const k of dernierEnvoi.current) parties.current.delete(k);
    dernierEnvoi.current = [];
  }, [error]);
  const [verification, setVerification] = useState(false);
  const toutRepondu = restantes.length === 0;
  useEffect(() => {
    if (!onReponses || !toutRepondu || pending || reflexion) return;
    const nouvelles = counterAnswers(questions, given, retired).reponses.filter((r) => r.valeur !== null && !parties.current.has(`${r.question}=${r.valeur}`));
    if (nouvelles.length === 0) return;
    for (const r of nouvelles) parties.current.add(`${r.question}=${r.valeur}`);
    dernierEnvoi.current = nouvelles.map((r) => `${r.question}=${r.valeur}`);
    setSent(nouvelles.map((r) => r.question));
    setVerification(true);
    onReponses(nouvelles);
  }, [onReponses, toutRepondu, pending, reflexion, questions, given, retired]);
  // La vérification finie : s'il reste une question, elle se dit en une ligne ; sinon « Calculer ma liste » arrive.
  if (verification && !pending) {
    setVerification(false);
    if (!error && courante) setMessages((m) => [...m, { de: "mobiiz", texte: restantes.length > 1 ? "Encore quelques précisions avant de calculer." : "Encore une précision avant de calculer." }]);
  }
  const invite = courante ? (autre ? "Écris ta réponse…" : courante.options.length === 0 ? `Écris ta réponse${courante.unit && courante.unit !== "u" ? ` (${courante.unit === "m2" ? "m²" : courante.unit})` : ""}…` : "Réponds ici…") : "Réponds ici…";

  return (
    <div ref={zone} role="dialog" aria-modal="true" aria-label="Questions de Mobiiz" className="fixed top-0 left-0 z-50 flex h-[100dvh] w-full flex-col text-[var(--chat-texte)]" style={{ backgroundColor: COULEURS_CHAT.fond }}>
      <EnTeteChat
        onFermer={() => router.push("/chantiers")}
        apres={
          articles.length > 0 ? (
            <button
              type="button"
              onClick={() => setListeOuverte(true)}
              className="pressable flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold whitespace-nowrap text-[var(--chat-texte)]"
              style={{ borderColor: COULEURS_CHAT.trait, backgroundColor: "var(--chat-voile)" }}
            >
              <ListChecks size={16} aria-hidden="true" className="text-[var(--chat-jaune-texte)]" />
              Ma liste · {articles.length} article{articles.length > 1 ? "s" : ""}
            </button>
          ) : null
        }
      />
      {listeOuverte ? (
        <div role="dialog" aria-modal="true" aria-label="Ma liste" className="absolute top-0 left-0 z-10 flex h-full w-full flex-col" style={{ backgroundColor: COULEURS_CHAT.fond }}>
          <div className="flex shrink-0 items-center gap-2 border-b px-3 pt-[max(env(safe-area-inset-top),8px)] pb-2" style={{ borderColor: COULEURS_CHAT.trait }}>
            <p className="min-w-0 grow truncate pl-1 text-[16px] font-bold">
              Ma liste · {articles.length} article{articles.length > 1 ? "s" : ""}
            </p>
            <button type="button" onClick={() => setListeOuverte(false)} aria-label="Fermer ma liste" className="pressable flex size-11 shrink-0 items-center justify-center rounded-full active:bg-[var(--chat-texte)]/10">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <p className="shrink-0 px-4 pt-3 text-[14px] text-[var(--chat-texte)]/75">Elle se complète avec tes réponses. Tu pourras tout corriger à la fin.</p>
          <ul aria-label="Articles de ma liste" className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-3 py-3">
            {articles.map((a) => (
              <li key={a.key} className="flex items-start gap-3 rounded-2xl px-4 py-3" style={{ backgroundColor: COULEURS_CHAT.bulle }}>
                <span className="flex min-w-0 grow flex-col">
                  <span className="text-[15px] leading-snug font-semibold break-words">{a.label}</span>
                  <span className={`text-[13px] ${a.state === "to_confirm" ? "font-bold text-[#FF8A6B]" : "text-[var(--chat-texte)]/70"}`}>{origineDeLaLigne(a)}</span>
                </span>
                <span className="shrink-0 text-[15px] font-extrabold tabular-nums">{a.quantity ?? ""}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        <section ref={fil} aria-label="Les questions" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 py-4">
          {messages.map((m, i) =>
            m.de === "mobiiz" ? (
              <Bulle key={i} de="mobiiz" label="Message de MOBIIZ">
                <TexteMobiiz>{m.texte}</TexteMobiiz>
              </Bulle>
            ) : m.cle && (given[m.cle] || retired.has(m.cle)) && !pending && messages.findLastIndex((x) => x.cle === m.cle) === i ? (
              <button key={i} type="button" onClick={() => reprendre(m.cle!)} aria-label={`Modifier ma réponse : ${m.texte}`} className="pressable max-w-[82%] self-end rounded-[22px] rounded-br-md px-4 py-2.5 text-left text-[16px] leading-snug whitespace-pre-line text-[#111111]" style={{ backgroundColor: COULEURS_CHAT.jaune }}>
                {m.texte}
              </button>
            ) : (
              <Bulle key={i} de="moi">
                {m.texte}
              </Bulle>
            ),
          )}
          {reflexion || verification ? (
            <p role="status" className="self-start pl-10 text-[14px] font-semibold text-[var(--chat-texte)]/75">
              {verification ? "Vérification de tes réponses…" : "Réflexion…"}
            </p>
          ) : courante ? (
            <>
              <Bulle de="mobiiz" label="Question de MOBIIZ">
                <TexteMobiiz>{courante.simple.texte}</TexteMobiiz>
              </Bulle>
              <div role="group" aria-label={courante.simple.texte} className="flex flex-wrap gap-2 pl-10">
                {courante.simple.options.map((o) => (
                  <Puce key={`${o.value}:${o.label}`} onClick={() => noter(courante, { value: o.value, label: o.label })}>
                    {o.label}
                    {courante.usual === o.value && courante.simple.options.filter((x) => x.value === o.value).length === 1 ? <span className="pl-1.5 text-[12px] font-bold text-[var(--chat-texte)]/70">par défaut</span> : null}
                  </Puce>
                ))}
                {courante.free && courante.options.length > 0 ? (
                  <Puce
                    onClick={() => {
                      setAutre(true);
                      document.querySelector<HTMLTextAreaElement>("[data-barre-questions] textarea")?.focus();
                    }}
                  >
                    Autre
                  </Puce>
                ) : null}
                {mandatory(courante) ? null : (
                  <Puce discret onClick={() => sansReponse(courante)}>
                    Je ne sais pas
                  </Puce>
                )}
              </div>
            </>
          ) : (
            <>
              <Bulle de="mobiiz" label="Message de MOBIIZ">
                <TexteMobiiz>{pending ? "Je calcule ta liste…" : "J'ai tout ce qu'il me faut. Touche une de tes réponses pour la changer, sinon on y va."}</TexteMobiiz>
              </Bulle>
              <div className="pl-10">
                <Button className="shadow-card!" pending={pending} onClick={calculer}>
                  Calculer ma liste
                </Button>
              </div>
            </>
          )}
        </section>
        <div data-barre-questions>
          <BarreSaisie
            valeur={champ.saisie}
            onChange={champ.setSaisie}
            onEnvoyer={() => void envoyer()}
            occupe={reflexion || pending}
            ecoute={dictee.ecoute}
            probleme={dictee.probleme}
            invite={invite}
            avant={
              courante ? (
                <ReferencesCatalogue
                  question={courante.text}
                  references={references}
                  onChoisir={(r) => {
                    champ.setSaisie("");
                    noter(courante, { value: r, label: r, custom: true });
                  }}
                />
              ) : null
            }
            onDicter={() => {
              champ.avantDictee();
              dictee.demarrer();
            }}
            onArreter={dictee.arreter}
            onAnnulerDictee={() => {
              dictee.annuler();
              champ.rendre();
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ——— Le nom du chantier, renommable d'un tap ———

export function EditableName({ name, onSave, className = "" }: { name: string; onSave: (name: string) => Promise<void>; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(name);
          setEditing(true);
        }}
        aria-label={`Renommer le chantier : ${name}`}
        className={`group inline-flex min-w-0 items-center gap-1.5 text-left ${className}`}
      >
        <span className="truncate">{name}</span>
        <Pencil size={15} aria-hidden="true" className="shrink-0 text-muted" />
      </button>
    );
  }
  return (
    <form
      className="flex min-w-0 grow items-center gap-1.5"
      onSubmit={async (e) => {
        e.preventDefault();
        const v = value.trim();
        if (!v || v === name) return setEditing(false);
        setSaving(true);
        try {
          await onSave(v);
          setEditing(false);
        } finally {
          setSaving(false);
        }
      }}
    >
      <label htmlFor="nom-chantier" className="sr-only">
        Nom du chantier
      </label>
      <input
        id="nom-chantier"
        autoFocus
        value={value}
        maxLength={120}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        className="min-h-11 min-w-0 grow rounded-xl bg-surface px-3 font-display text-[19px] font-extrabold shadow-card outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      <button type="submit" disabled={saving} aria-label="Enregistrer le nom" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-white disabled:opacity-60">
        {saving ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
      </button>
    </form>
  );
}

/** La carte « Lots repérés » ne se montre que pour un devis de plus d'un lot, tant que l'artisan n'a pas dit « C'est bon ». */
export function lotsAConfirmer(takeoff: Takeoff): boolean {
  return (takeoff.lots?.length ?? 0) > 1 && !takeoff.lotsConfirmes;
}

/**
 * §52, LA CARTE « LOTS REPÉRÉS » (directive du fondateur, 2026-10-13) : après la lecture, les lots que l'IA a repérés
 * (« Lots repérés : Électricité · VMC · Sanitaire »), un bouton par lot pour le retirer, « Ajouter un lot », puis
 * « C'est bon ». Un lot retiré rend ses lignes au lot principal : rien ne disparaît de la liste. Il reste toujours un lot.
 */
export function LotsCard({ takeoff, pending, error, onConfirm }: { takeoff: Takeoff; pending: boolean; error: ApiError | null; onConfirm: (metiers: string[]) => void }) {
  const [lots, setLots] = useState(() => (takeoff.lots ?? []).map((l) => ({ metier: l.metier, libelle: l.libelle })));
  const [adding, setAdding] = useState(false);
  const ajoutables = (takeoff.metiersAjoutables ?? []).filter((m) => !lots.some((l) => l.metier === m.metier));
  return (
    <section aria-label="Parties du devis" className="flex flex-col gap-3">
      {error ? <ErrorNotice error={error} /> : null}
      <div className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card">
        <h3 className="font-display text-[17px] font-extrabold tracking-[-0.01em]">Parties du devis : {lots.map((l) => l.libelle).join(" · ")}</h3>
        <p className="text-[14px] leading-snug text-muted">Une liste par partie du devis. Retire une partie en trop, ajoute celle qui manque.</p>
        {(takeoff.lotsNonLus ?? []).map((phrase) => (
          <p key={phrase} role="status" className="rounded-2xl bg-warn-bg px-3 py-2 text-[14px] font-semibold text-warn">
            {phrase}
          </p>
        ))}
        <ul className="flex flex-wrap gap-2">
          {lots.map((l) => (
            <li key={l.metier}>
              <button
                type="button"
                disabled={lots.length < 2 || pending}
                onClick={() => setLots((prev) => prev.filter((x) => x.metier !== l.metier))}
                aria-label={`Retirer la partie ${l.libelle}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-ground px-4 text-[15px] font-bold disabled:opacity-60"
              >
                {l.libelle}
                {lots.length > 1 ? <X size={16} aria-hidden="true" className="text-muted" /> : null}
              </button>
            </li>
          ))}
        </ul>
        {adding ? (
          <div role="group" aria-label="Ajouter une partie" className="flex flex-wrap gap-2">
            {ajoutables.map((m) => (
              <button
                key={m.metier}
                type="button"
                onClick={() => {
                  setLots((prev) => [...prev, m]);
                  setAdding(false);
                }}
                className="inline-flex min-h-11 items-center rounded-2xl bg-surface px-4 text-[15px] font-bold shadow-card"
              >
                {m.libelle}
              </button>
            ))}
          </div>
        ) : ajoutables.length > 0 ? (
          <Button variant="ghost" className="self-start px-0" disabled={pending} onClick={() => setAdding(true)}>
            <Plus size={18} aria-hidden="true" />
            Ajouter une partie
          </Button>
        ) : null}
        <Button variant="secondary" pending={pending} onClick={() => onConfirm(lots.map((l) => l.metier))}>
          <Check size={18} aria-hidden="true" />
          C&apos;est bon
        </Button>
      </div>
    </section>
  );
}

/** L'étape des questions : sans aucune question à poser, le calcul part tout seul (rien à valider pour rien). */
export function QuestionsStep({ takeoff, pending, error, onSubmit, onReponses }: { takeoff: Takeoff; pending: boolean; error: ApiError | null; onSubmit: (answers: CounterAnswers) => void; onReponses?: (reponses: NonNullable<CounterAnswers["reponses"]>) => void }) {
  // Décidé à l'ouverture : une discussion commencée reste ouverte quand ses réponses, enregistrées, ne laissent plus de
  // question (« Calculer ma liste » y est proposé, jamais lancé tout seul).
  const [none] = useState(() => counterQuestions(takeoff).length === 0);
  const started = useRef(false);
  useEffect(() => {
    if (!none || started.current) return;
    started.current = true;
    onSubmit({ reponses: [], ajouts: [], retraits: [] });
  }, [none, onSubmit]);
  if (none) return error ? <ErrorNotice error={error} /> : <CalculScreen />;
  return <QuestionsScreen takeoff={takeoff} pending={pending} error={error} onSubmit={onSubmit} {...(onReponses ? { onReponses } : {})} />;
}
