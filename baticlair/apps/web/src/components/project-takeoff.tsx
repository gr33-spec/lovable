"use client";

import { ArrowLeft, Check, ChevronRight, CircleCheck, FileDown, FileText, HelpCircle, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AssistantMessage, ChatInput, parseCommand, ReasoningSteps, Say, ThinkingSteps, UserBubble } from "@/components/chat";
import { ProjectPriceRequests } from "@/components/project-price-requests";
import { type ItemEdit } from "@/components/purchase-list";
import { SupplyList } from "@/components/supply-list";
import { SiteNotes } from "@/components/site-notes";
import { type DecisionHandlers } from "@/components/takeoff-view";
import { useProgressRefresh } from "@/components/project-progress";
import { Button, Card, ErrorNotice, Spinner } from "@/components/ui";
import { api, ApiError, type ProjectDocument, type PurchaseItem, type Quantitatif, type ReadingState, type ScreenRow, type TakeoffLine } from "@/lib/api";
import { attachFile } from "@/lib/upload";
import { parseQuantity, shortName } from "@/lib/labels";
import { openFile } from "@/lib/open-document";
import { useResource } from "@/lib/use-resource";

/** Le devis client peut être lu par l'IA : texte lu, ou lecture locale en panne (l'IA lit alors le PDF). */
export function canPrepareTakeoff(doc: ProjectDocument): boolean {
  return doc.status === "read" || doc.reading?.errorCode === "read_failed";
}


/** « 45° » collé, « 60 cm » espacé, rien pour les pièces. */
const withUnit = (value: string, unit: string) => (!unit || unit === "u" ? value : unit === "°" ? `${value}°` : `${value} ${unit === "m2" ? "m²" : unit}`);

