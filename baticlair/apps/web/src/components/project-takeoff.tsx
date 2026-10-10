"use client";

import { ArrowLeft, ChevronRight, CircleCheck, Plus } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AssistantMessage, Say } from "@/components/chat";
import { useSelectionSend } from "@/components/selection-send";
import { AnalysisScreen, CalculScreen, notifyReady, QuestionsStep, type CounterAnswers } from "@/components/journey";
import { ProjectPriceRequests } from "@/components/project-price-requests";
import { type ItemEdit } from "@/components/purchase-list";
import { SiteUnitsView } from "@/components/site-units-view";
import { SupplyList } from "@/components/supply-list";
import { type DecisionHandlers } from "@/components/takeoff-view";
import { useProgressRefresh } from "@/components/project-progress";
import { Button, Card, ErrorNotice, Spinner } from "@/components/ui";
import { api, ApiError, type ProjectDocument, type PurchaseItem, type Quantitatif, type ReadingState, type ScreenRow, type TakeoffLine } from "@/lib/api";
import { attachFile } from "@/lib/upload";
import { parseQuantity } from "@/lib/labels";
import { unreadableMessage } from "@/lib/fr";
import { useListPage } from "@/lib/list-page";
import { useResource } from "@/lib/use-resource";

/** Le devis client peut être lu par l'IA : texte lu, ou lecture locale en panne (l'IA lit alors le PDF). */
export function canPrepareTakeoff(doc: ProjectDocument): boolean {
  return doc.status === "read" || doc.reading?.errorCode === "read_failed";
}


/**
 * LE CHAT DU CHANTIER, après le dépôt du devis (référentiel §21) :
 *  1. BatiClair lit le devis, étapes visibles ;
 *  2. il dit ce qu'il a compris (ouvrages, mesures, hypothèses : pente 45°, zone 3) ;
 *  3. UNE question à la fois, seulement si elle change la commande, toujours à boutons ;
 *  4. la carte du quantitatif, rangée par ouvrage, hypothèses modifiables ;
 *  5. « Envoyer au fournisseur ».
 * Jamais de quantité demandée à l'artisan. Le devis lu reste à un appui pour corriger une ligne.
 */
