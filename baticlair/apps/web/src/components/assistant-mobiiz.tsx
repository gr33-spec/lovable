"use client";

import { ArrowUp, Eye, Mic, Plus, Sparkles, Undo2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  interpreter,
  LIVRAISON_CHANTIER,
  messageOuverture,
  questionsAssistant,
  resumeConsignes,
  type CleQuestion,
  type Consigne,
  type LigneAssistant,
} from "../../../../packages/domain/src/assistant/assistant";
import { api, ApiError, getActiveCompanyId, type PurchaseItem, type Quantitatif, type Takeoff, type TakeoffLine } from "@/lib/api";
import { useDictee } from "@/lib/dictee";
import { useOrdinateur } from "@/lib/ordinateur";
import { parseQuantity } from "@/lib/labels";
import { fetchWhole } from "./file-viewer";
import { PdfPages } from "./pdf-pages";

/**
 * L'ASSISTANT MOBIIZ (Greg, 31 octobre 2026, « Refonte de l'expérience de création des quantitatifs, assistant IA et PDF
 * interactif » ; `docs/assistant-mobiiz.md`). Ordinateur : la conversation à gauche, LE VRAI PDF à droite (le même que
 * reçoit le négoce), mis à jour à chaque changement, chaque ligne se touche pour se modifier. Téléphone : la conversation,
 * « Voir PDF » en plein écran. Tout passe par les corrections existantes de la liste ; l'interprète est du code (aucun
 * appel IA, aucun crédit). Rien ne part sans l'artisan : « Envoyer aux négoces » ouvre l'envoi habituel.
 */

type Message = { de: "mobiiz" | "moi"; texte: string };
type Retour = { libelle: string; corps: unknown[] };
type Zone = { cle: string; page: number; x: number; y: number; largeur: number; hauteur: number };

