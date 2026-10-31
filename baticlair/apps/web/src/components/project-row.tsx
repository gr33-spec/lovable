"use client";

import Link from "next/link";
import { Archive, ChevronRight, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Project } from "@/lib/api";
import { useOrdinateur } from "@/lib/ordinateur";
import { useResource } from "@/lib/use-resource";
import { fr } from "@/lib/fr";
import { Badge } from "./ui";

/** Largeur du bouton révélé par le glissement (px). */
const ACTION_W = 104;

/**
 * Une ligne de chantier, identique à l'accueil et dans la liste. Glisser vers la gauche révèle « Terminé » (ou
 * « Reprendre » pour un chantier terminé) ; un long glissement l'applique tout de suite. Rien n'est supprimé : le
 * chantier passe dans « Terminés », et « Annuler » le remet. Au clavier, le bouton est atteint par Tab.
 */
export function ProjectRow({ project, onToggle, detail = false }: { project: Project; onToggle?: ((p: Project) => void) | undefined; detail?: boolean }) {
  // Greg (23 octobre) : rien sous le nom quand ni client ni adresse ne sont renseignés (plus de « Client non renseigné »).
  const subtitle = [project.clientName, project.address].filter(Boolean).join(" · ");
  const done = project.status === "archived";
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; swiping: boolean | null; width: number } | null>(null);
  const moved = useRef(false);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onToggle || (e.pointerType === "mouse" && e.button !== 0)) return;
    start.current = { x: e.clientX, y: e.clientY, base: offset, swiping: null, width: e.currentTarget.offsetWidth };
    moved.current = false;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    // On ne décide qu'au-delà de 8 px : vertical = défilement normal, horizontal = glissement.
    if (s.swiping === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      s.swiping = Math.abs(dx) > Math.abs(dy);
      if (s.swiping) {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
      }
    }
    if (!s.swiping) return;
    moved.current = true;
    setOffset(Math.min(0, Math.max(-s.width, s.base + dx)));
  };
  const onPointerUp = () => {
    const s = start.current;
    start.current = null;
    if (!s?.swiping) return;
    setDragging(false);
    if (offset < -s.width * 0.6) {
      setOffset(-s.width);
      onToggle?.(project);
    } else setOffset(offset < -ACTION_W / 2 ? -ACTION_W : 0);
  };

  return (
    <li className={`relative overflow-hidden ${onToggle ? (done ? "bg-accent" : "bg-ink") : ""}`}>
      {onToggle ? (
        <button
          type="button"
          onClick={() => onToggle(project)}
          onFocus={() => setOffset(-ACTION_W)}
          onBlur={() => setOffset(0)}
          aria-label={`${done ? "Reprendre" : "Marquer terminé"} : ${project.name}`}
          className="absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-1 text-[13px] font-semibold text-white"
          style={{ width: ACTION_W }}
        >
          {done ? <RotateCcw size={20} aria-hidden="true" /> : <Archive size={20} aria-hidden="true" />}
          {done ? "Reprendre" : "Terminé"}
        </button>
      ) : null}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          // Après un glissement, ou ligne ouverte : le toucher referme au lieu d'ouvrir le chantier.
          if (moved.current || offset !== 0) {
            e.preventDefault();
            e.stopPropagation();
            if (!moved.current) setOffset(0);
            moved.current = false;
          }
        }}
        className={`relative bg-surface ${dragging ? "" : "transition-transform duration-200"}`}
        style={{ transform: `translateX(${offset}px)`, touchAction: "pan-y" }}
      >
        <Link href={`/chantiers/${project.id}`} draggable={false} className="flex min-h-16 items-center gap-3 px-4 py-3 transition-[background-color] duration-150 hover:bg-ground/60 active:bg-ground">
          <span className="flex min-w-0 grow flex-col gap-0.5">
            <span className="truncate text-[16px] font-semibold">{project.name}</span>
            {subtitle ? <span className="truncate text-[14px] text-muted">{subtitle}</span> : null}
          </span>
          <ResumeOrdinateur project={project} detail={detail} />
          {done ? <Badge tone="ok">{fr.status.archived}</Badge> : null}
          <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true" />
        </Link>
      </div>
    </li>
  );
}

interface Suivi {
  etape: number;
  etapes: { nom: string; fait: boolean }[];
  phrase: string;
  aFaire: string | null;
}

const dateCourte = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/**
 * SUR ORDINATEUR, UNE LISTE SE LIT D'UN COUP D'ŒIL (Greg, 31 octobre 2026, soir : « pas intuitive ») : à droite du nom,
 * son étape (les quatre pastilles du suivi façon colis), ce qu'il reste à faire en une phrase, et la date de la dernière
 * activité. Rien sur téléphone (la ligne y reste la même) ; le suivi n'est chargé qu'à l'ordinateur.
 */