export function ProjectTakeoff({
  projectId,
  clientQuote,
  archived,
  autoStart,
  onProjectChanged,
  onRedeposit,
}: {
  projectId: string;
  clientQuote: ProjectDocument | null;
  archived: boolean;
  /** Devis tout juste déposé : la lecture part d'elle-même. */
  autoStart: boolean;
  /** La lecture a nommé le chantier (« Chantier Dupont ») : l'en-tête se relit. */
  onProjectChanged?: () => void;
  /** Retire le devis déposé (illisible, ou rien lu dedans) pour en déposer un autre : « Réessayer » d'un fichier. */
  onRedeposit?: () => Promise<void>;
}) {
  // Le chat passe par la même porte que les partenaires (§38) : /v1/quantitatifs, avec le détail de l'écran.
  const fetchQuantitatif = useCallback(
    (signal: AbortSignal) => api<{ items: Quantitatif[]; ia_disponible: boolean }>(`/v1/quantitatifs?projetId=${encodeURIComponent(projectId)}&ecran=1`, { signal }),
    [projectId],
  );
  const { data: raw, setData, error, reload } = useResource(fetchQuantitatif);
  const quantitatif = raw?.items[0] ?? null;
  const data = useMemo(() => {
    if (!raw) return null;
    const q = raw.items[0];
    const reading: ReadingState | null = q?.etat === "en_cours" ? { status: "reading", reason: null } : q?.etat === "erreur" ? { status: "failed", reason: q.erreur?.raison ?? null } : null;
    return { takeoff: q?.ecran ?? null, aiAvailable: raw.ia_disponible, reading };
  }, [raw]);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<ApiError | null>(null);
  // Le devis lu, ligne par ligne : fermé, ouvert pour corriger, ou ouvert directement sur « ajouter un article ».
  // §50.7 : « Ajouter un article » ouvre sa fiche (plus de voix).
  const [showList, setShowList] = useState<false | "ajouter">(false);
  const [sendSignal, setSendSignal] = useState(0);
  // §48.5 : « Envoyer une sélection à un autre fournisseur » ; une sélection partie fait relire les demandes.
  const [requestsSignal, setRequestsSignal] = useState(0);
  const selection = useSelectionSend(projectId, () => setRequestsSignal((n) => n + 1));
  const [sent, setSent] = useState(false);
  // La liste a sa page (`?vue=fournitures`) ; sur le chantier, elle tient en une ligne. Après l'envoi, les réponses des
  // fournisseurs passent en haut du chantier (retour du fondateur, 2026-10-05).
  const [page, setPage] = useListPage();
  // Un chantier de plusieurs logements s'ouvre « par logement » ; le total à commander est à l'onglet d'à côté.
  const [unitsView, setUnitsView] = useState(true);
  // Après « Envoyer au fournisseur » : l'aperçu d'envoi et les demandes passent devant la liste.
  const [overview, setOverview] = useState(false);
  const started = useRef(false);
  const refreshProgress = useProgressRefresh();
  const readable = clientQuote ? canPrepareTakeoff(clientQuote) : false;

  const update = useCallback(
    (q: Quantitatif) => {
      setData((prev) => (prev ? { ...prev, items: [q] } : prev));
      refreshProgress();
    },
    [setData, refreshProgress],
  );

  const run = useCallback(async <T,>(action: () => Promise<T>, onDone: (value: T) => void) => {
    setPending(true);
    setActionError(null);
    try {
      onDone(await action());
    } catch (e) {
      setActionError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
    }
  }, []);

  const prepare = useCallback(() => {
    if (!clientQuote) return;
    // Gros devis : la porte répond « en_cours » et la lecture continue sur le serveur ; l'écran la suit (audit B3).
    void run(
      () => api<Quantitatif>(`/v1/quantitatifs?ecran=1`, { method: "POST", body: { documentId: clientQuote.id } }),
      (q) => {
        update(q);
      },
    );
  }, [clientQuote, run, update]);

  // Lecture en cours sur le serveur : on regarde toutes les 3 secondes où elle en est.
  const readingNow = data?.takeoff === null && data.reading?.status === "reading";
  useEffect(() => {
    if (!readingNow) return;
    const t = setInterval(reload, 3000);
    return () => clearInterval(t);
  }, [readingNow, reload]);

  // §48 : le calcul (appel IA n° 2) tourne sur le serveur : on regarde toutes les 3 secondes s'il a fini.
  const phase = quantitatif?.phase ?? "resultat";
  const calculating = Boolean(data?.takeoff) && phase === "calcul";
  useEffect(() => {
    if (!calculating) return;
    const t = setInterval(reload, 3000);
    return () => clearInterval(t);
  }, [calculating, reload]);
  // Les étapes qui finissent pendant que l'artisan est ailleurs : on le prévient (et le nom lu du devis s'affiche).
  const step = !data ? null : !data.takeoff ? "lecture" : phase;
  const lastStep = useRef<string | null>(null);
  useEffect(() => {
    const before = lastStep.current;
    lastStep.current = step;
    if (before === "lecture" && step && step !== "lecture") {
      onProjectChanged?.();
      if (step === "questions") notifyReady("Ton devis est lu", "J'ai quelques questions pour toi avant de calculer.", `chantier-${projectId}`);
    }
    if (before === "calcul" && step === "resultat") notifyReady("Ta liste est prête", "Les matériaux sont calculés : il te reste à vérifier les lignes orange.", `chantier-${projectId}`);
  }, [step, onProjectChanged, projectId]);

  // Devis tout juste déposé : on lit sans attendre un appui de plus.
  useEffect(() => {
    if (!autoStart || started.current || !data || data.takeoff || !data.aiAvailable || !readable || archived) return;
    started.current = true;
    prepare();
  }, [autoStart, data, readable, archived, prepare]);


  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;

  const takeoff = data.takeoff;

  if (!takeoff) {
    if (!clientQuote) return null;
    // §50.1 : un devis illisible dit pourquoi en une phrase ; « Réessayer » repart du dépôt.
    if (!readable) {
      return clientQuote.status === "failed" ? (
        <ReadFailure sentence={unreadableMessage(clientQuote.reading?.errorCode)} disabled={archived} {...(onRedeposit ? { onRetry: () => void run(onRedeposit, () => undefined) } : {})} />
      ) : (
        <AnalysisScreen />
      );
    }
    if (!data.aiAvailable) {
      return (
        <AssistantMessage>
          <Say>La lecture automatique n&apos;est pas encore activée sur ton compte.</Say>
        </AssistantMessage>
      );
    }
    // Jamais d'analyse sans fin : une lecture refusée au départ (aucune lecture ne tourne) ou un serveur qui ne répond plus
    // pendant la lecture se disent, avec leur raison et « Réessayer ».
    const refused = actionError !== null && data.reading?.status !== "reading";
    const lost = error !== null && data.reading?.status === "reading";
    const failed = (data.reading?.status === "failed" || refused || lost) && !pending;
    if (!failed) return <AnalysisScreen />;
    const shown = refused ? actionError : lost ? error : actionError;
    // §50.1 : en cas d'échec, la raison en une phrase et « Réessayer ». RIEN NE PART VIDE : une lecture qui n'a trouvé aucune
    // ligne ne fait jamais une liste, elle se relit.
    const nothingRead = (data.reading?.reason === "nothing_read" && !refused && !lost) || (refused && actionError?.reason === "nothing_read");
    const sentence = nothingRead
      ? "Je n'ai rien lu dans ce devis."
      : refused
        ? (shown?.message ?? "Je n'ai pas pu lancer la lecture de ce devis.")
        : lost
          ? "Je n'ai plus de nouvelles de la lecture de ce devis."
          : "Je n'ai pas réussi à lire ce devis jusqu'au bout.";
    return <ReadFailure sentence={sentence} disabled={archived} onRetry={lost ? reload : prepare} />;
  }

  // §48 ÉTAPE 3 : les questions de comptoir, toutes d'un coup, AVANT le calcul. Puis ÉTAPE 4 : le calcul.
  const qid0 = encodeURIComponent(quantitatif!.id);
  const calculate = (answers: CounterAnswers) =>
    run(() => api<Quantitatif>(`/v1/quantitatifs/${qid0}/calcul?ecran=1`, { method: "POST", body: answers }), (q) => {
      update(q);
    });
  if (phase === "questions" && takeoff.status === "draft" && !archived) {
    return <QuestionsStep takeoff={takeoff} pending={pending} error={actionError} onSubmit={calculate} />;
  }
  if (phase === "calcul") return <CalculScreen />;

  // Une liste lue avant la règle « rien ne part vide » et restée sans ligne : jamais de bouton d'envoi ; on repart du dépôt.
  if (takeoff.purchase.toBuy.length + takeoff.purchase.toQuote.length === 0 && takeoff.lines.length === 0) {
    return <ReadFailure sentence="Je n'ai rien lu dans ce devis." disabled={archived} {...(onRedeposit ? { onRetry: () => void run(onRedeposit, () => undefined) } : {})} />;
  }
  const draft = takeoff.status === "draft";
  const units = takeoff.logements ?? null;
  const editable = !archived;
  // Toutes les actions passent par la porte : réponses, corrections, validation.
  const qid = encodeURIComponent(quantitatif!.id);
  const call = (path: "reponses" | "corrections" | "validation", body?: unknown) =>
    run(() => api<Quantitatif>(`/v1/quantitatifs/${qid}/${path}?ecran=1`, { method: "POST", ...(body !== undefined ? { body } : {}) }), update);
  const ligne = (f: LineFieldsInput) => ({ libelle: f.designation, quantite: f.quantity, unite: f.unit, reference: f.reference });
  const answer = (key: string, value: string | { value: string; unit: string } | null) =>
    call("reponses", { reponses: [value !== null && typeof value === "object" ? { question: key, valeur: value.value, unite: value.unit } : { question: key, valeur: value }] });
  const handlers: DecisionHandlers = {
    onDecide: (d) => {
      return call("reponses", { reponses: [{ question: d.key, valeur: "ok" }] });
    },
    onDecideMany: (ds) => {
      return call("reponses", { reponses: ds.map((d) => ({ question: d.key, valeur: "ok" })) });
    },
    onAnswer: (key, value) => {
      return answer(key, value);
    },
    onSaveLine: (lineId, fields) => call("corrections", { action: "modifier_ligne", id: lineId, ligne: ligne(fields) }),
    onDeleteLine: (lineId) => call("corrections", { action: "retirer", id: lineId }),
  };
  // § 41.4 : chaque ligne du quantitatif se réécrit d'un tap. Ligne reprise du devis : on corrige la ligne du
  // devis ; ligne calculée : les mots de l'artisan passent devant le calcul, qui reste visible.
  const editItem = async (item: PurchaseItem, e: ItemEdit) => {
    const direct = item.kind === "direct" ? takeoff.lines.find((l) => item.lineIds.includes(l.id)) : undefined;
    const before = item.quantity ? parseQuantity(item.quantity) : null;
    const quantityChanged = (e.quantite ?? "") !== (before?.quantity ?? "") || (e.unite ?? "") !== (before?.unit ?? "");
    if (direct) {
      // Quantité inchangée : on garde celle du devis telle qu'écrite (« 1 250 u »), pas sa forme affichée (« pièces »).
      const ligne = { libelle: e.libelle, quantite: quantityChanged ? e.quantite : direct.quantity, unite: quantityChanged ? e.unite : direct.unit, reference: direct.reference };
      await call("corrections", { action: "modifier_ligne", id: direct.id, ligne });
      return;
    }
    if (e.libelle !== item.label) await call("corrections", { action: "renommer", id: item.key, libelle: e.libelle });
    if (e.quantite && e.unite && quantityChanged) {
      await call("corrections", { action: "fixer_quantite", id: item.key, quantite: e.quantite.replace(/\s/g, ""), unite: e.unite });
    }
  };
  // Un croquis par article (couvertine, habillage…) : joint à la ligne, il part avec la commande ; la liste se relit ensuite.
  const attachSketch = async (itemKey: string, file: File, commentaire: string) => {
    const form = new FormData();
    form.append("article", itemKey);
    if (commentaire) form.append("commentaire", commentaire);
    await attachFile(form, file);
    await api(`/v1/projects/${encodeURIComponent(projectId)}/infos/croquis`, { method: "POST", body: form });
    reload();
  };
  const detachSketch = (sketchId: string) =>
    run(() => api<null>(`/v1/documents/${encodeURIComponent(sketchId)}`, { method: "DELETE" }), () => reload());
  // « Envoyer au fournisseur » : la liste est validée (si elle ne l'est pas encore), puis l'aperçu s'ouvre (§45.9).
  const send = () => {
    setShowList(false);
    setPage(false);
    setOverview(true);
    if (draft) void call("validation").then(() => setSendSignal((n) => n + 1));
    else setSendSignal((n) => n + 1);
  };
  // Mettre une ligne de côté : un article de la liste sort de la liste (la liste validée le reste) ; une ligne du devis
  // à préciser avec le fournisseur est retirée.
  // §50.7 : une ligne du chantier en bref se corrige (texte) ou se retire (vide), comme une ligne de la liste.
  const editBrief = (cle: string, texte: string) => call("corrections", { action: "bref", cle, texte });
  const setAside = async (row: ScreenRow) => {
    // Un article recopié tel quel du devis (« line:<ligne> ») se retire avec sa ligne : sinon son doute reviendrait.
    if (row.itemKey && !row.itemKey.startsWith("line:")) await call("corrections", { action: "retirer_article", id: row.itemKey });
    // Une ligne qui attend une réponse (ou qu'aucun article ne porte) : on retire la ou les lignes du devis d'où elle vient.
    else for (const id of row.lineIds) await call("corrections", { action: "retirer", id });
  };
  let body: React.ReactNode;
  if (showList) {
    body = (
      <>
        <button type="button" onClick={() => setShowList(false)} className="-ml-1 inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-bold text-accent-text">
          <ArrowLeft size={18} aria-hidden="true" />
          Revenir à ma liste
        </button>
        {editable ? (
          <AddLine
            startOpen
            pending={pending}
            onAdd={async (fields) => {
              await call("corrections", { action: "ajouter", ligne: ligne(fields) });
              setShowList(false);
            }}
          />
        ) : null}
      </>
    );
  } else if (units && unitsView) {
    body = (
      <SiteUnitsView
        data={units}
        onTotal={() => {
          setUnitsView(false);
          window.scrollTo({ top: 0 });
        }}
      />
    );
  } else {
    // §50.7 : « Ton chantier », le document que reçoit le fournisseur ; dessous, en petit, ajouter un article, envoyer une sélection.
    body = (
      <SupplyList
        takeoff={takeoff}
        editable={editable}
        pending={pending}
        handlers={handlers}
        onEditItem={editItem}
        onSetAside={setAside}
        onSend={send}
        docked={false}
        sent={sent}
        sketches={quantitatif?.infos?.croquis ?? []}
        sketchHandlers={{ onAttach: attachSketch, onDetach: detachSketch }}
        {...(!archived ? { selection } : {})}
        {...(editable
          ? {
              onAdd: () => setShowList("ajouter"),
              onBrief: editBrief,
            }
          : {})}
      />
    );
  }

  // Le résumé de la liste, sur le chantier : de quoi savoir où l'on en est et ouvrir la page des fournitures.
  const checkCount = takeoff.purchase.screen.groups.flatMap((g) => g.rows).filter((r) => r.status === "check").length;

  // §48 ÉTAPE 5 : la liste EST l'écran du chantier tant qu'elle n'est pas partie ; ensuite, les réponses des fournisseurs
  // passent devant et la liste tient en une ligne.
  const listShown = page || (!sent && !overview);
  return (
    <>
      {listShown ? (
        <section aria-label="Page des fournitures" className="flex flex-col gap-3">
          {sent || overview ? (
            <button
              type="button"
              onClick={() => {
                setPage(false);
                setOverview(true);
              }}
              className="-ml-1 inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-bold text-accent-text"
            >
              <ArrowLeft size={18} aria-hidden="true" />
              Retour au chantier
            </button>
          ) : null}
          {actionError ? <ErrorNotice error={actionError} /> : null}
          {units && !showList ? (
            // D'abord le chantier rangé par logement, puis le total regroupé pour le fournisseur.
            <div role="tablist" aria-label="Vue de la liste" className="grid grid-cols-2 gap-1 rounded-2xl bg-surface p-1 shadow-card">
              {(
                [
                  [true, `Par logement (${units.count})`],
                  [false, "Total à commander"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={label}
                  type="button"
                  role="tab"
                  aria-selected={unitsView === v}
                  onClick={() => setUnitsView(v)}
                  className={`min-h-11 rounded-xl px-3 text-[14px] font-extrabold ${unitsView === v ? "bg-ink text-surface" : "text-muted"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          {body}
        </section>
      ) : null}
      {/* Le chantier après l'envoi : reste monté sous la liste (l'aperçu d'envoi s'y ouvre), il est seulement caché. */}
      <div className={listShown ? "hidden" : "contents"}>
        <div className="flex flex-col gap-3">
          <section id="materiaux" aria-label="Liste de matériaux" className="flex scroll-mt-4 flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setOverview(false);
                setPage(true);
              }}
              className="flex min-h-14 w-full items-center gap-3 rounded-[20px] bg-surface px-4 py-3 text-left shadow-card active:bg-ground"
            >
              {sent || checkCount === 0 ? (
                <CircleCheck size={22} className="shrink-0 text-ok" aria-hidden="true" />
              ) : (
                <span className="flex size-[22px] shrink-0 items-center justify-center" aria-hidden="true">
                  <span className="size-3 rounded-full bg-warn" />
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-bold">{sent ? "Ma liste, envoyée" : "Ma liste"}</span>
                {/* §50.4 : plus de compteur « N fournitures · N à vérifier » ; seulement ce qui reste à régler. */}
                {!sent && checkCount > 0 ? (
                  <span className="text-[13px] text-muted">
                    {checkCount} ligne{checkCount > 1 ? "s" : ""} à régler
                  </span>
                ) : null}
              </span>
              <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />
            </button>
            {actionError && !listShown ? <ErrorNotice error={actionError} /> : null}
          </section>
          <div className={sent ? "order-first" : undefined}>
            <ProjectPriceRequests projectId={projectId} archived={archived} canCreate={!draft} quantitatifId={quantitatif?.id ?? null} openSignal={sendSignal} refreshSignal={requestsSignal} onSentChange={setSent} onPreviewClosed={() => setOverview(false)} />
          </div>
        </div>
      </div>
    </>
  );
}

interface LineFieldsInput {
  designation: string;
  quantity: string | null;
  unit: string | null;
  reference: string | null;
}

function AddLine({ pending, onAdd, startOpen = false }: { pending: boolean; onAdd: (fields: LineFieldsInput) => Promise<void>; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus size={18} aria-hidden="true" />
        Ajouter une ligne
      </Button>
    );
  }
  return (
    <Card className="p-4">
      <LineForm
        submitLabel="Ajouter"
        pending={pending}
        onCancel={() => setOpen(false)}
        onSubmit={async (fields) => {
          await onAdd(fields);
          setOpen(false);
        }}
      />
    </Card>
  );
}

function LineForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: TakeoffLine;
  submitLabel: string;
  pending: boolean;
  onSubmit: (fields: LineFieldsInput) => Promise<void>;
  onCancel: () => void;
}) {
  const id = useId();
  const [designation, setDesignation] = useState(initial?.designation ?? "");
  const [quantity, setQuantity] = useState(initial?.quantity ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [reference, setReference] = useState(initial?.reference ?? "");
  const input =
    "min-h-12 w-full rounded-2xl bg-ground px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ink";

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!designation.trim()) return;
        void onSubmit({
          designation: designation.trim(),
          quantity: quantity.trim() || null,
          unit: unit.trim() || null,
          reference: reference.trim() || null,
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm font-bold" htmlFor={`${id}-d`}>
        Désignation
        <input id={`${id}-d`} className={input} value={designation} onChange={(e) => setDesignation(e.target.value)} required maxLength={300} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-bold" htmlFor={`${id}-q`}>
          Quantité
          <input id={`${id}-q`} className={input} value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="decimal" maxLength={40} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold" htmlFor={`${id}-u`}>
          Unité
          <input id={`${id}-u`} className={input} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="u, m², ml…" maxLength={20} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-bold" htmlFor={`${id}-r`}>
        Référence (facultatif)
        <input id={`${id}-r`} className={input} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80} />
      </label>
      <div className="flex gap-2">
        <Button type="submit" pending={pending} className="grow">
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

/** §50.1 : un échec de lecture se dit en une phrase, avec « Réessayer ». Rien d'autre. */
function ReadFailure({ sentence, onRetry, disabled }: { sentence: string; onRetry?: () => void; disabled: boolean }) {
  return (
    <section id="materiaux" aria-label="Lecture du devis" className="flex scroll-mt-4 flex-col gap-3 rounded-[22px] bg-surface p-5 shadow-card">
      <p role="alert" className="text-[17px] leading-snug font-bold">
        {sentence}
      </p>
      {onRetry ? (
        <Button className="min-h-14 w-full text-[17px]" disabled={disabled} onClick={onRetry}>
          Réessayer
        </Button>
      ) : null}
    </section>
  );
}