const AIDE = "Réponds par écrit, utilise le micro ou passe directement à ta liste.";
const ETAPES = ["Liste des matériaux", "Détails chantier", "Négoces", "Validation"] as const;

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
}: {
  takeoff: Takeoff;
  projectId: string;
  quantitatifId: string;
  onUpdated: (q: Quantitatif) => void;
  onClose: () => void;
  onSend: () => void;
}) {
  // La liste à jour : le parent la reçoit de chaque correction (`onUpdated`) et la redonne ici.
  const courant = takeoff;
  const cleStockage = `mobiiz-assistant:${projectId}`;
  const [passees, setPassees] = useState<CleQuestion[]>(() => {
    try {
      return JSON.parse(lireStockage(cleStockage) ?? "[]") as CleQuestion[];
    } catch {
      return [];
    }
  });
  const [aide, setAide] = useState(() => lireStockage("mobiiz-assistant-aide") !== "vue");
  const chantier = courant.chantier ?? { adresse: null, livraison: null };
  const questions = questionsAssistant({ adresse: chantier.adresse, livraison: chantier.livraison, passees });
  const lignes = useMemo(() => lignesDe(courant), [courant]);
  const [messages, setMessages] = useState<Message[]>(() => [{ de: "mobiiz", texte: messageOuverture(lignesDe(takeoff).length, takeoff.purchase.screen.toCheck, questions) }]);
  const [saisie, setSaisie] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [retours, setRetours] = useState<Retour[]>([]);
  const [version, setVersion] = useState(0);
  const [voirPdf, setVoirPdf] = useState(false);
  const [edition, setEdition] = useState<{ cle: string | null } | null>(null);
  const fil = useRef<HTMLDivElement>(null);
  // Un seul aperçu monté : le panneau de droite sur ordinateur, le plein écran sur téléphone.
  const ordinateur = useOrdinateur();
  const base = useRef("");

  // Page derrière figée (écrans plein écran, CLAUDE.md).
  useEffect(() => {
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = avant;
    };
  }, []);
  useEffect(() => {
    fil.current?.scrollTo({ top: fil.current.scrollHeight });
  }, [messages, questions.length]);

  const dictee = useDictee(
    useCallback((texte: string) => {
      setSaisie(`${base.current}${base.current && texte ? " " : ""}${texte}`.trimStart());
    }, []),
  );

  const qid = encodeURIComponent(quantitatifId);
  const corriger = useCallback(
    async (corps: unknown): Promise<Takeoff> => {
      const q = await api<Quantitatif>(`/v1/quantitatifs/${qid}/corrections?ecran=1`, { method: "POST", body: corps });
      onUpdated(q);
      return q.ecran ?? courant;
    },
    [qid, onUpdated, courant],
  );

  const passer = useCallback(
    (cle: CleQuestion) => {
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

  const envoyer = useCallback(
    async (texte: string) => {
      const propre = texte.trim();
      if (!propre || occupe) return;
      dictee.arreter();
      setSaisie("");
      base.current = "";
      setMessages((m) => [...m, { de: "moi", texte: propre }]);
      const attendu = questions[0]?.cle ?? null;
      const consignes = interpreter(propre, lignes, attendu);
      if (consignes.some((c) => c.type === "annuler")) {
        await annuler();
        return;
      }
      setOccupe(true);
      let t = courant;
      const faites: Consigne[] = [];
      const nouveaux: Retour[] = [];
      let probleme = false;
      for (const c of consignes) {
        if (c.type === "passer" || c.type === "ne_sait_pas") {
          if (attendu) passer(attendu);
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
      const passe = consignes.every((c) => c.type === "passer" || c.type === "ne_sait_pas");
      const reste = questionsAssistant({ adresse: t.chantier?.adresse ?? null, livraison: t.chantier?.livraison ?? null, passees: attendu && passe ? [...passees, attendu] : passees });
      const suite = reste.length > 0 ? ` ${reste[0]!.texte}` : " C'est tout bon de mon côté : relis le PDF, puis envoie-le à tes négoces.";
      setMessages((m) => [...m, { de: "mobiiz", texte: `${passe ? "Pas de souci, on passe." : resumeConsignes(faites)}${probleme ? "" : suite}` }]);
    },
    [occupe, dictee, questions, lignes, annuler, courant, passer, appliquer, passees],
  );

  const etape = questions.length > 0 ? 1 : 3;

  const pdf = <ApercuPdf projectId={projectId} version={version} onLigne={(cle) => setEdition({ cle })} onAjouter={() => setEdition({ cle: null })} />;

  return (
    <div role="dialog" aria-modal="true" aria-label="Assistant Mobiiz" className="fixed top-0 left-0 z-50 flex h-[100dvh] w-full flex-col bg-ground text-ink">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3 lg:px-8">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent" aria-hidden="true">
          <Sparkles size={18} />
        </span>
        <h2 className="text-[16px] font-extrabold whitespace-nowrap lg:text-[17px]">Assistant Mobiiz</h2>
        <ol aria-label="Étapes" className="ml-6 hidden items-center gap-2 lg:flex">
          {ETAPES.map((e, i) => (
            <li key={e} aria-current={i === etape ? "step" : undefined} className={`rounded-full px-3 py-1 text-[13px] font-semibold ${i === etape ? "bg-accent text-on-accent" : i < etape ? "text-ink" : "text-muted"}`}>
              {i + 1}. {e}
            </li>
          ))}
        </ol>
        <span className="flex-1" />
        <button type="button" onClick={() => setVoirPdf(true)} className="pressable flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-line px-3 text-[14px] font-semibold whitespace-nowrap lg:hidden">
          <Eye size={17} aria-hidden="true" />
          Voir PDF
        </button>
        <button type="button" onClick={onClose} aria-label="Fermer l'assistant" className="pressable flex size-11 items-center justify-center rounded-full border border-line">
          <X size={19} aria-hidden="true" />
        </button>
      </header>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section aria-label="Conversation" className="flex min-h-0 flex-col">
          <div ref={fil} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 lg:px-8">
            {aide ? (
              <div role="note" className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-3 text-[14px] text-ink">
                <span className="flex-1">{AIDE}</span>
                <button
                  type="button"
                  onClick={() => {
                    setAide(false);
                    ecrireStockage("mobiiz-assistant-aide", "vue");
                  }}
                  className="min-h-9 shrink-0 rounded-full px-3 text-[14px] font-semibold"
                >
                  Compris
                </button>
              </div>
            ) : null}
            {messages.map((m, i) => (
              <p
                key={i}
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-snug ${m.de === "moi" ? "self-end bg-accent text-on-accent" : "self-start bg-surface text-ink shadow-card"}`}
              >
                {m.texte}
              </p>
            ))}
            {questions.map((q) => (
              <div key={q.cle} role="group" aria-label={q.texte} className="flex flex-col gap-2.5 rounded-2xl bg-surface p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[16px] font-bold text-ink">{q.texte}</span>
                  <button type="button" onClick={() => passer(q.cle)} className="min-h-9 shrink-0 rounded-full px-3 text-[14px] font-semibold text-muted">
                    Passer
                  </button>
                </div>
                {q.choix.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {q.choix.map((c) => (
                      <button key={c} type="button" disabled={occupe} onClick={() => void envoyer(q.cle === "livraison" ? (c.startsWith("Oui") ? "oui" : "non") : c)} className="pressable min-h-10 rounded-full border border-line px-4 text-[14px] font-semibold text-ink">
                        {c}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-[13px] text-muted">Écris-la ou dicte-la ci-dessous.</span>
                )}
              </div>
            ))}
            {occupe ? <p className="self-start text-[14px] text-muted">Je mets ta liste à jour…</p> : null}
          </div>
          <div className="flex flex-col gap-2 border-t border-line px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] lg:px-8">
            {dictee.probleme ? (
              <p role="alert" className="text-[13px] font-semibold text-danger">
                {dictee.probleme}
              </p>
            ) : null}
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void envoyer(saisie);
              }}
            >
              <label className="flex min-h-12 flex-1 items-center rounded-3xl border border-line bg-surface px-4 focus-within:border-ink">
                <span className="sr-only">Ton message</span>
                <textarea
                  rows={1}
                  value={saisie}
                  onChange={(e) => {
                    setSaisie(e.target.value);
                    base.current = e.target.value;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void envoyer(saisie);
                    }
                  }}
                  placeholder={dictee.ecoute ? "Je t'écoute…" : "Écris ou dicte ta réponse"}
                  className="max-h-32 w-full resize-none bg-transparent py-3 text-[16px] outline-none"
                />
              </label>
              <button
                type="button"
                aria-label={dictee.ecoute ? "Arrêter la dictée" : "Dicter"}
                aria-pressed={dictee.ecoute}
                onClick={() => {
                  if (dictee.ecoute) dictee.arreter();
                  else {
                    base.current = saisie;
                    dictee.demarrer();
                  }
                }}
                className={`pressable flex size-12 shrink-0 items-center justify-center rounded-full border ${dictee.ecoute ? "border-danger bg-danger text-white" : "border-line bg-surface text-ink"}`}
              >
                <Mic size={20} aria-hidden="true" />
              </button>
              <button type="submit" aria-label="Envoyer le message" disabled={!saisie.trim() || occupe} className="pressable flex size-12 shrink-0 items-center justify-center rounded-full bg-ink text-white disabled:opacity-40">
                <ArrowUp size={20} aria-hidden="true" />
              </button>
            </form>
            <div className="flex flex-wrap items-center gap-2">
              {retours.length > 0 ? (
                <button type="button" disabled={occupe} onClick={() => void annuler()} className="pressable flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-ink">
                  <Undo2 size={16} aria-hidden="true" />
                  Annuler la dernière modification
                </button>
              ) : null}
              <span className="flex-1" />
              <button type="button" onClick={onClose} className="pressable min-h-11 rounded-full border border-line px-4 text-[14px] font-semibold">
                Voir ma liste
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSend();
                }}
                className="pressable min-h-11 rounded-full bg-accent px-5 text-[15px] font-bold text-on-accent"
              >
                Envoyer aux négoces
              </button>
            </div>
          </div>
        </section>
        {ordinateur ? (
          <section aria-label="Aperçu du PDF" className="flex min-h-0 flex-col border-l border-line bg-(--voile-2)">
            {pdf}
          </section>
        ) : null}
      </div>
      {voirPdf && !ordinateur ? (
        <div role="dialog" aria-modal="true" aria-label="Le PDF de ta demande" className="fixed top-0 left-0 z-50 flex h-[100dvh] w-full flex-col bg-night lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
            <span className="text-[16px] font-bold">Ta demande de prix</span>
            <button type="button" onClick={() => setVoirPdf(false)} className="pressable min-h-11 rounded-full bg-white/10 px-4 text-[14px] font-semibold text-white">
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
        <span className="text-[13px] font-semibold text-muted max-lg:text-white/70">Touche une ligne pour la modifier.</span>
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


/** L'entrée de l'assistant sur « Ton chantier » (avant l'envoi) : une carte, un bouton. */
export function CarteAssistant({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-3 rounded-2xl bg-surface p-4 shadow-card lg:grid-cols-[auto_1fr_auto]">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent" aria-hidden="true">
        <Sparkles size={19} />
      </span>
      <span className="flex flex-col">
        <span className="text-[15px] font-bold text-ink">Assistant Mobiiz</span>
        <span className="text-[14px] text-muted">Complète ta demande en écrivant ou au micro, le PDF suit.</span>
      </span>
      <button type="button" onClick={onOpen} className="pressable col-span-2 min-h-11 rounded-full bg-ink px-4 text-[15px] font-bold text-white lg:col-span-1">
        Ouvrir l&apos;assistant
      </button>
    </div>
  );
}
