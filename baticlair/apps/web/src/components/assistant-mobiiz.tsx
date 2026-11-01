"use client";

import { Plus, Sparkles, Undo2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  interpreter,
  LIVRAISON_CHANTIER,
  filALaReouverture,
  messageOuverture,
  questionsAssistant,
  questionsDuDocument,
  reponsesLibres,
  resumeReponses,
  texteQuestionLigne,
  type QuestionLigne,
  resumeConsignes,
  type CleQuestion,
  type QuestionAssistant,
  type Consigne,
  type LigneAssistant,
} from "../../../../packages/domain/src/assistant/assistant";
import { api, ApiError, getActiveCompanyId, type PurchaseItem, type Quantitatif, type Takeoff, type TakeoffLine } from "@/lib/api";
import { useDictee } from "@/lib/dictee";
import { useOrdinateur } from "@/lib/ordinateur";
import { parseQuantity } from "@/lib/labels";
import { fetchWhole } from "./file-viewer";
import { PdfPages } from "./pdf-pages";
import { BarreSaisie, Bulle, COULEURS_CHAT, EnTeteChat, Puce, TexteMobiiz, useChampDicte, useFil, useZoneVisible } from "./chat-mobiiz";
import type { LigneDecrite } from "../../../../packages/domain/src/assistant/assistant";

/**
 * L'ASSISTANT MOBIIZ (Greg, 31 octobre 2026, « Refonte de l'expérience de création des quantitatifs, assistant IA et PDF
 * interactif » ; `docs/assistant-mobiiz.md`). Ordinateur : la conversation à gauche, LE VRAI PDF à droite (le même que
 * reçoit le négoce), mis à jour à chaque changement, chaque ligne se touche pour se modifier. Téléphone : la conversation,
 * « Voir PDF » en plein écran. Tout passe par les corrections existantes de la liste ; l'interprète est du code (aucun
 * appel IA, aucun crédit). Rien ne part sans l'artisan : « Envoyer aux négoces » ouvre l'envoi habituel.
 */

export type Message = { de: "mobiiz" | "moi"; texte: string };
type Retour = { libelle: string; corps: unknown[] };
type Zone = { cle: string; page: number; x: number; y: number; largeur: number; hauteur: number };

const AIDE = "Réponds par écrit, utilise le micro ou passe directement à ta liste.";

function lireStockage(cle: string): string | null {
  try {
    return window.localStorage.getItem(cle);
  } catch {
    return null;
  }
}
function ecrireStockage(cle: string, valeur: string) {
  try {
    window.localStorage.setItem(cle, valeur);
  } catch {
    // Stockage refusé : la préférence vaut pour la page ouverte.
  }
}

/**
 * L'ouverture automatique, une fois par liste (gardé sur l'appareil). Les tests automatiques (navigateur piloté) gardent
 * l'écran de liste, sauf ceux de l'assistant qui l'activent (`mobiiz-assistant-auto` = « oui »).
 */
export function assistantDejaOuvert(projectId: string): boolean {
  if (typeof window === "undefined") return true;
  if (navigator.webdriver && lireStockage("mobiiz-assistant-auto") !== "oui") return true;
  return lireStockage(`mobiiz-assistant-vu:${projectId}`) === "oui";
}
export function marquerAssistantOuvert(projectId: string) {
  ecrireStockage(`mobiiz-assistant-vu:${projectId}`, "oui");
}

/** Une question telle que l'assistant la montre : du document (ligne) ou du chantier. */
type QuestionVue = { id: string; texte: string; choix: { libelle: string; valeur: string }[]; doc?: QuestionLigne; chantier?: QuestionAssistant };

function toutesLesQuestions(t: Takeoff, passees: readonly string[]): QuestionVue[] {
  const doc = questionsDuDocument(t.purchase.toBuy)
    .filter((q) => !passees.includes(q.id))
    .map((q) => ({ id: q.id, texte: texteQuestionLigne(q), choix: q.choix, doc: q }));
  const chantier = questionsAssistant({ adresse: t.chantier?.adresse ?? null, livraison: t.chantier?.livraison ?? null, passees: passees.filter((p): p is CleQuestion => p === "adresse" || p === "livraison" || p === "date") }).map((q) => ({
    id: q.cle,
    texte: q.texte,
    choix: q.choix.map((c) => ({ libelle: c, valeur: c })),
    chantier: q,
  }));
  return [...doc, ...chantier];
}

/** Les lignes que l'assistant peut viser : celles de la liste, dans l'ordre du document. */
function lignesDe(t: Takeoff): LigneAssistant[] {
  return [...t.purchase.toBuy.map((b) => ({ cle: b.key, libelle: b.label })), ...t.purchase.toQuote.map((q) => ({ cle: q.key, libelle: q.label }))];
}

