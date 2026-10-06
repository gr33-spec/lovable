"use client";

import { ArrowLeft, Check, ChevronRight, CircleCheck, FileDown, FileText, HelpCircle, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AssistantMessage, Say } from "@/components/chat";
import { AnalysisScreen, CalculScreen, notifyReady, QuestionsStep, type CounterAnswers } from "@/components/journey";
import { ProjectPriceRequests } from "@/components/project-price-requests";
import { type ItemEdit } from "@/components/purchase-list";
import { SiteUnitsView } from "@/components/site-units-view";
import { SupplyList } from "@/components/supply-list";
import { VoiceEditor } from "@/components/voice-editor";
import type { VoiceEdit } from "@/lib/voice-edits";
import { type DecisionHandlers } from "@/components/takeoff-view";
import { useProgressRefresh } from "@/components/project-progress";
import { Button, Card, ErrorNotice, Spinner } from "@/components/ui";
import { api, ApiError, type ProjectDocument, type PurchaseItem, type Quantitatif, type ReadingState, type ScreenRow, type TakeoffLine } from "@/lib/api";
import { attachFile } from "@/lib/upload";
import { parseQuantity, shortName } from "@/lib/labels";
import { openFile } from "@/lib/open-document";
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
  quoteCard = null,
  onProjectChanged,
}: {
  projectId: string;
  clientQuote: ProjectDocument | null;
  archived: boolean;
  /** Devis tout juste déposé : la lecture part d'elle-même. */
  autoStart: boolean;
  /** Le devis déposé (ouvrir, retirer) : montré avec la liste, pas pendant les étapes. */
  quoteCard?: React.ReactNode;
  /** La lecture a nommé le chantier (« Chantier Dupont ») : l'en-tête se relit. */
  onProjectChanged?: () => void;
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
  const [showList, setShowList] = useState<false | "corriger" | "ajouter">(false);
  const [sendSignal, setSendSignal] = useState(0);
  const [sent, setSent] = useState(false);
  // La liste a sa page (`?vue=fournitures`) ; sur le chantier, elle tient en une ligne. Après l'envoi, les réponses des
  // fournisseurs passent en haut du chantier (retour du fondateur, 2026-10-05).
  const [page, setPage] = useListPage();
  const autoOpened = useRef(false);
  // Un chantier de plusieurs logements s'ouvre « par logement » ; le total à commander est à l'onglet d'à côté.
  const [unitsView, setUnitsView] = useState(true);
  const [fresh, setFresh] = useState(false);
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
        setFresh(true);
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
      if (step === "questions") notifyReady("Ton devis est lu", "J'ai quelques questions pour toi avant de calculer.");
    }
    if (before === "calcul" && step === "resultat") notifyReady("Ta liste est prête", "Les matériaux sont calculés : il te reste à vérifier les lignes orange.");
  }, [step, onProjectChanged]);

  // Devis tout juste déposé : on lit sans attendre un appui de plus.
  useEffect(() => {
    if (!autoStart || started.current || !data || data.takeoff || !data.aiAvailable || !readable || archived) return;
    started.current = true;
    prepare();
  }, [autoStart, data, readable, archived, prepare]);

  // Les matériaux arrivent (lecture lancée ici) : la page des fournitures s'ouvre d'elle-même.
  const arrived = fresh && Boolean(data?.takeoff);
  useEffect(() => {
    if (!arrived || autoOpened.current) return;
    autoOpened.current = true;
    setPage(true);
  }, [arrived, setPage]);

  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;

  const takeoff = data.takeoff;

  if (!takeoff) {
    if (!clientQuote) return null;
    // Un devis illisible : sa carte dit pourquoi (et permet de le retirer).
    if (!readable) return clientQuote.status === "failed" ? <div className="flex flex-col gap-3">{quoteCard}</div> : <AnalysisScreen fileName={clientQuote.name} />;
    if (!data.aiAvailable) {
      return (
        <AssistantMessage>
          <Say>La lecture automatique n&apos;est pas encore activée sur ton compte.</Say>
        </AssistantMessage>
      );
    }
    const failed = data.reading?.status === "failed" && !pending;
    if (!failed) return <AnalysisScreen fileName={clientQuote.name} />;
    return (
      <section id="materiaux" aria-label="Liste de matériaux" className="flex scroll-mt-4 flex-col gap-3">
        <div className="flex flex-col gap-3 rounded-[22px] bg-surface p-5 shadow-card">
          <p className="text-[17px] leading-snug font-bold">Je n&apos;ai pas réussi à lire ce devis jusqu&apos;au bout (coupure ou panne de mon côté). Rien ne t&apos;est décompté : on réessaie ?</p>
          {actionError ? <ErrorNotice error={actionError} /> : null}
          <Button className="min-h-14 w-full text-[17px]" disabled={archived} onClick={prepare}>
            <Sparkles size={18} aria-hidden="true" />
            Réessayer
          </Button>
        </div>
        {quoteCard}
      </section>
    );
  }

  // §48 ÉTAPE 3 : les questions de comptoir, toutes d'un coup, AVANT le calcul. Puis ÉTAPE 4 : le calcul.
  const qid0 = encodeURIComponent(quantitatif!.id);
  const calculate = (answers: CounterAnswers) =>
    run(() => api<Quantitatif>(`/v1/quantitatifs/${qid0}/calcul?ecran=1`, { method: "POST", body: answers }), (q) => {
      setFresh(true);
      update(q);
    });
  if (phase === "questions" && takeoff.status === "draft" && !archived) {
    return <QuestionsStep takeoff={takeoff} pending={pending} error={actionError} onSubmit={calculate} />;
  }
  if (phase === "calcul") return <CalculScreen />;

  const draft = takeoff.status === "draft";
  const units = takeoff.logements ?? null;
  const materials = takeoff.lines.filter((l) => l.kind !== "labor");
  const labor = takeoff.lines.filter((l) => l.kind === "labor");
  const editable = !archived;
  // Toutes les actions passent par la porte : réponses, corrections, validation.
  const qid = encodeURIComponent(quantitatif!.id);
  const call = (path: "reponses" | "corrections" | "validation", body?: unknown) =>
    run(() => api<Quantitatif>(`/v1/quantitatifs/${qid}/${path}?ecran=1`, { method: "POST", ...(body !== undefined ? { body } : {}) }), update);
  const ligne = (f: LineFieldsInput) => ({ libelle: f.designation, quantite: f.quantity, unite: f.unit, reference: f.reference });
  const answer = (key: string, value: string | { value: string; unit: string } | null) =>
    call("reponses", { reponses: [value !== null && typeof value === "object" ? { question: key, valeur: value.value, unite: value.unit } : { question: key, valeur: value }] });
  const lineActions = (line: TakeoffLine) => ({
    onSave: (fields: LineFieldsInput) => call("corrections", { action: "modifier_ligne", id: line.id, ligne: ligne(fields) }),
    onDelete: () => call("corrections", { action: "retirer", id: line.id }),
    onConfirm: () => call("corrections", { action: "confirmer", id: line.id }),
  });
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
  // §48.4 : une modification dite à la voix (ou écrite) passe par les mêmes gestes que la main : retirer, corriger, ajouter.
  const voiceEdit = async (edit: Exclude<VoiceEdit, { kind: "unknown" }>): Promise<boolean> => {
    if (edit.kind === "add") {
      await call("corrections", { action: "ajouter", ligne: { libelle: edit.label, quantite: edit.quantity, unite: edit.unit, reference: null } });
      return true;
    }
    const item = takeoff.purchase.toBuy.find((b) => b.key === edit.itemKey);
    if (!item) return false;
    if (edit.kind === "remove") {
      if (item.key.startsWith("line:")) for (const lineId of item.lineIds) await call("corrections", { action: "retirer", id: lineId });
      else await call("corrections", { action: "retirer_article", id: item.key });
      return true;
    }
    const unit = edit.unit ?? (item.quantity ? parseQuantity(item.quantity)?.unit : null) ?? null;
    await editItem(item, { libelle: item.label, quantite: edit.to.replace(",", "."), unite: unit || null });
    return true;
  };
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
        <section aria-labelledby="devis-lu-titre" className="flex flex-col gap-1">
          <button type="button" onClick={() => setShowList(false)} className="-ml-1 inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-bold text-accent-text">
            <ArrowLeft size={18} aria-hidden="true" />
            Revenir à la liste des fournitures
          </button>
          <h2 id="devis-lu-titre" className="font-display text-[22px] font-extrabold tracking-[-0.02em]">
            Le devis du client, ligne par ligne
          </h2>
          <p className="text-[15px] leading-snug text-muted">Une ligne mal lue ? Corrigez-la ici : la liste des fournitures se recalcule toute seule.</p>
        </section>
        <Card className="flex flex-col divide-y divide-line px-4 py-1">
          {materials.map((line) => (
            <ListRow key={line.id} line={line} editable={editable} pending={pending} {...lineActions(line)} />
          ))}
        </Card>
        {editable ? <AddLine startOpen={showList === "ajouter"} pending={pending} onAdd={(fields) => call("corrections", { action: "ajouter", ligne: ligne(fields) })} /> : null}
        {labor.length > 0 || takeoff.notes.length > 0 ? (
          <details className="rounded-2xl bg-surface p-4 text-sm shadow-card">
            <summary className="cursor-pointer font-bold">Lignes mises de côté</summary>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted">
              {labor.map((l) => (
                <li key={l.id}>{shortName(l.designation)} (main-d&apos;œuvre, rien à chiffrer)</li>
              ))}
              {takeoff.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </details>
        ) : null}
        <Button variant="secondary" onClick={() => setShowList(false)}>
          <ArrowLeft size={18} aria-hidden="true" />
          Revenir à la liste des fournitures
        </Button>
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
    // UN SEUL ÉCRAN : la liste des fournitures, une couleur par ligne (retour du fondateur, 2026-10-04).
    body = (
      <>
        {editable ? (
          <VoiceEditor items={takeoff.purchase.toBuy.map((b) => ({ key: b.key, label: b.label, quantity: b.quantity }))} pending={pending} onApply={voiceEdit} />
        ) : null}
        <SupplyList
          takeoff={takeoff}
          editable={editable}
          pending={pending}
          handlers={handlers}
          onEditItem={editItem}
          onSetAside={setAside}
          onSuggestion={async (item, reponse) => {
            await call("corrections", { action: "suggestion", id: item.key, reponse });
          }}
          onSend={send}
          docked={false}
          validated={!draft}
          sent={sent}
          sketches={quantitatif?.infos?.croquis ?? []}
          sketchHandlers={{ onAttach: attachSketch, onDetach: detachSketch }}
        />
        {/* Ce qu'on peut encore faire sur la liste : des actions dites en clair, jamais un lien qu'on ne comprend pas. */}
        <nav aria-label="Autres actions sur la liste" className="flex flex-col divide-y divide-line overflow-hidden rounded-[20px] bg-surface shadow-card">
          {editable ? (
            <ActionRow icon={<Plus size={20} aria-hidden="true" />} title="Ajouter un article" text="Une fourniture que le devis ne cite pas." onClick={() => setShowList("ajouter")} />
          ) : null}
          {/* §21.3 : le même document que celui du fournisseur. */}
          {!draft ? (
            <ActionRow
              icon={<FileDown size={20} aria-hidden="true" />}
              title="Voir la liste en PDF"
              text="Le document que reçoit le fournisseur, sans prix : à télécharger ou à partager."
              onClick={() => openFile({ url: `/v1/projects/${encodeURIComponent(projectId)}/demande-de-devis.pdf`, title: "Liste des fournitures", fileName: "demande-de-devis.pdf" })}
            />
          ) : null}
        </nav>
        {/* Rare : une surface ou une longueur mal lue dans le devis. Un lien discret, plus une carte (toutes les lignes de
            la liste se modifient d'un appui). */}
        <button type="button" onClick={() => setShowList("corriger")} className="inline-flex min-h-11 items-center gap-1.5 self-center text-[13px] font-bold text-muted">
          <FileText size={15} aria-hidden="true" />
          Une mesure mal lue ? Corriger le devis lu
        </button>
      </>
    );
  }

  // Le résumé de la liste, sur le chantier : de quoi savoir où l'on en est et ouvrir la page des fournitures.
  const screenRows = takeoff.purchase.screen.groups.flatMap((g) => g.rows);
  const checkCount = screenRows.filter((r) => r.status === "check").length;

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
          {quoteCard && !showList ? <div className="flex flex-col gap-1.5">{quoteCard}</div> : null}
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
                <span className="font-bold">{sent ? "Liste des fournitures envoyée" : "Fournitures à chiffrer"}</span>
                <span className="text-[13px] text-muted">
                  {sent
                    ? "Touche pour la revoir ou la modifier."
                    : `${screenRows.length} fourniture${screenRows.length > 1 ? "s" : ""} · ${checkCount > 0 ? `${checkCount} à vérifier` : "tout est prêt"}`}
                </span>
              </span>
              <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />
            </button>
            {actionError && !listShown ? <ErrorNotice error={actionError} /> : null}
          </section>
          <div className={sent ? "order-first" : undefined}>
            <ProjectPriceRequests projectId={projectId} archived={archived} canCreate={!draft} quantitatifId={quantitatif?.id ?? null} onListChanged={reload} openSignal={sendSignal} onSentChange={setSent} onPreviewClosed={() => setOverview(false)} />
          </div>
          {listShown ? null : quoteCard}
        </div>
      </div>
    </>
  );
}