type Said = { id: number; text: string; reply: string | null };

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
}: {
  projectId: string;
  clientQuote: ProjectDocument | null;
  archived: boolean;
  /** Devis tout juste déposé : la lecture part d'elle-même. */
  autoStart: boolean;
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
  const [fresh, setFresh] = useState(false);
  const [said, setSaid] = useState<Said[]>([]);
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
    if (!clientQuote || !readable) return null;
    if (!data.aiAvailable) {
      return (
        <AssistantMessage>
          <Say>La lecture automatique n&apos;est pas encore activée sur votre compte.</Say>
        </AssistantMessage>
      );
    }
    const failed = data.reading?.status === "failed";
    return (
      <section id="materiaux" aria-label="Liste de matériaux" className="flex scroll-mt-4 flex-col gap-3">
        <AssistantMessage>
          {pending || readingNow ? (
            <>
              <Say>Je regarde votre devis (jusqu&apos;à une minute).</Say>
              <ThinkingSteps />
            </>
          ) : (
            <>
              {/* Retour du fondateur (2026-10-04) : la lecture ne part plus d'elle-même ; l'artisan a le temps
                  d'ajouter ses infos chantier (elles accompagnent la lecture), puis il lance d'un appui. */}
              <Say>
                {failed
                  ? "Je n'ai pas réussi à lire ce devis jusqu'au bout (coupure ou panne de mon côté). Rien ne vous est décompté : on réessaie ?"
                  : "Devis bien reçu. Ajoutez des infos sur le chantier si vous voulez, puis lancez la lecture."}
              </Say>
              {actionError ? <ErrorNotice error={actionError} /> : null}
              <SiteNotes projectId={projectId} infos={quantitatif?.infos ?? null} disabled={archived} onSaved={reload} />
              <div className="h-20 lg:hidden" aria-hidden="true" />
              <div className="fixed inset-x-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-20 mx-auto max-w-2xl lg:static lg:inset-auto lg:mx-0">
                <Button className="min-h-15 w-full text-[17px]" disabled={archived} onClick={prepare}>
                  <Sparkles size={18} aria-hidden="true" />
                  {actionError || failed ? "Réessayer" : "Lire le devis"}
                </Button>
              </div>
            </>
          )}
        </AssistantMessage>
      </section>
    );
  }

  const draft = takeoff.status === "draft";
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
  const remember = (text: string, reply: string | null = null) => setSaid((prev) => [...prev, { id: prev.length, text, reply }]);
  const lineActions = (line: TakeoffLine) => ({
    onSave: (fields: LineFieldsInput) => call("corrections", { action: "modifier_ligne", id: line.id, ligne: ligne(fields) }),
    onDelete: () => call("corrections", { action: "retirer", id: line.id }),
    onConfirm: () => call("corrections", { action: "confirmer", id: line.id }),
  });
  // Chaque réponse de l'artisan s'affiche dans le fil, comme un message.
  const answerLabel = (key: string, value: string | { value: string; unit: string } | null): string => {
    if (value === null) return "Je ne sais pas";
    const raw = typeof value === "string" ? value : value.value;
    const options = [...takeoff.view.decisions.map((d) => d.question), ...takeoff.purchase.assumptions.map((a) => ({ key: a.key, options: a.choices }))];
    const option = options.find((q) => q && (q.key === key || `engine:${q.key}` === key || q.key === `engine:${key}`))?.options.find((o) => o.value === raw);
    if (option) return option.label;
    if (typeof value === "string") return value === "" ? "Aucun de ces modèles" : value;
    return withUnit(value.value, value.unit);
  };
  const handlers: DecisionHandlers = {
    onDecide: (d) => {
      if (d.primary) remember(d.primary.label);
      return call("reponses", { reponses: [{ question: d.key, valeur: "ok" }] });
    },
    onAnswer: (key, value) => {
      remember(answerLabel(key, value));
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
    if (draft) void call("validation").then(() => setSendSignal((n) => n + 1));
    else setSendSignal((n) => n + 1);
  };
  // Mettre une ligne de côté : un article de la liste sort de la liste (la liste validée le reste) ; une ligne du devis
  // à préciser avec le fournisseur est retirée.
  const setAside = async (row: ScreenRow) => {
    // Un article recopié tel quel du devis (« line:<ligne> ») se retire avec sa ligne : sinon son doute reviendrait.
    if (row.itemKey && !row.itemKey.startsWith("line:")) await call("corrections", { action: "retirer_article", id: row.itemKey });
    // Une ligne qui attend une réponse (ou qu'aucun article ne porte) : on retire la ou les lignes du devis d'où elle vient.
    else for (const id of row.lineIds) await call("corrections", { action: "retirer", id });
  };
  const typed = (text: string) => {
    const command = parseCommand(text);
    if (!command) {
      remember(text, "Je comprends pour l'instant la pente (« 30° »), la zone (« zone 1 ») et la surface (« 120 m² »). Pour le reste, utilisez les boutons.");
      return;
    }
    // Honnête : si la valeur ne sert à aucun calcul de ce devis, on le dit plutôt que « recalculé ».
    const used = takeoff.purchase.assumptions.some((a) => a.key === command.key) || takeoff.view.decisions.some((d) => d.question?.key === command.key || d.question?.key === `engine:${command.key}`);
    remember(text, used ? `C'est noté : ${command.said}. J'ai recalculé.` : `C'est noté : ${command.said}. Ça ne change rien à la liste.`);
    void answer(command.key, command.value);
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
  } else {
    // UN SEUL ÉCRAN : la liste des fournitures, une couleur par ligne (retour du fondateur, 2026-10-04).
    body = (
      <>
        <SupplyList
          takeoff={takeoff}
          editable={editable}
          pending={pending}
          handlers={handlers}
          onEditItem={editItem}
          onSetAside={setAside}
          onSuggestion={async (item, reponse) => {
            remember(reponse === "oui" ? `Oui, ajoute ${item.label.toLowerCase()}` : `Non, pas de ${item.label.toLowerCase()}`);
            await call("corrections", { action: "suggestion", id: item.key, reponse });
          }}
          onSend={send}
          validated={!draft}
          sent={sent}
          sketches={quantitatif?.infos?.croquis ?? []}
          sketchHandlers={{ onAttach: attachSketch, onDetach: detachSketch }}
        />
        {/* Ce qu'on peut encore faire sur la liste : des actions dites en clair, jamais un lien qu'on ne comprend pas. */}
        <nav aria-label="Autres actions sur la liste" className="flex flex-col divide-y divide-line overflow-hidden rounded-[20px] bg-surface shadow-card">
          {editable ? (
            <ActionRow icon={<Plus size={20} aria-hidden="true" />} title="Ajouter un article oublié" text="Une fourniture que le devis ne cite pas." onClick={() => setShowList("ajouter")} />
          ) : null}
          <ActionRow
            icon={<FileText size={20} aria-hidden="true" />}
            title="Corriger le devis lu"
            text={`${materials.length} ${materials.length > 1 ? "lignes lues" : "ligne lue"} dans le devis du client. Une ligne mal lue ? Corrigez-la.`}
            onClick={() => setShowList("corriger")}
          />
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
      </>
    );
  }

  return (
    <>
      <AssistantMessage>
        <ReasoningSteps takeoff={takeoff} fresh={fresh} />
      </AssistantMessage>
      {said.map((m) => (
        <Fragment key={m.id}>
          <UserBubble>{m.text}</UserBubble>
          {m.reply ? (
            <AssistantMessage>
              <Say>{m.reply}</Say>
            </AssistantMessage>
          ) : null}
        </Fragment>
      ))}
      <section id="materiaux" aria-label="Liste de matériaux" className="flex scroll-mt-4 flex-col gap-3">
        <AssistantMessage>
          {actionError ? <ErrorNotice error={actionError} /> : null}
          {body}
        </AssistantMessage>
      </section>
      <ProjectPriceRequests projectId={projectId} archived={archived} canCreate={!draft} quantitatifId={quantitatif?.id ?? null} onListChanged={reload} openSignal={sendSignal} onSentChange={setSent} />
      {draft && editable ? (
        <>
          <SiteNotes projectId={projectId} infos={quantitatif?.infos ?? null} disabled={pending} onSaved={reload} />
          <ChatInput onSend={typed} disabled={pending} placeholder="« Mets 30° de pente », « zone 1 »…" />
        </>
      ) : null}
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
        {/* Jamais de coche verte sur une mesure d'ouvrage ou une quantité ambiguë : rien n'y est encore à commander. */}
        {doubt ? (
          <HelpCircle size={18} className="shrink-0 text-warn" aria-label="à vérifier" />
        ) : line.basis === "work" || line.role === "undetermined" ? (
          <HelpCircle size={18} className="shrink-0 text-muted" aria-label="matériaux à calculer" />
        ) : (
          <CircleCheck size={18} className="shrink-0 text-ok" aria-label="vérifiée" />
        )}
        <span className="min-w-0 grow">
          <span className="line-clamp-2 text-[15px] leading-snug font-bold">{shortName(line.article ?? line.designation)}</span>
          <span className="text-sm text-muted">
            {line.basis === "work" ? "Lu dans le devis : " : ""}
            {line.quantity ?? "?"} {line.unit ?? ""}
            {line.basis === "work" ? <span className="font-semibold text-warn"> · matériaux à calculer</span> : null}
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