export function AssistantMobiiz({
  takeoff,
  projectId,
  quantitatifId,
  onUpdated,
  onClose,
  onSend,
  historique,
  propositions: propositionsInitiales = [],
}: {
  takeoff: Takeoff;
  projectId: string;
  quantitatifId: string;
  onUpdated: (q: Quantitatif) => void;
  onClose: () => void;
  onSend: () => void;
  /** « Décris ton chantier » : la conversation déjà commencée continue dans le même fil. */
  historique?: Message[];
  /** « Décris ton chantier » : ce qui a été dit sans quantité en chiffres, proposé d'un tap. */
  propositions?: LigneDecrite[];
}) {
  // La liste à jour : le parent la reçoit de chaque correction (`onUpdated`) et la redonne ici.
  const courant = takeoff;
  const cleStockage = `mobiiz-assistant:${projectId}`;
  // Les questions passées (« Passer », « Je ne sais pas ») : jamais reposées, gardées pour ce chantier sur l'appareil.
  const [passees, setPassees] = useState<string[]>(() => {
    try {
      return JSON.parse(lireStockage(cleStockage) ?? "[]") as string[];
    } catch {
      return [];
    }
  });
  const [aide, setAide] = useState(() => lireStockage("mobiiz-assistant-aide") !== "vue");
  // Contrôle de conformité (Greg, 31 octobre 2026) : d'abord les questions DU DOCUMENT, ligne par ligne (ce qui manque au
  // calcul, puis ce que le comptoir demanderait), puis le chantier (adresse, livraison, date).
  const questions = toutesLesQuestions(courant, passees);
  const lignes = useMemo(() => lignesDe(courant), [courant]);
  // Le fil est gardé pour ce chantier (reprendre plus tard) ; à la réouverture, l'état du moment s'ajoute à la suite,
  // seulement s'il dit autre chose que le dernier message de Mobiiz (audit UX, 1er novembre 2026 : il se répétait).
  const cleFil = `mobiiz-assistant-fil:${projectId}`;
  const [messages, setMessages] = useState<Message[]>(() => {
    const ouverture: Message = { de: "mobiiz", texte: messageOuverture(lignesDe(takeoff).length, takeoff.purchase.screen.toCheck, toutesLesQuestions(takeoff, passees)) };
    if (historique) return filALaReouverture(historique, ouverture);
    try {
      const garde = JSON.parse(lireStockage(cleFil) ?? "null") as { messages?: Message[] } | null;
      if (garde?.messages?.length) return filALaReouverture(garde.messages, ouverture);
    } catch {
      // Fil illisible : on repart du début.
    }
    return [ouverture];
  });
  const champDicte = useChampDicte();
  const { saisie, setSaisie } = champDicte;
  const [propositions, setPropositions] = useState<LigneDecrite[]>(propositionsInitiales);
  useEffect(() => {
    ecrireStockage(cleFil, JSON.stringify({ messages: messages.slice(-60) }));
  }, [messages, cleFil]);
  const [occupe, setOccupe] = useState(false);
  const [retours, setRetours] = useState<Retour[]>([]);
  const [version, setVersion] = useState(0);
  const [voirPdf, setVoirPdf] = useState(false);
  const [edition, setEdition] = useState<{ cle: string | null } | null>(null);
  // Un seul aperçu monté : le panneau de droite sur ordinateur, le plein écran sur téléphone.
  const ordinateur = useOrdinateur();
  const { fil, enBas } = useFil([messages, questions.length, propositions.length]);
  const zone = useZoneVisible(enBas);
  const dictee = useDictee(champDicte.surVoix);

  const qid = encodeURIComponent(quantitatifId);
  const corriger = useCallback(
    async (corps: unknown): Promise<Takeoff> => {
      // `{ _reponses }` : une réponse aux questions du moteur (ou son retrait, pour « Annuler ») ; sinon une correction.
      const reponses = (corps as { _reponses?: unknown })._reponses;
      const q = reponses
        ? await api<Quantitatif>(`/v1/quantitatifs/${qid}/reponses?ecran=1`, { method: "POST", body: { reponses } })
        : await api<Quantitatif>(`/v1/quantitatifs/${qid}/corrections?ecran=1`, { method: "POST", body: corps });
      onUpdated(q);
      return q.ecran ?? courant;
    },
    [qid, onUpdated, courant],
  );

  const passer = useCallback(
    (cle: string) => {
      const suivantes = Array.from(new Set([...passees, cle]));
      setPassees(suivantes);
      ecrireStockage(cleStockage, JSON.stringify(suivantes));
    },
    [passees, cleStockage],
  );

  /** Une consigne appliquée, et ce qu'il faut pour l'annuler ; null si rien n'a changé. */
  const appliquer = useCallback(
    async (c: Consigne, t: Takeoff): Promise<{ t: Takeoff; retour: Retour | null }> => {
      const item = (cle: string) => t.purchase.toBuy.find((b) => b.key === cle);
      const lignesDuDevis = (ids: string[]) => ids.map((id) => t.lines.find((l) => l.id === id)).filter((l): l is TakeoffLine => !!l);
      switch (c.type) {
        case "ajouter": {
          const avant = new Set(t.lines.map((l) => l.id));
          const apres = await corriger({ action: "ajouter", ligne: { libelle: c.libelle, quantite: c.quantite, unite: c.unite } });
          const neuve = apres.lines.find((l) => !avant.has(l.id));
          return { t: apres, retour: neuve ? { libelle: `l'ajout de « ${c.libelle} »`, corps: [{ action: "retirer", id: neuve.id }] } : null };
        }
        case "retirer": {
          const it = item(c.cle);
          const devis = it && it.kind === "computed" && !c.cle.startsWith("line:") ? [] : lignesDuDevis(it?.lineIds ?? t.purchase.toQuote.find((q) => q.key === c.cle)?.lineIds ?? []);
          if (devis.length === 0 && it) {
            const apres = await corriger({ action: "retirer_article", id: c.cle });
            return { t: apres, retour: { libelle: `le retrait de « ${c.libelle} »`, corps: [{ action: "remettre_article", id: c.cle }] } };
          }
          let apres = t;
          for (const l of devis) apres = await corriger({ action: "retirer", id: l.id });
          return { t: apres, retour: { libelle: `le retrait de « ${c.libelle} »`, corps: devis.map((l) => ({ action: "ajouter", ligne: { libelle: l.designation, quantite: l.quantity, unite: l.unit, reference: l.reference } })) } };
        }
        case "quantite": {
          const it = item(c.cle);
          if (!it) return { t, retour: null };
          const avant = it.quantity ? parseQuantity(it.quantity) : null;
          const direct = it.kind === "direct" ? lignesDuDevis(it.lineIds)[0] : undefined;
          if (direct) {
            const apres = await corriger({ action: "modifier_ligne", id: direct.id, ligne: { libelle: direct.designation, quantite: c.quantite, unite: c.unite ?? direct.unit, reference: direct.reference } });
            return { t: apres, retour: { libelle: `la quantité de « ${c.libelle} »`, corps: [{ action: "modifier_ligne", id: direct.id, ligne: { libelle: direct.designation, quantite: direct.quantity, unite: direct.unit, reference: direct.reference } }] } };
          }
          const unite = c.unite ?? avant?.unit ?? "pièces";
          const apres = await corriger({ action: "fixer_quantite", id: c.cle, quantite: c.quantite.replace(/\s/g, ""), unite });
          return { t: apres, retour: avant ? { libelle: `la quantité de « ${c.libelle} »`, corps: [{ action: "fixer_quantite", id: c.cle, quantite: avant.quantity.replace(/\s/g, ""), unite: avant.unit }] } : null };
        }
        case "adresse":
        case "livraison":
        case "date": {
          const champ = c.type === "adresse" ? "adresse" : "livraison";
          const texte = c.type === "date" ? `${LIVRAISON_CHANTIER}, ${c.texte}` : c.texte;
          const avant = (t.chantier ?? { adresse: null, livraison: null })[champ] ?? "";
          const apres = await corriger({ action: "chantier", champ, texte });
          return { t: apres, retour: { libelle: champ === "adresse" ? "l'adresse" : "la livraison", corps: [{ action: "chantier", champ, texte: avant }] } };
        }
        default:
          return { t, retour: null };
      }
    },
    [corriger],
  );

  /** Une réponse à une question du document : au moteur (clé, unité), ou écrite dans la désignation de la ligne. */
  const repondreDoc = useCallback(
    async (q: QuestionLigne, valeur: string, t: Takeoff): Promise<{ t: Takeoff; retour: Retour | null }> => {
      if (q.sorte.type === "reponse") {
        const apres = await corriger({ _reponses: [{ question: q.sorte.cle, valeur, ...(q.sorte.unite ? { unite: q.sorte.unite } : {}) }] });
        return { t: apres, retour: { libelle: `la réponse « ${valeur} »`, corps: [{ _reponses: [{ question: q.sorte.cle, valeur: null }] }] } };
      }
      const dit = q.sorte.cle === "developpe" && /^\d+$/.test(valeur) ? `dév. ${valeur}` : valeur;
      let apres = t;
      const inverse: unknown[] = [];
      for (const key of q.itemKeys) {
        const it = apres.purchase.toBuy.find((b) => b.key === key) ?? t.purchase.toBuy.find((b) => b.key === key);
        if (!it) continue;
        const direct = it.kind === "direct" ? apres.lines.find((l) => it.lineIds.includes(l.id)) : undefined;
        if (direct) {
          apres = await corriger({ action: "modifier_ligne", id: direct.id, ligne: { libelle: `${direct.designation.trim()} ${dit}`, quantite: direct.quantity, unite: direct.unit, reference: direct.reference } });
          inverse.push({ action: "modifier_ligne", id: direct.id, ligne: { libelle: direct.designation, quantite: direct.quantity, unite: direct.unit, reference: direct.reference } });
        } else {
          apres = await corriger({ action: "renommer", id: it.key, libelle: `${it.label.trim()} ${dit}` });
          inverse.push({ action: "renommer", id: it.key, libelle: it.label });
        }
      }
      return { t: apres, retour: inverse.length ? { libelle: `« ${dit} » sur ${q.lignes[0]}`, corps: inverse } : null };
    },
    [corriger],
  );

  const annuler = useCallback(async () => {
    const dernier = retours.at(-1);
    if (!dernier) return;
    setOccupe(true);
    try {
      for (const corps of dernier.corps) await corriger(corps);
      setRetours((r) => r.slice(0, -1));
      setMessages((m) => [...m, { de: "mobiiz", texte: `J'ai annulé ${dernier.libelle}.` }]);
      setVersion((v) => v + 1);
    } catch {
      setMessages((m) => [...m, { de: "mobiiz", texte: "Je n'ai pas pu annuler. Réessaie dans un instant." }]);
    } finally {
      setOccupe(false);
    }
  }, [retours, corriger]);

  /** Après chaque échange : la question suivante vient dans sa bulle ; plus rien : « tout est bon ». */
  const suite = (t: Takeoff, passeesApres: string[]) => {
    const reste = toutesLesQuestions(t, passeesApres);
    return reste.length > 0 ? "" : " C'est tout bon de mon côté : relis le PDF, puis envoie-le à tes négoces.";
  };

  /** Une proposition de « Décris ton chantier » ajoutée d'un tap (sa quantité seulement si elle a été dite). */
  const ajouterProposition = useCallback(
    async (p: LigneDecrite) => {
      setOccupe(true);
      try {
        const avant = new Set(courant.lines.map((l) => l.id));
        const apres = await corriger({ action: "ajouter", ligne: { libelle: p.libelle, quantite: p.quantite, unite: p.unite } });
        const neuve = apres.lines.find((l) => !avant.has(l.id));
        if (neuve) setRetours((r) => [...r, { libelle: `l'ajout de « ${p.libelle} »`, corps: [{ action: "retirer", id: neuve.id }] }]);
        setPropositions((x) => x.filter((y) => y !== p));
        setMessages((m) => [...m, { de: "mobiiz", texte: `C'est fait : ajouté « ${p.libelle} »${p.quantite ? `, ${p.quantite}${p.unite ? ` ${p.unite}` : ""}` : " (quantité à préciser)"}.` }]);
        setVersion((v) => v + 1);
      } catch {
        setMessages((m) => [...m, { de: "mobiiz", texte: "Ça n'est pas passé. Réessaie dans un instant." }]);
      } finally {
        setOccupe(false);
      }
    },
    [courant, corriger],
  );

  /** Un choix touché sur une carte de question du document. */
  const choisir = useCallback(
    async (q: QuestionLigne, valeur: string, libelle: string) => {
      if (occupe) return;
      setMessages((m) => [...m, { de: "moi", texte: libelle }]);
      setOccupe(true);
      try {
        const r = await repondreDoc(q, valeur, courant);
        if (r.retour) setRetours((x) => [...x, r.retour!]);
        setMessages((m) => [...m, { de: "mobiiz", texte: `C'est noté : ${resumeReponses([{ question: q, libelle }])}.${suite(r.t, passees)}` }]);
      } catch (e) {
        setMessages((m) => [...m, { de: "mobiiz", texte: e instanceof ApiError && e.message ? `Ça n'est pas passé : ${e.message}` : "Ça n'est pas passé. Réessaie dans un instant." }]);
      } finally {
        setOccupe(false);
        setVersion((v) => v + 1);
      }
    },
     
    [occupe, repondreDoc, courant, passees],
  );

  const envoyer = useCallback(
    async (texte: string) => {
      const propre = texte.trim();
      if (!propre || occupe) return;
      dictee.arreter();
      setSaisie("");
      setMessages((m) => [...m, { de: "moi", texte: propre }]);
      const premiere = questions[0] ?? null;
      const docOuvertes = questions.flatMap((q) => (q.doc ? [q.doc] : []));
      // 1. Les réponses aux questions du document (« Espagne, 1er choix, crochets inox »), plusieurs d'un coup.
      const libres = reponsesLibres(propre, docOuvertes);
      let resteTexte = libres.reste.join(", ");
      // Un nombre seul répond à la première question chiffrée en cours (« 45 » pour la pente).
      if (libres.reponses.length === 0 && premiere?.doc?.sorte.type === "reponse" && /^\d+(?:[.,]\d+)?\s*\S{0,6}$/.test(propre) && premiere.doc.sorte.unite) {
        libres.reponses.push({ question: premiere.doc, valeur: propre.match(/\d+(?:[.,]\d+)?/)![0].replace(",", "."), libelle: propre });
        resteTexte = "";
      }
      // 2. Le reste : les consignes (ajouter, retirer, quantité, adresse, livraison, passer, annuler…).
      const attendu = premiere?.chantier?.cle ?? null;
      const consignes = resteTexte ? interpreter(resteTexte, lignes, attendu) : [];
      if (libres.reponses.length === 0 && consignes.some((c) => c.type === "annuler")) {
        await annuler();
        return;
      }
      setOccupe(true);
      let t = courant;
      const repondues: { question: QuestionLigne; libelle: string }[] = [];
      const ratees: string[] = [];
      const faites: Consigne[] = [];
      const nouveaux: Retour[] = [];
      let probleme = false;
      let passeesApres = passees;
      for (const r of libres.reponses) {
        try {
          const x = await repondreDoc(r.question, r.valeur, t);
          t = x.t;
          if (x.retour) nouveaux.push(x.retour);
          repondues.push(r);
        } catch (e) {
          probleme = true;
          ratees.push(`« ${r.libelle} » n'est pas passé${e instanceof ApiError && e.message ? ` (${e.message})` : ""}`);
        }
      }
      for (const c of consignes) {
        if (c.type === "passer" || c.type === "ne_sait_pas") {
          if (premiere) {
            passeesApres = Array.from(new Set([...passeesApres, premiere.id]));
            passer(premiere.id);
          }
          continue;
        }
        try {
          const r = await appliquer(c, t);
          t = r.t;
          if (r.retour) nouveaux.push(r.retour);
          faites.push(c);
        } catch (e) {
          probleme = true;
          faites.push({ type: "incompris", texte: e instanceof ApiError && e.message ? `${"libelle" in c ? c.libelle : propre} (${e.message})` : "libelle" in c ? c.libelle : propre });
        }
      }
      setRetours((r) => [...r, ...nouveaux]);
      setOccupe(false);
      setVersion((v) => v + 1);
      const passe = libres.reponses.length === 0 && consignes.length > 0 && consignes.every((c) => c.type === "passer" || c.type === "ne_sait_pas");
      const phrases = [repondues.length ? `C'est noté : ${resumeReponses(repondues)}.` : "", ratees.length ? `${ratees.join(", ")}.` : "", faites.length ? resumeConsignes(faites) : ""].filter(Boolean).join(" ");
      setMessages((m) => [...m, { de: "mobiiz", texte: `${passe ? "Pas de souci, on passe." : phrases || "C'est noté."}${probleme ? "" : suite(t, passeesApres)}` }]);
    },
     
    [occupe, dictee, questions, lignes, annuler, courant, passer, appliquer, repondreDoc, passees, setSaisie],
  );

  const active = questions[0] ?? null;
  const pdf = <ApercuPdf projectId={projectId} version={version} onLigne={(cle) => setEdition({ cle })} onAjouter={() => setEdition({ cle: null })} />;

  return (
    <div
      ref={zone}
      role="dialog"
      aria-modal="true"
      aria-label="Assistant Mobiiz"
      className="fixed top-0 left-0 z-50 flex h-[100dvh] w-full flex-col text-[#FBF8F3]"
      style={{ backgroundColor: COULEURS_CHAT.fond }}
    >
      <EnTeteChat onFermer={onClose} onVoirPdf={ordinateur ? undefined : () => setVoirPdf(true)} />
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section aria-label="Conversation" className="flex min-h-0 flex-col">
          <div ref={fil} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 py-4 lg:px-6">
            {aide ? (
              <div role="note" className="flex items-center gap-2 self-center rounded-full px-3 py-1 text-[13px] text-[#FBF8F3]/70" style={{ backgroundColor: "rgba(251,248,243,0.06)" }}>
                <span>{AIDE}</span>
                <button
                  type="button"
                  onClick={() => {
                    setAide(false);
                    ecrireStockage("mobiiz-assistant-aide", "vue");
                  }}
                  className="min-h-11 shrink-0 rounded-full px-3 font-semibold text-[#FED206]"
                >
                  Compris
                </button>
              </div>
            ) : null}
            {messages.map((m, i) =>
              m.de === "moi" ? (
                <Bulle key={i} de="moi">
                  {m.texte}
                </Bulle>
              ) : (
                <Bulle key={i} de="mobiiz">
                  <TexteMobiiz>{m.texte}</TexteMobiiz>
                </Bulle>
              ),
            )}
            {propositions.length > 0 ? (
              <Bulle de="mobiiz" label="Sans quantité en chiffres">
                <TexteMobiiz>Sans quantité en chiffres, je n&apos;ai rien compté pour : {propositions.map((p) => p.libelle).join(", ")}. Je les ajoute ?</TexteMobiiz>
                <div className="flex flex-wrap gap-2">
                  {propositions.map((p) => (
                    <Puce key={p.libelle} disabled={occupe} onClick={() => void ajouterProposition(p)}>
                      Ajouter « {p.libelle} »
                    </Puce>
                  ))}
                  <Puce discret onClick={() => setPropositions([])}>
                    Non merci
                  </Puce>
                </div>
              </Bulle>
            ) : null}
            {/* La question active, dans sa bulle : ses réponses d'un tap et « Passer », petit, à côté. */}
            {active ? (
              <Bulle de="mobiiz" label={active.texte}>
                <TexteMobiiz>{active.texte}</TexteMobiiz>
                <div className="flex flex-wrap items-center gap-2">
                  {active.choix.map((c) => (
                    <Puce key={c.valeur} disabled={occupe} onClick={() => void (active.doc ? choisir(active.doc, c.valeur, c.libelle) : envoyer(c.libelle))}>
                      {c.libelle}
                    </Puce>
                  ))}
                  <Puce discret onClick={() => passer(active.id)}>
                    Passer
                  </Puce>
                </div>
              </Bulle>
            ) : (
              <div className="flex flex-wrap gap-2 pl-10">
                <Puce
                  onClick={() => {
                    onClose();
                    onSend();
                  }}
                >
                  Envoyer aux négoces
                </Puce>
                <Puce discret onClick={onClose}>
                  Voir ma liste
                </Puce>
              </div>
            )}
            {occupe ? <p className="pl-10 text-[14px] text-[#FBF8F3]/60">Je mets ta liste à jour…</p> : null}
          </div>
          <BarreSaisie
            valeur={saisie}
            onChange={setSaisie}
            onEnvoyer={() => void envoyer(saisie)}
            occupe={occupe}
            ecoute={dictee.ecoute}
            probleme={dictee.probleme}
            onDicter={() => {
              champDicte.avantDictee();
              dictee.demarrer();
            }}
            onArreter={dictee.arreter}
            onAnnulerDictee={() => {
              dictee.annuler();
              champDicte.rendre();
            }}
            avant={
              retours.length > 0 ? (
                <div className="flex pb-2">
                  <button type="button" disabled={occupe} onClick={() => void annuler()} className="pressable flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold text-[#FBF8F3]/75" style={{ backgroundColor: "rgba(251,248,243,0.06)" }}>
                    <Undo2 size={14} aria-hidden="true" />
                    Annuler la dernière modification
                  </button>
                </div>
              ) : null
            }
          />
        </section>
        {ordinateur ? (
          <section aria-label="Aperçu du PDF" className="flex min-h-0 flex-col border-l bg-[#1A1918]" style={{ borderColor: COULEURS_CHAT.trait }}>
            {pdf}
          </section>
        ) : null}
      </div>
      {/* « Voir PDF » : par-dessus la conversation, qui reste montée (messages, brouillon, position gardés). */}
      {voirPdf && !ordinateur ? (
        <div role="dialog" aria-modal="true" aria-label="Le PDF de ta demande" className="absolute inset-x-0 top-0 z-10 flex h-full w-full flex-col bg-[#111111]">
          <div className="flex items-center justify-between gap-3 px-4 pt-[max(env(safe-area-inset-top),8px)] pb-2 text-white">
            <span className="text-[16px] font-bold">Ta demande de prix</span>
            <button type="button" onClick={() => setVoirPdf(false)} className="pressable flex min-h-11 items-center gap-1.5 rounded-full bg-white/10 px-4 text-[14px] font-semibold text-white">
              <X size={16} aria-hidden="true" />
              Retour à l&apos;assistant
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">{pdf}</div>
        </div>
      ) : null}
      {edition ? (
        <FeuilleLigne
          takeoff={courant}
          cle={edition.cle}
          onClose={() => setEdition(null)}
          onDone={(texte, retour) => {
            setEdition(null);
            if (retour) setRetours((r) => [...r, retour]);
            setVersion((v) => v + 1);
            setMessages((m) => [...m, { de: "mobiiz", texte }]);
          }}
          corriger={corriger}
        />
      ) : null}
    </div>
  );
}