/** Étape terminée : une ligne, et de quoi y revenir. */
export function DoneLine({ label, action, actionLabel, onAction }: { label: string; action: string; actionLabel?: string; onAction: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-2 shadow-card">
      <CircleCheck size={20} className="shrink-0 text-ok" aria-hidden="true" />
      <span className="min-w-0 grow truncate text-[15px] font-bold">{label}</span>
      <button type="button" onClick={onAction} aria-label={actionLabel ?? action} className="inline-flex min-h-11 shrink-0 items-center text-sm font-bold text-accent-text">
        {action}
      </button>
    </div>
  );
}

interface LineFieldsInput {
  designation: string;
  quantity: string | null;
  unit: string | null;
  reference: string | null;
}

interface LineActions {
  onSave: (fields: LineFieldsInput) => Promise<void>;
  onDelete: () => Promise<void>;
  onConfirm: () => Promise<void>;
}

/** Une ligne de la liste complète : nom court, quantité, crayon. */
function ListRow({ line, editable, pending, onSave, onDelete, onConfirm }: { line: TakeoffLine; editable: boolean; pending: boolean } & LineActions) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const doubt = line.status !== "certain";

  if (editing) {
    return (
      <div className="py-3">
        <LineForm initial={line} submitLabel="Enregistrer" pending={pending} onCancel={() => setEditing(false)} onSubmit={async (f) => { await onSave(f); setEditing(false); }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 py-2.5">
      <div className="flex items-center gap-3">
        {/* Jamais de coche verte sur une mesure d'ouvrage ou une quantité ambiguë : rien n'y est à commander tel quel. Pas
            de « ? » non plus : la ligne est juste, ses matériaux sont dans la liste des fournitures (retour du fondateur). */}
        {doubt ? (
          <HelpCircle size={18} className="shrink-0 text-warn" aria-label="à vérifier" />
        ) : line.basis === "work" || line.role === "undetermined" ? (
          <span className="size-[18px] shrink-0" aria-hidden="true" />
        ) : (
          <CircleCheck size={18} className="shrink-0 text-ok" aria-label="vérifiée" />
        )}
        <span className="min-w-0 grow">
          <span className="line-clamp-2 text-[15px] leading-snug font-bold">{shortName(line.article ?? line.designation)}</span>
          <span className="text-sm text-muted">
            {line.quantity ?? "?"} {line.unit ?? ""}
            {/* Où la ligne se trouve dans le devis (logement, pièce) : pour s'y retrouver d'un coup d'œil. */}
            {line.section?.length ? <span> · {line.section.slice(-2).join(" › ")}</span> : null}
          </span>
        </span>
        {editable ? (
          <span className="flex shrink-0">
            {doubt ? (
              <button type="button" disabled={pending} onClick={() => void onConfirm()} aria-label={`C'est bon : ${line.designation}`} className="flex size-11 items-center justify-center rounded-full text-ok">
                <Check size={18} aria-hidden="true" />
              </button>
            ) : null}
            <button type="button" onClick={() => setEditing(true)} aria-label={`Corriger ${line.designation}`} className="flex size-11 items-center justify-center rounded-full text-accent-text">
              <Pencil size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setConfirmDelete(true)} aria-label={`Retirer ${line.designation}`} className="flex size-11 items-center justify-center rounded-full text-muted">
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </span>
        ) : null}
      </div>
      {confirmDelete ? <DeleteConfirm pending={pending} onDelete={onDelete} onCancel={() => setConfirmDelete(false)} /> : null}
    </div>
  );
}

function DeleteConfirm({ pending, onDelete, onCancel }: { pending: boolean; onDelete: () => Promise<void>; onCancel: () => void }) {
  return (
    <div role="group" aria-label="Confirmer la suppression de la ligne" className="flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => void onDelete()}
        className="inline-flex min-h-11 items-center rounded-xl bg-danger px-4 text-sm font-extrabold text-white disabled:opacity-60"
      >
        Oui, retirer
      </button>
      <button type="button" onClick={onCancel} className="inline-flex min-h-11 items-center px-4 text-sm font-bold">
        Annuler
      </button>
    </div>
  );
}

/** Une action sous la liste : une icône, ce qu'elle fait en clair, et pourquoi on s'en servirait. */
function ActionRow({ icon, title, text, onClick }: { icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={title} className="flex min-h-16 items-center gap-3 px-4 py-3 text-left active:bg-ground">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eeedff] text-[#4a37d6]">{icon}</span>
      <span className="flex min-w-0 grow flex-col">
        <span className="text-[15px] font-extrabold">{title}</span>
        <span className="text-[13px] leading-snug text-muted">{text}</span>
      </span>
      <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-subtle" />
    </button>
  );
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