function ResumeOrdinateur({ project, detail }: { project: Project; detail: boolean }) {
  const ordinateur = useOrdinateur();
  const fetchSuivi = useCallback(
    (signal: AbortSignal) => (ordinateur ? api<Suivi>(`/v1/projects/${encodeURIComponent(project.id)}/suivi`, { signal }).catch(() => null) : Promise.resolve(null)),
    [ordinateur, project.id],
  );
  const { data } = useResource(fetchSuivi);
  if (!ordinateur) return null;
  // L'étape atteinte : la dernière faite (« Prix reçus »), sinon la liste est encore en préparation.
  const faites = (data?.etapes ?? []).filter((e) => e.fait);
  const ou = data ? (faites.at(-1)?.nom ?? "En préparation") : "";
  return (
    <span aria-hidden="true" className="hidden shrink-0 items-center gap-5 lg:flex">
      <span className={`hidden w-[17rem] truncate text-[14px] text-muted ${detail ? "xl:block" : ""}`}>{data ? (data.aFaire ?? data.phrase) : ""}</span>
      <span className="flex w-[11.5rem] items-center gap-2">
        <span className="flex gap-1">
          {(data?.etapes ?? [0, 1, 2, 3].map(() => ({ nom: "", fait: false }))).map((e, i) => (
            <span key={i} className={`h-1.5 w-3.5 rounded-full ${e.fait ? "bg-mark-ok" : "bg-line"}`} />
          ))}
        </span>
        <span className="truncate text-[13px] font-semibold">{ou}</span>
      </span>
      <span className="hidden w-[4.5rem] text-right text-[13px] text-muted tabular-nums 2xl:block">{dateCourte(project.lastActivityAt)}</span>
    </span>
  );
}

type Shown = "active" | "archived" | "all";

/**
 * La liste des chantiers. Avec `show`, glisser une ligne la range (ou la reprend) : elle quitte la liste si elle n'y a
 * plus sa place, et un bandeau propose « Annuler » quelques secondes. `onChanged` prévient la page (à faire, compteurs).
 */
export function ProjectList({ projects, show, onChanged, detail = false }: { projects: Project[]; show?: Shown; onChanged?: () => void; detail?: boolean }) {
  const [status, setStatus] = useState<Record<string, Project["status"]>>({});
  const [toast, setToast] = useState<{ project: Project; to: Project["status"] } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const patch = async (p: Project, to: Project["status"]) => {
    const from = status[p.id] ?? p.status;
    setStatus((s) => ({ ...s, [p.id]: to }));
    setFailed(false);
    try {
      await api<Project>(`/v1/projects/${p.id}`, { method: "PATCH", body: { status: to } });
      onChanged?.();
      return true;
    } catch {
      setStatus((s) => ({ ...s, [p.id]: from }));
      setFailed(true);
      return false;
    }
  };
  const toggle = async (p: Project) => {
    const to = (status[p.id] ?? p.status) === "archived" ? "active" : "archived";
    if (await patch(p, to)) setToast({ project: p, to });
  };
  const undo = () => {
    if (!toast) return;
    void patch(toast.project, toast.to === "archived" ? "active" : "archived");
    setToast(null);
  };

  const rows = projects
    .map((p) => ({ ...p, status: status[p.id] ?? p.status }))
    .filter((p) => !show || show === "all" || p.status === show);

  return (
    <>
      {rows.length > 0 ? (
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl bg-surface shadow-card">
          {rows.map((p) => (
            <ProjectRow key={`${p.id}-${p.status}`} project={p} detail={detail} onToggle={show ? (x) => void toggle(x) : undefined} />
          ))}
        </ul>
      ) : null}
      {failed ? (
        <p role="alert" className="text-sm font-bold text-danger">
          Le chantier n&apos;a pas pu être modifié. Vérifie la connexion et réessaie.
        </p>
      ) : null}
      {toast ? (
        <div role="status" className="animate-rise fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-ink px-4 py-3 text-white shadow-card">
          <span className="min-w-0 grow truncate text-[15px] font-bold">
            {toast.to === "archived" ? "Rangé dans Terminés" : "Remis dans En cours"}
          </span>
          <button type="button" onClick={undo} className="min-h-11 shrink-0 rounded-full px-3 text-[15px] font-semibold text-accent-on-dark">
            Annuler
          </button>
        </div>
      ) : null}
    </>
  );
}
