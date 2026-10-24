"use client";

import { AideBouton } from "@/components/aide";
import { Check, ChevronDown, ChevronUp, Eye, ListChecks, Paperclip, Pencil, Plus, Send, Trash2, Users, X } from "lucide-react";
import { openDocument } from "@/lib/open-document";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type ItemEdit, type SketchHandlers } from "@/components/purchase-list";
import { type DecisionHandlers } from "@/components/takeoff-view";
import { SelectionBar, type SelectionSend } from "@/components/selection-send";
import { GroupeBar, GroupeSection, type Groupe } from "@/components/groupe";
import { CommandeDuMoisBar, CommandeDuMoisBloc, MesLignesDuMois } from "@/components/commande-du-mois";
import { Button, ButtonLink, ErrorNotice } from "@/components/ui";
import type { ApiError, ItemSketch, PurchaseItem, ScreenRow, Takeoff, TakeoffDecision } from "@/lib/api";
import { enMetres, parseQuantity, shortName } from "@/lib/labels";
import { NOM, nom } from "@/lib/nom";

/**
 * §50.7 L'ÉCRAN 3 EST LE DOCUMENT (fondateur, 2026-10-10) : « Ton chantier », ce que le fournisseur recevra.
 *  - en haut, « Le chantier en bref » (le même que chez le fournisseur) : chaque ligne se corrige ou se retire ;
 *  - la liste : une ligne par fourniture (point, nom, quantité, unité) ; une ligne orange garde son point et sa raison en
 *    cinq mots, sans carte dépliée ;
 *  - sur le document même : un tap ouvre la ligne (moins / plus, boutons de choix, « C'est bon », corbeille), un tap sur
 *    le nom le corrige, un glissement vers la gauche la retire ; aucun écran intermédiaire, plus de voix ;
 *  - en bas, figés, deux boutons : « Aperçu » (le mail et le PDF du fournisseur) et « Envoyer aux négoces » ; en petit
 *    dessous, « Ajouter un article » ; à côté du titre « Fournitures », « Envoyer une partie » (une partie chez un
 *    fournisseur, le reste chez un autre).
 */