/** Le vrai PDF de l'aperçu (le même générateur que l'envoi), rechargé après chaque changement, ses lignes à toucher. */
function ApercuPdf({ projectId, version, onLigne, onAjouter }: { projectId: string; version: number; onLigne: (cle: string) => void; onAjouter: () => void }) {
  const [fichier, setFichier] = useState<Blob | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [erreur, setErreur] = useState(false);
  useEffect(() => {
    let annule = false;
    const minuteur = setTimeout(() => {
      const headers: Record<string, string> = {};
      const companyId = getActiveCompanyId();
      if (companyId) headers["x-company-id"] = companyId;
      const id = encodeURIComponent(projectId);
      Promise.all([fetchWhole(`/v1/projects/${id}/demande-de-devis.pdf?apercu=1`, headers), api<{ zones: Zone[] }>(`/v1/projects/${id}/demande-de-devis.zones`)]).then(
        ([f, z]) => {
          if (annule) return;
          setFichier(f);
          setZones(z.zones);
          setErreur(false);
        },
        () => {
          if (!annule) setErreur(true);
        },
      );
    }, 250);
    return () => {
      annule = true;
      clearTimeout(minuteur);
    };
  }, [projectId, version]);
  const surErreur = useCallback(() => setErreur(true), []);

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 lg:px-6">
        {/* Le panneau de l'aperçu est toujours sombre (#1A1918), quel que soit le thème : texte ivoire (audit UX, contraste 2,05:1). */}
        <span className="text-[13px] font-semibold text-[#FBF8F3]/75">Touche une ligne pour la modifier.</span>
        <button type="button" onClick={onAjouter} className="pressable flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-line px-3.5 text-[14px] font-semibold whitespace-nowrap max-lg:border-white/30 max-lg:text-white">
          <Plus size={16} aria-hidden="true" />
          Ajouter une ligne
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {erreur ? (
          <p className="p-6 text-[15px] text-muted max-lg:text-white">Le PDF ne s&apos;affiche pas pour l&apos;instant. Ta liste, elle, est à jour.</p>
        ) : fichier ? (
          <PdfPages
            file={fichier}
            title="Aperçu de la demande de prix"
            onError={surErreur}
            largeur
            overlay={(page, echelle, hauteur) =>
              zones
                .filter((z) => z.page === page)
                .map((z) => (
                  <button
                    key={z.cle}
                    type="button"
                    aria-label={`Modifier la ligne ${z.cle}`}
                    data-cle={z.cle}
                    onClick={() => onLigne(z.cle)}
                    className="absolute rounded-md outline-offset-0 transition-[background-color] duration-150 hover:bg-[rgba(254,210,6,0.18)] focus-visible:bg-[rgba(254,210,6,0.18)] active:bg-[rgba(254,210,6,0.28)]"
                    style={{ left: z.x * echelle, top: (hauteur - z.y - z.hauteur) * echelle, width: z.largeur * echelle, height: z.hauteur * echelle }}
                  />
                ))
            }
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="size-8 animate-spin rounded-full border-4 border-line border-t-ink" aria-label="Chargement du PDF" />
          </div>
        )}
      </div>
    </>
  );
}

