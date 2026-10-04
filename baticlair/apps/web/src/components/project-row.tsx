"use client";

import Link from "next/link";
import { Archive, ChevronRight, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, type Project } from "@/lib/api";
import { fr } from "@/lib/fr";
import { Badge } from "./ui";

/** Largeur du bouton révélé par le glissement (px). */
const ACTION_W = 104;

/**
 * Une ligne de chantier, identique à l'accueil et dans la liste. Glisser vers la gauche révèle « Terminé » (ou
 * « Reprendre » pour un chantier terminé) ; un long glissement l'applique tout de suite. Rien n'est supprimé : le
 * chantier passe dans « Terminés », et « Annuler » le remet. Au clavier, le bouton est atteint par Tab.
 */
export function ProjectRow({ project, onToggle }: { project: Project; onToggle?: ((p: Project) => void) | undefined }) {
  const subtitle = [project.clientName, project.address].filter(Boolean).join(" · ") || "Client non renseigné";
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
          className="absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-1 text-[13px] font-extrabold text-white"
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
        <Link href={`/chantiers/${project.id}`} draggable={false} className="flex min-h-16 items-center gap-3 px-4 py-2 hover:bg-ground/60">
          <span className="flex min-w-0 grow flex-col gap-0.5">
            <span className="truncate text-[15px] font-bold">{project.name}</span>
            <span className="truncate text-[13px] text-muted">{subtitle}</span>
          </span>
          {done ? <Badge tone="ok">{fr.status.archived}</Badge> : null}
          <ChevronRight size={18} className="shrink-0 text-subtle" aria-hidden="true" />
        </Link>
      </div>
    </li>
  );
}

type Shown = "active" | "archived" | "all";

/**
 * La liste des chantiers. Avec `show`, glisser une ligne la range (ou la reprend) : elle quitte la liste si elle n'y a
 * plus sa place, et un bandeau propose « Annuler » quelques secondes. `onChanged` prévient la page (à faire, compteurs).
 */
export function ProjectList({ projects, show, onChanged }: { projects: Project[]; show?: Shown; onChanged?: () => void }) {
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
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-3xl bg-surface py-1 shadow-card">
          {rows.map((p) => (
            <ProjectRow key={`${p.id}-${p.status}`} project={p} onToggle={show ? (x) => void toggle(x) : undefined} />
          ))}
        </ul>
      ) : null}
      {failed ? (
        <p role="alert" className="text-sm font-bold text-danger">
          Le chantier n&apos;a pas pu être modifié. Vérifiez la connexion et réessayez.
        </p>
      ) : null}
      {toast ? (
        <div role="status" className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-[0_18px_40px_rgba(14,17,22,0.3)]">
          <span className="min-w-0 grow truncate text-[15px] font-bold">
            {toast.to === "archived" ? "Rangé dans Terminés" : "Remis dans En cours"}
          </span>
          <button type="button" onClick={undo} className="min-h-11 shrink-0 rounded-xl px-3 text-[15px] font-extrabold text-accent-on-dark">
            Annuler
          </button>
        </div>
      ) : null}
    </>
  );
}