export function SupplyList({
  takeoff,
  editable,
  pending,
  handlers,
  onEditItem,
  onSetAside,
  onSend,
  onPreview,
  sketches = [],
  sketchHandlers,
  sent = false,
  docked = true,
  selection,
  groupe,
  groupeFerme = false,
  onAdd,
  onBrief,
  error = null,
}: {
  /** Le dernier geste refusé par le serveur : dit DANS la ligne ouverte, là où l'artisan vient de toucher. */
  error?: ApiError | null;
  /** §50.3 : « Ajouter un article », en petit sous le bouton d'envoi. */
  onAdd?: () => void;
  /** §50.7 : une ligne du chantier en bref, réécrite (texte) ou retirée (vide). */
  onBrief?: (cle: string, texte: string) => Promise<void>;
  /** §48.5 : « Envoyer une sélection à un autre fournisseur » (absent : la fonction n'existe pas ici). */
  selection?: SelectionSend;
  /** BatiClair Groupé (étape 2) : présent seulement quand l'entreprise y a accès ; absent, l'écran ne change pas. */
  groupe?: Groupe;
  /** Le groupé existe mais l'entreprise n'y a pas encore accès (SIRET) : un bloc grisé renvoie à l'onglet Groupé. */
  groupeFerme?: boolean;
  /** Une barre de chat est en bas de l'écran : le gros bouton se pose au-dessus d'elle. Sur la page des fournitures, non. */
  docked?: boolean;
  /** La demande est déjà partie : le gros bouton mène aux fournisseurs, il ne propose plus un premier envoi. */
  sent?: boolean;
  /** Liste déjà validée (elle peut partir) : dit en haut, et « Envoyer » ouvre directement l'aperçu. */
  validated?: boolean;
  takeoff: Takeoff;
  editable: boolean;
  pending: boolean;
  handlers: DecisionHandlers;
  onEditItem: (item: PurchaseItem, edit: ItemEdit) => Promise<void>;
  /** Mettre la ligne de côté (après les 3 s d'« Annuler »). */
  onSetAside: (row: ScreenRow) => Promise<void>;
  onSend: () => void;
  /** « Aperçu » (retour du fondateur, 2026-10-10) : le mail et le PDF tels que le fournisseur les reçoit. */
  onPreview?: () => void;
  sketches?: readonly ItemSketch[];
  sketchHandlers?: SketchHandlers;
}) {
  const p = takeoff.purchase;
  const screen = p.screen;
  const items = new Map(p.toBuy.map((b) => [b.key, b]));
  const quotes = new Map(p.toQuote.map((q) => [q.key, q]));
  const decisions = new Map(takeoff.view.decisions.map((d) => [d.key, d]));
  const [removing, setRemoving] = useState<string[]>([]);
  // §48.5 : cases à cocher seulement après le petit bouton ; par défaut l'écran ne change pas.
  const [selecting, setSelecting] = useState(false);
  // BatiClair Groupé : les mêmes cases servent à proposer des lignes au groupé (par ligne, ou « Cocher cette partie »).
  const [pourGroupe, setPourGroupe] = useState(false);
  const [messageMois, setMessageMois] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  // « Envoyer » touché avec des lignes orange : la phrase dit pourquoi rien ne part.
  const [blocked, setBlocked] = useState(false);
  const articleOf = (r: ScreenRow) => r.itemKey ?? (r.quoteKey ? `quote:${r.quoteKey}` : null);
  const hidden = (r: ScreenRow) => removing.includes(r.key);
  const rows = screen.groups.flatMap((g) => g.rows).filter((r) => !hidden(r));
  const toCheck = rows.filter((r) => r.status === "check");
  const baseLabel = (r: ScreenRow) =>
    r.itemKey ? (items.get(r.itemKey)?.kind === "direct" ? shortName(items.get(r.itemKey)!.label) : (items.get(r.itemKey)?.label ?? "")) : r.quoteKey ? shortName(quotes.get(r.quoteKey)?.label ?? "") : (r.pending?.label ?? "");
  // Deux cartes au même nom (« Bandes zinc » de la rive et de la ventilation) : chacune dit sa pièce, telle qu'écrite au devis.
  const allRows = screen.groups.flatMap((g) => g.rows);
  const twins = new Set(allRows.map(baseLabel).filter((l, i, a) => l && a.indexOf(l) !== i));
  const labelOf = (r: ScreenRow) => {
    const label = baseLabel(r);
    const line = twins.has(label) && r.lineIds.length === 1 ? takeoff.lines.find((l) => l.id === r.lineIds[0]) : undefined;
    return line ? `${label} · ${shortName(line.article ?? line.designation)}` : label;
  };

  // Retirer une ligne (glisser à gauche, ou « Retirer » dans sa fiche) : cachée tout de suite, retirée pour de bon ; jamais de
  // message flottant (§50.4). Un retrait après l'autre : la dernière réponse du serveur les contient tous.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const putAside = (r: ScreenRow) => {
    setRemoving((keys) => [...keys, r.key]);
    queue.current = queue.current
      .then(() => onSetAside(r))
      .catch(() => undefined)
      .finally(() => setRemoving((keys) => keys.filter((k) => k !== r.key)));
  };

  // §50.3 : une liste, comme un bon de commande : les oranges d'abord, puis les vertes, chacune dans l'ordre du devis.
  // §48.5 : entrer en sélection coche chaque ligne prête et pas encore envoyée à part (« je dois tout avoir de coché ») ;
  // l'artisan décoche ce qui ne part pas.
  const startSelecting = () => {
    setPourGroupe(false);
    setChecked(new Set(selectable));
    setSelecting(true);
  };
  // Proposer au groupé : rien de coché d'office (un engagement ferme se choisit ligne par ligne ou lot par lot).
  const startGroupe = () => {
    setPourGroupe(true);
    setChecked(new Set());
    setSelecting(true);
  };
  const stopSelecting = () => {
    setSelecting(false);
    setPourGroupe(false);
  };
  // La commande répartie : ce qui n'est encore parti chez aucun fournisseur, dont les lignes orange à vérifier d'abord.
  const unsent = rows.filter((r) => articleOf(r) && !selection?.sent.has(articleOf(r)!));
  const unsentToCheck = unsent.filter((r) => r.status === "check").length;
  const ordered = [...rows.filter((r) => r.status === "check"), ...rows.filter((r) => r.status !== "check")];
  // §52 (directive du fondateur, 2026-10-12 : « multi métiers ») : un devis à plusieurs lots donne une section par lot
  // (« Électricité », « Sanitaire »), chacune avec ses lignes, les oranges d'abord ; un devis d'un seul lot, une liste.
  const parLot = screen.groups.some((g) => g.key.startsWith("lot:"));
  const sections = parLot
    ? screen.groups.map((g) => {
        const own = g.rows.filter((r) => !hidden(r));
        return { key: g.key, label: g.label as string | null, rows: [...own.filter((r) => r.status === "check"), ...own.filter((r) => r.status !== "check")] };
      }).filter((x) => x.rows.length > 0)
    : [{ key: "liste", label: null as string | null, rows: ordered }];
  // Les lignes qu'on peut cocher : prêtes (pas orange), avec un article, pas encore parties à part ; au groupé, un article
  // calculé ou repris (jamais une ligne « à faire chiffrer ») qui n'y est pas déjà.
  // Décision de Greg (22 octobre) : une ligne vague ne se propose pas à la commande commune (elle part chez ton négoce).
  const vagueRow = (r: ScreenRow) => Boolean(r.itemKey && (items.get(r.itemKey)?.aPreciserPourGroupe?.length ?? 0) > 0);
  const cochable = (r: ScreenRow) =>
    r.status !== "check" && Boolean(articleOf(r)) && (pourGroupe ? Boolean(r.itemKey) && !groupe?.besoins.has(r.itemKey!) && !vagueRow(r) : !selection?.sent.has(articleOf(r)!));
  const selectable = rows.filter(cochable).map((r) => articleOf(r)!);
  const allChecked = selectable.length > 0 && selectable.every((k) => checked.has(k));

  return (
    <section aria-label="Liste des fournitures" className="flex flex-col">
      {editable && !selecting && toCheck.length > 0 ? (
        // §50.3 : une barre fixe discrète en haut, qui disparaît à zéro. Rien d'autre.
        <div role="status" className="sticky top-[max(8px,env(safe-area-inset-top))] z-20 mb-2 flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface/95 px-4 shadow-card backdrop-blur">
          <span className="size-2.5 shrink-0 rounded-full bg-mark-warn" aria-hidden="true" />
          <span className="text-[14px] leading-tight font-semibold text-warn">
            {toCheck.length} ligne{toCheck.length > 1 ? "s" : ""} à régler
          </span>
        </div>
      ) : null}
      <header className="mb-3 flex flex-col gap-0.5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[24px] leading-tight font-extrabold tracking-[-0.02em]">Ton chantier</h2>
          <AideBouton sujet="quantitatif" />
        </div>
        <p className="text-[14px] text-muted">C&apos;est ce que reçoit le négoce.</p>
        {/* §52 (retour du fondateur, 2026-10-12) : un métier pas encore relu par un artisan le dit, ici et dans le PDF. */}
        {takeoff.ratiosEnValidation ? (
          <p className="mt-2 self-start rounded-full bg-warn-bg px-3 py-1 text-[12px] font-semibold text-warn">Ratios en cours de validation</p>
        ) : null}
        {/* Lecture lot par lot (décision du fondateur, 24 octobre 2026) : une partie non lue est dite, les autres restent. */}
        {(takeoff.lotsNonLus ?? []).map((phrase) => (
          <p key={phrase} role="status" className="mt-2 rounded-2xl bg-warn-bg px-3 py-2 text-[14px] font-semibold text-warn">
            {phrase}
          </p>
        ))}
      </header>
      {takeoff.bref && takeoff.bref.length > 0 ? (
        <Brief takeoff={takeoff} editable={editable && Boolean(onBrief)} pending={pending} onBrief={onBrief} />
      ) : null}
      {/* Retour du fondateur (2026-10-11) : « je ne vois toujours pas la possibilité d'envoyer une partie du quantitatif à un
          négoce, puis une autre partie à un autre ». Un vrai bouton à côté du titre, visible sans descendre ; en sélection,
          une phrase dit quoi faire et « Tout cocher » / « Tout décocher » règle la liste d'un geste. */}
      <div className="mb-1 flex min-h-10 items-center justify-between gap-2">
        <h3 className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Fournitures</h3>
        {selecting ? (
          <button
            type="button"
            onClick={() => setChecked(allChecked ? new Set() : new Set(selectable))}
            className="inline-flex min-h-10 items-center gap-1.5 text-[13px] font-bold text-accent-text"
          >
            {allChecked ? "Tout décocher" : "Tout cocher"}
          </button>
        ) : editable && selection && rows.length > 1 ? (
          <span className="flex flex-wrap justify-end gap-1.5">
            {selection && rows.length > 1 ? (
              <button
                type="button"
                onClick={startSelecting}
                className="pressable inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[14px] font-semibold text-ink active:bg-ground"
              >
                <ListChecks size={16} aria-hidden="true" />
                Envoyer une partie
              </button>
            ) : null}
          </span>
        ) : null}
      </div>
      {/* BatiClair Groupé (demande du fondateur, 2026-10-20) : « Proposer au groupé » mis en avant, un bloc visible en haut, pas
          une ligne discrète. Seulement quand le groupé est ouvert à l'entreprise, et hors sélection. */}
      {!groupe && groupeFerme && editable && !selecting ? (
        <section aria-label={`${NOM} fermée`} className="mb-3 flex flex-col gap-2 rounded-xl border border-dashed border-line bg-ground p-4 opacity-80">
          <p className="flex items-center gap-2 text-[15px] font-extrabold text-muted">
            <Users size={18} aria-hidden="true" />
            {`Renseigne ton SIRET pour rejoindre la ${nom}`}
          </p>
          <p className="text-[14px] leading-snug text-muted">Un seul négoce, un seul prix, avec les autres artisans du département.</p>
          <ButtonLink href="/groupe" variant="secondary" className="min-h-10 self-start px-3.5 text-[14px]">
            {NOM}
          </ButtonLink>
        </section>
      ) : null}
      {/* La commande commune du mois (Greg, 22 octobre 2026) : un bloc, le chrono, et « Ajouter à la commande d'octobre ». */}
      {groupe && groupe.mode === "mois" && editable && !selecting ? (
        <CommandeDuMoisBloc etat={groupe.mois} onAjouter={startGroupe} message={messageMois} />
      ) : null}
      {groupe && groupe.mode === "lots" && editable && !selecting ? (
        <section aria-label={`Ajouter à la ${nom}`} className="mb-3 flex flex-col gap-2 rounded-xl bg-surface p-4 shadow-card">
          <p className="flex items-center gap-2 text-[15px] font-extrabold">
            <Users size={18} aria-hidden="true" className="text-accent-text" />
            {`${NOM} : un seul négoce, un seul prix`}
          </p>
          <p className="text-[14px] leading-snug text-muted">Tes commandes regroupées avec les autres artisans du département. Tu commandes sur ton compte, tu es livré sur ton chantier.</p>
          <Button variant="secondary" className="self-start" onClick={startGroupe}>
            {`Ajouter à la ${nom}`}
          </Button>
        </section>
      ) : null}
      {/* §49, §50 (retour du fondateur, 2026-10-12) : la légende des repères, sous le titre. */}
      {/* Retour du fondateur (2026-10-12) : « mets des cases à cocher à chaque ligne pour pouvoir valider ». La case cochée
          verte : prête à commander ; la case vide orange : à valider (un tap la coche, ou ouvre la question qui reste). */}
      <p className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Box checked /> Prêt à commander
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Box checked={false} /> À préciser : coche pour valider
        </span>
      </p>
      {selecting ? (
        <p className="mb-2 text-[14px] leading-snug font-bold text-ink">
          {pourGroupe && groupe?.mode === "mois" ? "Coche ce que tu ajoutes à la commande. Mets seulement ce que tu es sûr de commander." : pourGroupe ? `Coche ce que tu ajoutes à la ${nom}. Ton nom ne part pas avec.` : "Coche ce qui part chez ce fournisseur. Le reste pourra partir chez un autre."}
        </p>
      ) : null}
      {sections.map((section) => (
      <div key={section.key} className={section.label ? "mt-3 first:mt-0" : ""}>
      {section.label ? (
        <h4 className="mb-1.5 flex min-h-10 items-center justify-between gap-2 px-1 text-[15px] font-extrabold">
          <span>{section.label}</span>
          {/* §52 : chaque lot part chez son négoce : en sélection, un tap coche tout ce lot (ses lignes prêtes). */}
          {selecting ? (
            <button
              type="button"
              onClick={() => setChecked(new Set(section.rows.filter(cochable).map((r) => articleOf(r)!)))}
              className="pressable inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-3 text-[13px] font-semibold text-ink active:bg-ground"
            >
              Cocher cette partie
            </button>
          ) : (
            <span className="text-[13px] font-bold text-muted">
              {section.rows.length} ligne{section.rows.length > 1 ? "s" : ""}
            </span>
          )}
        </h4>
      ) : null}
      <ul aria-label={section.label ? `Fournitures · ${section.label}` : "Fournitures"} className="flex flex-col gap-2">
        {section.rows.map((r) => (
          <Row
            key={r.key}
            {...(selection && articleOf(r) && selection.sent.has(articleOf(r)!) ? { sentTo: selection.sent.get(articleOf(r)!)! } : {})}
            {...(selecting
              ? {
                  selectMode: {
                    checked: checked.has(articleOf(r) ?? ""),
                    // Une ligne orange se vérifie d'abord ; une ligne sans article (question) ne part pas ; au groupé, une
                    // ligne déjà proposée non plus (une ligne déjà envoyée à part reste décochée, pas grisée).
                    disabled: !articleOf(r) || r.status === "check" || (pourGroupe && !cochable(r)),
                    ...(pourGroupe && vagueRow(r) ? { note: takeoff.phrasePrecision ?? "à préciser d'abord" } : {}),
                    ...(pourGroupe ? { label: groupe?.mode === "mois" ? "Ajouter à la commande" : `Ajouter à la ${nom}` } : {}),
                    onToggle: () =>
                      setChecked((prev) => {
                        const next = new Set(prev);
                        const k = articleOf(r)!;
                        if (next.has(k)) next.delete(k);
                        else next.add(k);
                        return next;
                      }),
                  },
                }
              : {})}
            row={r}
            takeoff={takeoff}
            label={labelOf(r)}
            editable={editable}
            pending={pending}
            handlers={handlers}
            decision={r.decisionKey ? decisions.get(r.decisionKey) : undefined}
            onEdit={onEditItem}
            onSetAside={() => putAside(r)}
            error={error}
            sketches={sketches.filter((s) => r.itemKey && s.article === r.itemKey)}
            {...(sketchHandlers ? { sketchHandlers } : {})}
          />
        ))}
      </ul>
      </div>
      ))}
      {/* Nouveau cap (22 octobre) : un gros « + Ajouter » sous les cartes (avant : un petit lien sous l'envoi). */}
      {editable && onAdd && !selecting ? (
        <button
          type="button"
          onClick={onAdd}
          aria-label="Ajouter un article"
          className="pressable mt-2 flex min-h-13 w-full items-center justify-center gap-2 rounded-full border border-line bg-surface text-[16px] font-semibold text-ink active:bg-ground"
        >
          <Plus size={22} strokeWidth={2.6} aria-hidden="true" />
          Ajouter
        </button>
      ) : null}
      {/* §49.9 : les lignes du devis sans fourniture (heures, forfait, évacuation) ne sont pas dans la liste et ne partent
          jamais ; repliées, fermées par défaut, pour que l'artisan voie qu'elles ont été lues. */}
      {takeoff.sansFourniture && takeoff.sansFourniture.length > 0 ? (
        <details className="group mt-3 rounded-2xl px-1">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-1.5 text-[13px] font-bold text-muted">
            {takeoff.sansFourniture.length} ligne{takeoff.sansFourniture.length > 1 ? "s" : ""} sans fourniture
            <ChevronDown size={15} aria-hidden="true" className="transition-transform group-open:rotate-180" />
          </summary>
          <ul aria-label="Lignes sans fourniture" className="flex flex-col gap-1.5 pt-1 pb-1">
            {takeoff.sansFourniture.map((l) => (
              <li key={l.lineId} className="flex items-baseline justify-between gap-3 text-[13px] leading-snug text-muted">
                <span className="min-w-0">{l.label}</span>
                {l.measure ? <span className="shrink-0 font-bold">{l.measure}</span> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {/* Retour du fondateur (2026-10-10) : « il pourra envoyer le reste de la fourniture vers un autre fournisseur ». Dès
          qu'une part est partie, la liste dit la répartition et propose le reste, déjà coché, à un autre fournisseur. */}
      {selection && selection.parts.length > 0 && !selecting ? (
        <section aria-label="Commande répartie" className="mt-3 flex flex-col gap-2 rounded-xl bg-surface p-3 shadow-card">
          <h3 className="text-[13px] font-extrabold text-muted">Commande répartie</h3>
          <ul className="flex flex-col gap-1">
            {selection.parts.map((p) => (
              <li key={p.supplierId} className="flex items-center gap-2 text-[15px] font-bold">
                <Check size={16} className="shrink-0 text-ok" aria-hidden="true" />
                <span>{`${p.name} · ${p.lines} ligne${p.lines > 1 ? "s" : ""}`}</span>
              </li>
            ))}
          </ul>
          {unsent.length > 0 ? (
            <>
              {editable ? (
                <Button variant="secondary" className="w-full" onClick={startSelecting}>
                  <Send size={18} aria-hidden="true" />
                  {`Envoyer le reste (${unsent.length} ligne${unsent.length > 1 ? "s" : ""})`}
                </Button>
              ) : null}
              {unsentToCheck > 0 ? <p className="text-[13px] text-muted">{`Dont ${unsentToCheck} à vérifier d'abord.`}</p> : null}
            </>
          ) : (
            <p className="text-[14px] text-muted">Toute la liste est partie.</p>
          )}
        </section>
      ) : null}

      {/* §50.3 : en bas, l'aperçu et l'envoi ; dessous, en petit, les autres gestes. Seuls les deux boutons restent collés en
          bas ; les liens suivent la liste, jamais par-dessus. */}
      {groupe && !selecting ? groupe.mode === "mois" ? <MesLignesDuMois groupe={groupe} /> : <GroupeSection groupe={groupe} /> : null}
      {selecting && pourGroupe && groupe && groupe.mode === "mois" ? (
        <div className={`sticky z-10 mt-2 fade-ground pt-6 ${docked ? "bottom-[68px] pb-5 lg:bottom-[70px]" : "bottom-0 pb-[max(12px,env(safe-area-inset-bottom))]"}`}>
          <CommandeDuMoisBar
            count={checked.size}
            de={groupe.mois?.prochaine?.de ?? "en cours"}
            phrase={groupe.mois?.phrases.sansEngagement ?? ""}
            onCancel={stopSelecting}
            onAdresse={groupe.adresse}
            onDeposer={async (nature) => {
              setMessageMois(await groupe.deposer([...checked], nature));
              stopSelecting();
              setChecked(new Set());
            }}
          />
        </div>
      ) : selecting && pourGroupe && groupe ? (
        <div className={`sticky z-10 mt-2 fade-ground pt-6 ${docked ? "bottom-[68px] pb-5 lg:bottom-[70px]" : "bottom-0 pb-[max(12px,env(safe-area-inset-bottom))]"}`}>
          <GroupeBar
            count={checked.size}
            onCancel={stopSelecting}
            onAdresse={groupe.adresse}
            onPropose={async (fenetre, statut, engagement) => {
              await groupe.proposer([...checked], fenetre, statut, engagement);
              stopSelecting();
              setChecked(new Set());
            }}
          />
        </div>
      ) : selecting && selection ? (
        <div className={`sticky z-10 mt-2 fade-ground pt-6 ${docked ? "bottom-[68px] pb-5 lg:bottom-[70px]" : "bottom-0 pb-[max(12px,env(safe-area-inset-bottom))]"}`}>
          <SelectionBar
            count={checked.size}
            alreadyServed={selection.parts.map((p) => p.supplierId)}
            onCancel={stopSelecting}
            onSend={async (supplierIds) => {
              await selection.send([...checked], supplierIds);
              setSelecting(false);
              setChecked(new Set());
            }}
          />
        </div>
      ) : (
        <>
          {/* RIEN NE PART VIDE : sans aucune fourniture (un devis de main-d'œuvre seule), pas de bouton d'envoi. */}
          {editable && rows.length > 0 ? (
            // Retour du fondateur (2026-10-10) : « deux boutons flottants d'actions en bas (figé), un pour l'envoi et l'autre pour
            // prévisualiser le PDF et le mail envoyé », TOUJOURS là (« je ne vois toujours pas les deux boutons ») : avec des lignes
            // orange, l'aperçu s'ouvre quand même et « Envoyer » mène à la première ligne à régler (rien ne part avant).
            <div
              role="group"
              aria-label="Envoyer la liste"
              className={`sticky z-10 mt-2 flex flex-wrap gap-2 fade-ground pt-6 ${docked ? "bottom-[68px] pb-3 lg:bottom-[70px]" : "bottom-0 pb-[max(8px,env(safe-area-inset-bottom))]"}`}
            >
              {onPreview ? (
                <Button variant="secondary" className="shrink-0 px-3.5 text-[15px]" onClick={onPreview}>
                  <Eye size={18} aria-hidden="true" />
                  Aperçu
                </Button>
              ) : null}
              {sent ? (
                <Button className="min-w-0 flex-1 px-3" variant="secondary" onClick={onSend}>
                  <Send size={18} aria-hidden="true" />
                  Voir la demande envoyée
                </Button>
              ) : (
                <Button
                  className="min-w-0 flex-1 gap-1.5 px-3 text-[15px] whitespace-nowrap shadow-card!"
                  pending={pending}
                  onClick={() => {
                    if (toCheck.length === 0) return onSend();
                    setBlocked(true);
                    document.getElementById(`ligne-${ordered[0]!.key}`)?.scrollIntoView?.({ block: "center", behavior: "smooth" });
                  }}
                >
                  {/* Sur un iPhone étroit, l'icône cède sa place pour que le texte tienne sur une ligne. */}
                  <Send size={18} aria-hidden="true" className="hidden min-[400px]:block" />
                  Envoyer aux négoces
                </Button>
              )}
              {blocked && toCheck.length > 0 && !sent ? (
                <p role="status" className="w-full text-center text-[13px] font-bold text-warn">
                  {`Règle d'abord ${toCheck.length} ligne${toCheck.length > 1 ? "s" : ""} orange.`}
                </p>
              ) : null}
            </div>
          ) : null}

        </>
      )}
    </section>
  );
}

const toNumber = (q: string) => Number(q.replace(/\s/g, "").replace(",", "."));
const shownNumber = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/**
 * Plus / moins sur la quantité d'une ligne orange (§48) : chaque appui bouge d'une unité, la quantité part une seconde
 * après le dernier appui (une seule correction au journal, pas une par appui).
 */
function Stepper({ label, value, unit, pending, onChange }: { label: string; value: number; unit: string; pending: boolean; onChange: (n: number) => Promise<void> }) {
  const [n, setN] = useState(value);
  const [seen, setSeen] = useState(value);
  // La liste revient du serveur avec une autre quantité : elle remplace la nôtre.
  if (value !== seen) {
    setSeen(value);
    setN(value);
  }
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const bump = (d: number) => {
    const next = Math.max(0, Math.round((n + d) * 100) / 100);
    setN(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void onChange(next), 1000);
  };
  const btn = "flex size-9 items-center justify-center rounded-full bg-ground text-[19px] font-extrabold leading-none active:scale-90 disabled:opacity-40";
  return (
    <span role="group" aria-label={`Quantité : ${label}`} className="flex min-w-0 items-center gap-2">
      <span className="flex shrink-0 items-center gap-1">
        <button type="button" className={btn} disabled={pending || n <= 0} onClick={() => bump(-1)} aria-label={`Moins : ${label}`}>
          −
        </button>
        <span className="min-w-[2.6rem] text-center text-[15px] font-extrabold tabular-nums" aria-live="polite">
          {shownNumber(n)}
        </span>
        <button type="button" className={btn} disabled={pending} onClick={() => bump(1)} aria-label={`Plus : ${label}`}>
          +
        </button>
      </span>
      {unit ? <span className="min-w-0 truncate text-[13px] font-bold text-muted">{enMetres(unit)}</span> : null}
    </span>
  );
}

/**
 * Le repère dit l'état d'un coup d'œil (§50.3) : une coche verte franche, prête à commander ; un point orange vif, à
 * préciser (retour du fondateur, 2026-10-12 : « vert franc, pas pâle », « orange vif, pas marron »).
 */
const DOT: Record<ScreenRow["status"], { ok: boolean; label: string }> = {
  ok: { ok: true, label: "sûr" },
  check: { ok: false, label: "à vérifier" },
  // §50.3 : vert ou orange, rien d'autre ; une ligne laissée au fournisseur est prête à partir.
  supplier: { ok: true, label: "sûr" },
};

/** La case de la ligne : cochée en vert franc (prête), vide au bord orange vif (à valider). */
function Box({ checked }: { checked: boolean }) {
  return checked ? (
    <span aria-hidden="true" className="flex size-[22px] shrink-0 items-center justify-center rounded-md bg-mark-ok text-white">
      <Check size={15} strokeWidth={3.5} />
    </span>
  ) : (
    <span aria-hidden="true" className="size-[22px] shrink-0 rounded-md border-[2.5px] border-mark-warn bg-surface" />
  );
}

function StatusMark({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="mt-px shrink-0" role="img" aria-label={label}>
      <Box checked={ok} />
    </span>
  );
}

const FIELD = "min-h-11 w-full min-w-0 rounded-xl border-2 border-line bg-surface px-3 text-[15px] outline-none focus:border-accent";

/** Un texte qui se corrige sur place (le nom d'une ligne, une ligne du bref) : un tap, la case, « OK ». */
function InlineText({ label, value, pending, onSave, onCancel }: { label: string; value: string; pending: boolean; onSave: (v: string) => Promise<void>; onCancel: () => void }) {
  const id = useId();
  const [text, setText] = useState(value);
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim() && text.trim() !== value) void onSave(text.trim());
        else onCancel();
      }}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input id={id} autoFocus value={text} onChange={(e) => setText(e.target.value)} className={FIELD} />
      <Button type="submit" className="min-h-11 shrink-0 px-4" pending={pending}>
        OK
      </Button>
    </form>
  );
}

/** §50.7 : une ligne du chantier en bref ; un tap la corrige, la corbeille la retire (au document comme chez le fournisseur). */
/**
 * « Le chantier en bref » (retour du fondateur, 2026-10-11) : UN texte descriptif, en un bloc, le même que chez le
 * fournisseur. « Modifier le bref » ouvre ses lignes : chacune se corrige ou se retire, le texte suit (et le calcul aussi,
 * §51). Le client et l'adresse n'y sont que si l'artisan coche la case : un négoce n'en a pas besoin pour chiffrer.
 */
function Brief({ takeoff, editable, pending, onBrief }: { takeoff: Takeoff; editable: boolean; pending: boolean; onBrief: ((cle: string, texte: string) => Promise<void>) | undefined }) {
  const [editing, setEditing] = useState(false);
  const id = useId();
  const texte = takeoff.brefTexte || (takeoff.bref ?? []).map((l) => l.texte).join(". ");
  return (
    <section aria-label="Le chantier en bref" className="mb-4 flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-extrabold text-muted">Le chantier en bref</h3>
        {editable ? (
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            aria-label={editing ? "Terminer" : "Modifier le bref"}
            className="inline-flex min-h-10 items-center gap-1.5 text-[13px] font-bold text-accent-text"
          >
            {editing ? <Check size={15} aria-hidden="true" /> : <Pencil size={14} aria-hidden="true" />}
            {editing ? "Terminer" : "Modifier"}
          </button>
        ) : null}
      </div>
      <div className="rounded-xl border border-line bg-surface px-4 py-4">
        <p className="text-[15px] leading-relaxed text-ink">{texte}</p>
        {editing ? (
          <div className="mt-3 flex flex-col gap-2 border-t border-line pt-2">
            <ul className="flex flex-col divide-y divide-line">
              {(takeoff.bref ?? []).map((l) => (
                <BriefLine key={l.cle} text={l.texte} editable pending={pending} onSave={(t) => onBrief!(l.cle, t)} />
              ))}
            </ul>
            <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-[14px] font-bold">
              <input
                id={id}
                type="checkbox"
                checked={takeoff.brefAvecClient === true}
                disabled={pending}
                onChange={(e) => void onBrief!("avec-client", e.target.checked ? "oui" : "")}
                className="size-5 shrink-0 accent-accent"
              />
              Ajouter le nom du client et l&apos;adresse
            </label>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function BriefLine({ text, editable, pending, onSave }: { text: string; editable: boolean; pending: boolean; onSave: (t: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  if (editing)
    return (
      <li className="flex flex-col gap-2 py-2">
        <InlineText label={`Modifier le bref : ${text}`} value={text} pending={pending} onCancel={() => setEditing(false)} onSave={async (t) => void (await onSave(t), setEditing(false))} />
        <button type="button" onClick={() => void onSave("")} className="inline-flex min-h-10 items-center gap-1.5 self-start text-[13px] font-bold text-danger">
          <Trash2 size={15} aria-hidden="true" />
          Retirer du bref
        </button>
      </li>
    );
  return (
    <li className="flex min-h-11 items-center">
      {editable ? (
        <button type="button" onClick={() => setEditing(true)} aria-label={`Modifier le bref : ${text}`} className="flex min-h-11 w-full items-center text-left text-[14px] leading-snug">
          {text}
        </button>
      ) : (
        <span className="text-[14px] leading-snug">{text}</span>
      )}
    </li>
  );
}

/**
 * §50.7 : une ligne du document. Fermée : le point, le nom, la quantité ; si orange, sa raison en cinq mots. Un tap l'ouvre
 * (moins / plus, boutons de choix, « C'est bon », corbeille) ; ouverte, un tap sur le nom le corrige ; un glissement vers la
 * gauche la retire. Aucun écran intermédiaire.
 */
function Row({
  row,
  takeoff,
  label,
  editable,
  pending,
  handlers,
  decision,
  onEdit,
  onSetAside,
  sketches,
  sketchHandlers,
  selectMode,
  sentTo,
  error = null,
}: {
  error?: ApiError | null;
  /** §48.5 : mode sélection, une case à cocher à la place du point ; toucher la ligne la coche. */
  selectMode?: { checked: boolean; disabled: boolean; onToggle: () => void; /** Ce que la case fait (« Proposer au groupé »), « Envoyer à part » sinon. */ label?: string; /** Pourquoi la case est grisée. */ note?: string };
  /** §48.5 : déjà envoyée à part (« Envoyé · fournisseur »), toujours visible dans la liste. */
  sentTo?: string;
  row: ScreenRow;
  takeoff: Takeoff;
  label: string;
  editable: boolean;
  pending: boolean;
  handlers: DecisionHandlers;
  /** La remarque qui met la ligne en orange : elle se règle dans la ligne ouverte (§49.8). */
  decision?: TakeoffDecision | undefined;
  /** Les questions de cette ligne posées sur une autre ligne (clé → nom de la ligne qui porte les boutons). */
  onEdit: (item: PurchaseItem, edit: ItemEdit) => Promise<void>;
  onSetAside: () => void;
  sketches: readonly ItemSketch[];
  sketchHandlers?: SketchHandlers;
}) {
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [dx, setDx] = useState(0);
  // Une ligne orange réglée (« C'est bon », un choix) se referme d'elle-même : le flou derrière elle s'en va avec elle.
  const [seenStatus, setSeenStatus] = useState(row.status);
  if (row.status !== seenStatus) {
    setSeenStatus(row.status);
    if (seenStatus === "check" && open) {
      setOpen(false);
      setNaming(false);
    }
  }
  const start = useRef<{ x: number; y: number } | null>(null);
  // Un glissement n'est pas un appui : il n'ouvre pas la ligne.
  const swiped = useRef(false);
  const file = useRef<HTMLInputElement>(null);
  const item = row.itemKey ? takeoff.purchase.toBuy.find((b) => b.key === row.itemKey) : undefined;
  const quote = row.quoteKey ? takeoff.purchase.toQuote.find((q) => q.key === row.quoteKey) : undefined;
  const ajuste = item ? takeoff.ajustements?.find((a) => a.itemKey === item.key) : undefined;
  const lines = row.lineIds.map((id) => takeoff.lines.find((l) => l.id === id)).filter((l): l is Takeoff["lines"][number] => Boolean(l));
  const raw = item?.quantity ?? quote?.measure ?? row.pending?.quantity ?? null;
  const quantity = raw ? enMetres(raw) : null;
  // Nouveau cap (22 octobre) : une ligne prête mais vague (sans format, origine, choix ou marque) a sa pastille orange et
  // « Précise pour trouver d'autres couvreurs » ; ses questions en boutons. Elle part quand même chez le négoce.
  const vague = !sentTo && editable && row.status !== "check" && (item?.aPreciserPourGroupe?.length ?? 0) > 0;
  const sub = sentTo ? `Envoyé · ${sentTo}` : row.status === "check" ? (row.reason ?? "À vérifier") : vague ? (takeoff.phrasePrecision ?? "Précise pour trouver d'autres couvreurs") : null;
  const dot = sentTo ? DOT.supplier : vague ? { ok: false, label: "à préciser" } : DOT[row.status];
  const parsed = item?.quantity ? parseQuantity(item.quantity) : null;
  const stepper = editable && !sentTo && item && parsed && Number.isFinite(toNumber(parsed.quantity)) ? { value: toNumber(parsed.quantity), unit: parsed.unit } : null;
  const removable = editable && (row.itemKey !== undefined || row.lineIds.length > 0);
  // Le nom se corrige sur l'article, sinon sur la ligne du devis (une seule) d'où vient la ligne.
  const nameLine = !item && lines.length === 1 ? lines[0] : undefined;
  const renamable = editable && !sentTo && (item !== undefined || nameLine !== undefined);
  const opens = editable && !sentTo;
  // Une ligne orange qui se valide d'un geste (« C'est bon », garder la quantité du devis) ; jamais une question à trancher.
  const quick = row.status === "check" && decision?.primary && decision.primary.action !== "edit" && decision.primary.action !== "answer" && !decision.key.startsWith(AI_ADDITION);
  const onPointerDown = (e: React.PointerEvent) => {
    swiped.current = false;
    if (!removable || open) return;
    start.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const x = e.clientX - start.current.x;
    if (Math.abs(e.clientY - start.current.y) > Math.abs(x)) return;
    if (x < -8) swiped.current = true;
    setDx(Math.min(0, x));
  };
  const onPointerEnd = () => {
    if (!start.current) return;
    start.current = null;
    if (dx < -90) onSetAside();
    setDx(0);
  };
  // La réponse à une question de précision s'écrit dans la désignation (« Ardoise naturelle » → « … 32×22 »).
  const preciser = async (cle: string, valeur: string) => {
    const v = valeur.trim();
    if (!item || !v) return;
    const dit = cle === "developpe" && /^\d+$/.test(v) ? `dév. ${v}` : v;
    await onEdit(item, { libelle: `${item.label.trim()} ${dit}`, quantite: parsed?.quantity ?? null, unite: parsed?.unit ?? null });
  };
  const rename = async (name: string) => {
    if (item) await onEdit(item, { libelle: name, quantite: parsed?.quantity ?? null, unite: parsed?.unit ?? null });
    else if (nameLine) await handlers.onSaveLine(nameLine.id, { designation: name, quantity: nameLine.quantity, unit: nameLine.unit, reference: nameLine.reference });
    setNaming(false);
  };

  const body = (
    <>
      {opens ? null : <StatusMark ok={dot.ok} label={dot.label} />}
      <span className="flex min-w-0 grow flex-col">
        {/* Le nom entier : c'est ce que le comptoir lit (jamais coupé). Sur téléphone, la quantité passe dessous. */}
        <span className="text-[14px] leading-snug font-semibold">{label}</span>
        {quantity || sub ? (
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-[13px] leading-snug">
            {quantity ? <span className="shrink-0 text-[14px] font-extrabold tabular-nums sm:hidden">{quantity}</span> : null}
            {sub ? <span className={`min-w-0 ${sentTo ? "font-bold text-muted" : "font-bold text-warn"}`}>{sub}</span> : null}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 text-right text-[15px] font-extrabold whitespace-nowrap tabular-nums max-sm:hidden">{quantity ?? ""}</span>
    </>
  );
  // §48.5 : en mode sélection, la ligne entière coche sa case ; rien d'autre ne s'ouvre.
  if (selectMode) {
    return (
      <li id={`ligne-${row.key}`} className={`rounded-xl border border-[#dde1e8] px-3 py-2 ${selectMode.checked ? "bg-accent/5" : "bg-surface"} ${selectMode.disabled ? "opacity-60" : ""}`}>
        <label className={`flex min-h-11 items-start gap-2.5 ${selectMode.disabled ? "" : "cursor-pointer"}`}>
          <input
            type="checkbox"
            checked={selectMode.checked}
            disabled={selectMode.disabled}
            onChange={selectMode.onToggle}
            aria-label={`${selectMode.label ?? "Envoyer à part"} : ${label}`}
            className="mt-0.5 size-5 shrink-0 accent-accent"
          />
          <span className="flex min-w-0 grow flex-col">
            <span className="text-[14px] leading-snug font-semibold">{label}</span>
            <span className="text-[13px] leading-snug text-muted">
              {quantity ? <span className="font-extrabold text-ink tabular-nums">{quantity}</span> : null}
              {row.status === "check" ? `${quantity ? " · " : ""}à vérifier d'abord` : selectMode.note ? `${quantity ? " · " : ""}${selectMode.note}` : sentTo ? `${quantity ? " · " : ""}Envoyé · ${sentTo}` : ""}
            </span>
          </span>
        </label>
      </li>
    );
  }
  return (
    <li
      id={`ligne-${row.key}`}
      className={`relative flex scroll-mt-24 flex-col gap-2 overflow-hidden rounded-xl border border-line bg-surface px-3 py-2 transition-[background-color,box-shadow] duration-200 ${
        open ? "z-[51] shadow-[0_24px_60px_-12px_rgba(16,24,40,0.45)]" : ""
      }`}
    >
      {/* Retour du fondateur (2026-10-11) : la ligne ouverte passe au premier plan, le reste est flouté derrière ; un tap sur le
          flou la referme. */}
      {open && typeof document !== "undefined"
        ? createPortal(
            <button
              type="button"
              aria-label="Fermer la ligne ouverte"
              onClick={() => {
                setNaming(false);
                setOpen(false);
              }}
              className="fixed inset-0 z-50 cursor-default bg-[#0e1116]/35 backdrop-blur-[3px]"
            />,
            document.body,
          )
        : null}
      {dx < 0 ? (
        <span aria-hidden="true" className="absolute inset-y-0 right-0 flex items-center bg-danger px-4 text-sm font-extrabold text-white">
          Retirer
        </span>
      ) : null}
      <div
        className={`relative ${open ? "" : "bg-surface"}`}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {opens ? (
          <div className="flex min-w-0 items-start gap-1">
            {/* La case à cocher de la ligne (retour du fondateur, 2026-10-12) : verte cochée, la ligne est prête ; vide, un tap
                la valide (« C'est bon », la quantité du devis gardée) ou, s'il reste une question, ouvre la ligne sur elle. */}
            {dot.ok ? (
              <span className="flex size-11 shrink-0 items-start justify-center pt-2.5" role="img" aria-label={dot.label}>
                <Box checked />
              </span>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (quick) void handlers.onDecide(decision!);
                  else {
                    setNaming(false);
                    setOpen(true);
                  }
                }}
                aria-label={quick ? `Valider : ${label}` : `À préciser, ouvrir : ${label}`}
                className="flex size-11 shrink-0 items-start justify-center rounded-full pt-2.5 active:bg-warn/10 disabled:opacity-50"
              >
                <Box checked={false} />
              </button>
            )}
            {dot.ok ? null : <span className="sr-only" role="img" aria-label={dot.label} />}
            <button
              type="button"
              onClick={() => {
                if (swiped.current) return void (swiped.current = false);
                setNaming(false);
                setOpen(!open);
              }}
              aria-expanded={open}
              aria-label={`${open ? "Fermer" : "Modifier"} : ${label}`}
              className="flex min-h-11 min-w-0 grow items-start gap-2.5 text-left"
            >
              {body}
            </button>
            {/* Ouverte, le crayon devient une croix : on voit comment refermer (retour du fondateur, 2026-10-10). */}
            <button
              type="button"
              onClick={() => {
                setNaming(false);
                setOpen(!open);
              }}
              aria-label={`${open ? "Fermer la ligne" : "Modifier la ligne"} : ${label}`}
              className={`pressable flex size-11 shrink-0 items-center justify-center rounded-full active:bg-ground ${open ? "border border-line bg-surface text-ink" : "text-muted"}`}
            >
              {open ? <X size={20} aria-hidden="true" /> : <Pencil size={18} aria-hidden="true" />}
            </button>
          </div>
        ) : (
          <div className="flex min-h-11 w-full min-w-0 items-start gap-2.5">{body}</div>
        )}
      </div>
      {open ? (
        <div role="group" aria-label={`Ligne ouverte : ${label}`} className="flex flex-col gap-2 pb-2 pl-5">
          {/* Retour du fondateur (2026-10-10) : « quand je clique sur un bouton, rien ne se passe ». Un geste refusé se dit ici. */}
          {error ? <ErrorNotice error={error} /> : null}
          {/* §51.6 (retour du fondateur, 2026-10-12) : une ligne orange se règle là où on l'ouvre : sa question d'abord. */}
          {row.status === "check" ? <CardActions label={label} decision={decision} item={item} pending={pending} handlers={handlers} onEdit={onEdit} /> : null}
          {vague && item ? <PrecisionActions label={label} questions={item.aPreciserPourGroupe ?? []} pending={pending} onAnswer={preciser} /> : null}
          {renamable ? (
            naming ? (
              <InlineText label={`Nom : ${label}`} value={item?.label ?? nameLine?.article ?? nameLine?.designation ?? label} pending={pending} onCancel={() => setNaming(false)} onSave={rename} />
            ) : (
              <button type="button" onClick={() => setNaming(true)} aria-label={`Modifier le nom : ${label}`} className="inline-flex min-h-10 items-center gap-1.5 self-start text-[13px] font-bold text-accent-text">
                <Pencil size={14} aria-hidden="true" />
                Modifier le nom
              </button>
            )
          ) : null}
          {stepper ? (
            <Stepper label={label} value={stepper.value} unit={stepper.unit} pending={pending} onChange={(n) => onEdit(item!, { libelle: item!.label, quantite: String(n), unite: stepper.unit || null })} />
          ) : null}
          {sketches.length > 0 ? (
            <ul aria-label={`Croquis joints : ${label}`} className="flex flex-wrap gap-2">
              {sketches.map((sk) => (
                <li key={sk.id} className="flex max-w-full items-center gap-1 rounded-xl bg-surface pl-2.5 text-[13px] font-bold text-accent-text">
                  <button type="button" onClick={() => void openDocument(sk.id, sk.nom, sk.nom)} className="flex min-h-9 min-w-0 items-center gap-1.5 text-left">
                    <Paperclip size={14} aria-hidden="true" className="shrink-0" />
                    <span className="truncate">{sk.commentaire ? `${sk.nom} · ${sk.commentaire}` : sk.nom}</span>
                  </button>
                  {sketchHandlers ? (
                    <button type="button" disabled={pending} onClick={() => void sketchHandlers.onDetach(sk.id)} aria-label={`Retirer le croquis ${sk.nom}`} className="flex size-9 shrink-0 items-center justify-center text-accent-text/70">
                      <X size={14} aria-hidden="true" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4">
            {item && sketchHandlers ? (
              <>
                <input
                  ref={file}
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  aria-label={`Joindre un croquis : ${label}`}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void sketchHandlers.onAttach(item.key, f, "");
                    e.target.value = "";
                  }}
                />
                <button type="button" onClick={() => file.current?.click()} className="inline-flex min-h-10 items-center gap-1.5 text-[13px] font-bold text-accent-text">
                  <Paperclip size={14} aria-hidden="true" />
                  Joindre un croquis
                </button>
              </>
            ) : null}
            {removable ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSetAside();
                }}
                className="inline-flex min-h-10 items-center gap-1.5 text-[13px] font-bold text-danger"
              >
                <Trash2 size={15} aria-hidden="true" />
                Retirer de la liste
              </button>
            ) : null}
          </div>
          {/* Un geste clair pour refermer la ligne, en bas, là où le pouce arrive. */}
          <Button
            variant="secondary"
            className="min-h-11 w-full"
            onClick={() => {
              setNaming(false);
              setOpen(false);
            }}
          >
            <ChevronUp size={18} aria-hidden="true" />
            Fermer
          </Button>
        </div>
      ) : null}
      {/* L'apprentissage (24 octobre 2026) : une ligne ajustée par une habitude le dit, et s'annule d'un clic. */}
      {ajuste && editable && !sentTo && !open ? (
        <div className="flex flex-wrap items-center gap-x-3 pl-12 text-[13px] leading-snug">
          <span className="font-semibold text-muted">{ajuste.texte}</span>
          <button type="button" disabled={pending} onClick={() => void handlers.onAnswer(`habitude:${ajuste.itemKey}`, "non")} className="min-h-11 font-bold underline disabled:opacity-50" aria-label={`Annuler l'ajustement : ${label}`}>
            Annuler
          </button>
        </div>
      ) : null}
    </li>
  );
}

/** Ajout proposé par l'appel IA n° 2 : jamais vert d'office, il attend un oui ou un non. */
const AI_ADDITION = "ia-ajout:";

/** Une quantité tapée par l'artisan, au format du serveur (« 1 234,5 » → « 1234.5 »). */
const plainNumber = (q: string) => q.replace(/[\s  ]/g, "").replace(",", ".");
const OPTION = "pressable inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-surface px-4 text-[14px] font-semibold active:border-accent active:bg-accent/10 disabled:opacity-60";

/**
 * §49.8 : CE QUI RÈGLE UNE LIGNE ORANGE, DANS SA CARTE. Un geste, jamais un autre écran : les choix en boutons (un tap,
 * la ligne se recalcule et passe au vert), un écart en deux boutons (« Garder 20 » / « Mettre 21 »), sinon « C'est bon ».
 */
function CardActions({
  label,
  decision: d,
  item,
  pending,
  handlers,
  onEdit,
}: {
  label: string;
  decision: TakeoffDecision | undefined;
  item: PurchaseItem | undefined;
  pending: boolean;
  handlers: DecisionHandlers;
  onEdit: (item: PurchaseItem, edit: ItemEdit) => Promise<void>;
}) {
  const id = useId();
  const [value, setValue] = useState("");
  const [written, setWritten] = useState<string | null>(null);
  const [other, setOther] = useState("");
  const q = d?.question;
  // Une question encore ouverte (avant le calcul) répond à sa décision ; après, la ligne porte ses propres choix.
  const asks: { key: string; text: string; unit: string | null; options: { label: string; value: string }[] }[] =
    d && q?.options.length ? [{ key: d.key, text: d.text.replace(/ Cela change la commande :.*$/, "").replace(/\s*\?$/, ""), unit: null, options: q.options }] : (item?.asks ?? []);
  const answer = (key: string, unit: string | null, v: string) => handlers.onAnswer(key, unit ? { value: v, unit } : v);
  const gap = d && item?.gap ? item.gap : null;
  const parsed = item?.quantity ? parseQuantity(item.quantity) : null;
  const done = d && d.primary && d.primary.action !== "edit" && !d.key.startsWith(AI_ADDITION);
  const btn = "min-h-11 flex-1 basis-[9rem]";
  return (
    <div role="group" aria-label={`Régler : ${label}`} aria-busy={pending || undefined} className="flex flex-col gap-2">
      {asks.map((a) => (
        // Retour du fondateur (2026-10-11) : « je ne sais pas quoi faire, on doit comprendre sans réfléchir ». La carte dit la
        // question en toutes lettres, puis ses réponses ; une question partagée avec d'autres lignes est posée sur chacune
        // (une réponse les règle toutes).
        <div key={a.key} role="group" aria-label={a.text} className="flex flex-col gap-1.5">
          <p className="text-[15px] leading-snug font-extrabold">{`${a.text} ?`}</p>
          <div className="flex flex-wrap gap-1.5">
            {a.options.map((o) => (
              <button key={o.value || "aucun"} type="button" disabled={pending} onClick={() => void answer(a.key, a.unit, o.value)} className={`${OPTION} grow`}>
                {o.label}
              </button>
            ))}
            {/* « Autre » partout où il y a des boutons (§51.2) : ce qui s'écrit répond à la question de la ligne. */}
            {written === a.key ? null : (
              <button type="button" disabled={pending} onClick={() => setWritten(a.key)} className={`${OPTION} grow border-dashed`}>
                Autre
              </button>
            )}
          </div>
          {written === a.key ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const v = other.trim();
                if (v) void answer(a.key, a.unit, a.unit ? plainNumber(v) : v);
              }}
            >
              <input
                aria-label={`Autre : ${a.text}`}
                autoFocus
                value={other}
                maxLength={300}
                onChange={(e) => setOther(e.target.value)}
                placeholder="Écris ta réponse"
                {...(a.unit ? { inputMode: "decimal" as const } : {})}
                className="min-h-12 w-full min-w-0 rounded-xl border border-line bg-surface px-3 text-[16px] outline-none focus:border-accent"
              />
              <Button type="submit" className="shrink-0" pending={pending}>
                OK
              </Button>
            </form>
          ) : null}
        </div>
      ))}
      {d && q && q.kind === "param" && q.options.length === 0 ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = plainNumber(value.trim());
            if (/^\d+(?:\.\d+)?$/.test(v)) void handlers.onAnswer(d.key, { value: v, unit: q.unit ?? "u" });
          }}
        >
          <label htmlFor={id} className="sr-only">
            {d.text}
          </label>
          <span className="flex min-w-0 grow items-center gap-1 rounded-xl border border-line bg-surface px-3 focus-within:border-accent">
            <input id={id} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className="min-h-10 w-full min-w-0 bg-transparent text-[15px] font-extrabold outline-none" />
            {q.unit && q.unit !== "u" ? <span className="text-[13px] font-bold text-muted">{q.unit === "m2" ? "m²" : q.unit}</span> : null}
          </span>
          <Button type="submit" className="shrink-0" pending={pending}>
            OK
          </Button>
        </form>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {gap && d && item ? (
          <>
            <button type="button" disabled={pending} className={`${OPTION} flex-1`} onClick={() => void handlers.onDecide(d)} aria-label={`Garder ${gap.written} : ${label}`}>
              Garder {gap.written}
            </button>
            <button
              type="button"
              disabled={pending}
              className={`${OPTION} flex-1`}
              onClick={() => void onEdit(item, { libelle: item.label, quantite: plainNumber(gap.computed), unite: parsed?.unit || gap.unit || null })}
              aria-label={`Mettre ${gap.computed} : ${label}`}
            >
              Mettre {gap.computed}
            </button>
          </>
        ) : done ? (
          <Button className={btn} variant="secondary" pending={pending} onClick={() => void handlers.onDecide(d)} aria-label={`C'est bon : ${label}`}>
            <Check size={18} aria-hidden="true" />
            C&apos;est bon
          </Button>
        ) : null}
        {d?.suggestion && item ? (
          <Button
            className={btn}
            variant="secondary"
            pending={pending}
            onClick={async () => {
              // La remarque est levée d'abord (au journal), puis l'article prend la désignation proposée.
              await handlers.onDecide(d);
              await onEdit(item, { libelle: d.suggestion!.label, quantite: d.suggestion!.quantity ?? parsed?.quantity ?? null, unite: d.suggestion!.unit ?? parsed?.unit ?? null });
            }}
          >
            Remplacer par : {d.suggestion.label}
          </Button>
        ) : null}
        {d?.key.startsWith(AI_ADDITION) ? (
          <>
            <Button className={btn} pending={pending} onClick={() => void handlers.onAnswer(d.key, "ok")}>
              Oui, on l&apos;ajoute
            </Button>
            <Button className={btn} variant="secondary" pending={pending} onClick={() => void handlers.onAnswer(d.key, "non")}>
              Non
            </Button>
          </>
        ) : null}
        {/* §49.8 : les choix en boutons dans la carte, puis « C'est bon » ; plus de gros bouton « Corriger » : la ligne se
            réécrit d'un tap sur son nom. */}
      </div>
    </div>
  );
}

/**
 * NOUVEAU CAP (22 octobre 2026) : « Ligne vague → question en boutons (format, origine, choix, marque). » Chaque donnée qui
 * manque, ses boutons et « Autre » ; la réponse s'écrit dans la désignation, la question suivante vient ensuite.
 */
function PrecisionActions({ label, questions, pending, onAnswer }: { label: string; questions: readonly { cle: string; question: string; options: string[] }[]; pending: boolean; onAnswer: (cle: string, valeur: string) => Promise<void> }) {
  const [written, setWritten] = useState<string | null>(null);
  const [other, setOther] = useState("");
  return (
    <div role="group" aria-label={`Préciser : ${label}`} aria-busy={pending || undefined} className="flex flex-col gap-3">
      {questions.map((q) => (
        <div key={q.cle} role="group" aria-label={q.question} className="flex flex-col gap-1.5">
          <p className="text-[15px] leading-snug font-extrabold">{q.question}</p>
          <div className="flex flex-wrap gap-1.5">
            {q.options.map((o) => (
              <button key={o} type="button" disabled={pending} onClick={() => void onAnswer(q.cle, o)} className={`${OPTION} grow`}>
                {o}
              </button>
            ))}
            {written === q.cle ? null : (
              <button type="button" disabled={pending} onClick={() => setWritten(q.cle)} className={`${OPTION} grow border-dashed`}>
                Autre
              </button>
            )}
          </div>
          {written === q.cle ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (other.trim()) void onAnswer(q.cle, other).then(() => {
                  setWritten(null);
                  setOther("");
                });
              }}
            >
              <input
                aria-label={`Autre : ${q.question}`}
                autoFocus
                value={other}
                maxLength={120}
                onChange={(e) => setOther(e.target.value)}
                placeholder="Écris ta réponse"
                className="min-h-12 w-full min-w-0 rounded-xl border border-line bg-surface px-3 text-[16px] outline-none focus:border-accent"
              />
              <Button type="submit" className="shrink-0" pending={pending}>
                OK
              </Button>
            </form>
          ) : null}
        </div>
      ))}
    </div>
  );
}