/** « Modifier la ligne » (maquette) : désignation, caractéristiques, quantité, unité ; retirer ; ou une ligne neuve. */
function FeuilleLigne({
  takeoff,
  cle,
  onClose,
  onDone,
  corriger,
}: {
  takeoff: Takeoff;
  cle: string | null;
  onClose: () => void;
  onDone: (texte: string, retour: Retour | null) => void;
  corriger: (corps: unknown) => Promise<Takeoff>;
}) {
  const item: PurchaseItem | undefined = cle ? takeoff.purchase.toBuy.find((b) => b.key === cle) : undefined;
  const quote = cle && !item ? takeoff.purchase.toQuote.find((q) => q.key === cle) : undefined;
  const direct = item?.kind === "direct" ? takeoff.lines.find((l) => item.lineIds.includes(l.id)) : undefined;
  const q0 = item?.quantity ? parseQuantity(item.quantity) : null;
  const [libelle, setLibelle] = useState(item?.label ?? quote?.label ?? "");
  const [precision, setPrecision] = useState(item?.precision ?? "");
  const [quantite, setQuantite] = useState(direct?.quantity ?? q0?.quantity ?? "");
  const [unite, setUnite] = useState(direct?.unit ?? q0?.unit ?? "");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const titre = cle ? "Modifier la ligne" : "Ajouter une ligne";

  async function enregistrer() {
    if (!libelle.trim()) return;
    setOccupe(true);
    setErreur(null);
    try {
      if (!cle) {
        const avant = new Set(takeoff.lines.map((l) => l.id));
        const apres = await corriger({ action: "ajouter", ligne: { libelle: libelle.trim(), quantite: quantite.trim() || null, unite: unite.trim() || null } });
        const neuve = apres.lines.find((l) => !avant.has(l.id));
        onDone(`C'est fait : ajouté « ${libelle.trim()} ».`, neuve ? { libelle: `l'ajout de « ${libelle.trim()} »`, corps: [{ action: "retirer", id: neuve.id }] } : null);
        return;
      }
      const corps: unknown[] = [];
      const inverse: unknown[] = [];
      if (direct) {
        corps.push({ action: "modifier_ligne", id: direct.id, ligne: { libelle: libelle.trim(), quantite: quantite.trim() || null, unite: unite.trim() || null, reference: direct.reference } });
        inverse.push({ action: "modifier_ligne", id: direct.id, ligne: { libelle: direct.designation, quantite: direct.quantity, unite: direct.unit, reference: direct.reference } });
      } else if (item) {
        if (libelle.trim() !== item.label) {
          corps.push({ action: "renommer", id: item.key, libelle: libelle.trim() });
          inverse.push({ action: "renommer", id: item.key, libelle: item.label });
        }
        if (quantite.trim() && unite.trim() && (quantite.trim() !== q0?.quantity || unite.trim() !== q0?.unit)) {
          corps.push({ action: "fixer_quantite", id: item.key, quantite: quantite.replace(/\s/g, ""), unite: unite.trim() });
          if (q0) inverse.push({ action: "fixer_quantite", id: item.key, quantite: q0.quantity.replace(/\s/g, ""), unite: q0.unit });
        }
      }
      if (item && precision.trim() !== (item.precision ?? "")) {
        corps.push({ action: "preciser", id: item.key, precision: precision.trim() });
        inverse.push({ action: "preciser", id: item.key, precision: item.precision ?? "" });
      }
      for (const c of corps) await corriger(c);
      onDone(corps.length ? `C'est fait : « ${libelle.trim()} » est à jour.` : "Rien n'a changé.", corps.length ? { libelle: `la modification de « ${libelle.trim()} »`, corps: inverse.reverse() } : null);
    } catch (e) {
      setErreur(e instanceof ApiError && e.message ? e.message : "La modification n'est pas passée. Réessaie.");
    } finally {
      setOccupe(false);
    }
  }

  async function retirer() {
    if (!cle) return;
    setOccupe(true);
    try {
      const lignes = (item?.kind === "direct" || !item ? (item?.lineIds ?? quote?.lineIds ?? []) : []).map((id) => takeoff.lines.find((l) => l.id === id)).filter((l): l is TakeoffLine => !!l);
      if (item && lignes.length === 0) {
        await corriger({ action: "retirer_article", id: cle });
        onDone(`C'est fait : retiré « ${libelle} ».`, { libelle: `le retrait de « ${libelle} »`, corps: [{ action: "remettre_article", id: cle }] });
        return;
      }
      for (const l of lignes) await corriger({ action: "retirer", id: l.id });
      onDone(`C'est fait : retiré « ${libelle} ».`, { libelle: `le retrait de « ${libelle} »`, corps: lignes.map((l) => ({ action: "ajouter", ligne: { libelle: l.designation, quantite: l.quantity, unite: l.unit, reference: l.reference } })) });
    } catch {
      setErreur("Le retrait n'est pas passé. Réessaie.");
      setOccupe(false);
    }
  }

  const champ = "min-h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[16px] text-ink outline-none focus:border-ink";
  return (
    <div className="fixed top-0 left-0 z-[60] flex h-[100dvh] w-full items-end justify-center bg-black/40 lg:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={titre} onClick={(e) => e.stopPropagation()} className="flex w-full max-w-lg flex-col gap-3 rounded-t-3xl bg-surface p-5 pb-[max(env(safe-area-inset-bottom),20px)] text-ink shadow-card lg:rounded-3xl">
        <div className="flex items-center justify-between">
          <h3 className="text-[18px] font-extrabold">{titre}</h3>
          <button type="button" onClick={onClose} aria-label="Fermer" className="flex size-10 items-center justify-center rounded-full">
            <X size={19} aria-hidden="true" />
          </button>
        </div>
        <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
          Désignation
          <input className={champ} value={libelle} onChange={(e) => setLibelle(e.target.value)} />
        </label>
        {cle && item ? (
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
            Caractéristiques
            <input className={champ} value={precision} onChange={(e) => setPrecision(e.target.value)} placeholder="Teinte, dimensions, finition…" />
          </label>
        ) : null}
        {quote ? null : (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
              Quantité
              <input className={champ} inputMode="decimal" value={quantite} onChange={(e) => setQuantite(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-muted">
              Unité
              <input className={champ} value={unite} onChange={(e) => setUnite(e.target.value)} placeholder="pièces, m, m²…" />
            </label>
          </div>
        )}
        {erreur ? (
          <p role="alert" className="text-[14px] font-semibold text-danger">
            {erreur}
          </p>
        ) : null}
        <div className="flex items-center gap-2 pt-1">
          {cle ? (
            <button type="button" disabled={occupe} onClick={() => void retirer()} className="min-h-12 rounded-full px-4 text-[15px] font-semibold text-danger">
              Retirer cette ligne
            </button>
          ) : null}
          <span className="flex-1" />
          <button type="button" disabled={occupe || !libelle.trim()} onClick={() => void enregistrer()} className="pressable min-h-12 rounded-full bg-ink px-6 text-[15px] font-bold text-white disabled:opacity-50">
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}


/**
 * L'entrée de l'assistant sur « Ton chantier » (avant l'envoi) : UNE ligne, pour que « Envoyer une partie » reste visible
 * sans descendre sur téléphone (§48.5).
 */
export function CarteAssistant({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="pressable flex min-h-12 items-center gap-3 rounded-2xl bg-surface px-3 py-2 text-left shadow-card">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent" aria-hidden="true">
        <Sparkles size={16} />
      </span>
      <span className="flex-1 text-[15px] font-semibold text-ink">
        Ouvrir l&apos;assistant
        <span className="font-normal text-muted max-sm:hidden"> · écris ou dicte, le PDF suit</span>
      </span>
    </button>
  );
}
