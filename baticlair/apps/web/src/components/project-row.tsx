import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Project } from "@/lib/api";
import { fr } from "@/lib/fr";
import { Badge } from "./ui";

/** Une ligne de chantier, identique à l'accueil et dans la liste. */
export function ProjectRow({ project }: { project: Project }) {
  const subtitle = [project.clientName, project.address].filter(Boolean).join(" · ") || "Client non renseigné";
  return (
    <li>
      <Link href={`/chantiers/${project.id}`} className="flex min-h-16 items-center gap-3 px-4 py-2 hover:bg-ground/60">
        <span className="flex min-w-0 grow flex-col gap-0.5">
          <span className="truncate text-[15px] font-bold">{project.name}</span>
          <span className="truncate text-[13px] text-muted">{subtitle}</span>
        </span>
        {project.status === "archived" ? <Badge tone="ok">{fr.status.archived}</Badge> : null}
        <ChevronRight size={18} className="shrink-0 text-subtle" aria-hidden="true" />
      </Link>
    </li>
  );
}

export function ProjectList({ projects }: { projects: Project[] }) {
  return (
    <ul className="flex flex-col divide-y divide-line rounded-3xl bg-surface py-1 shadow-card">
      {projects.map((p) => (
        <ProjectRow key={p.id} project={p} />
      ))}
    </ul>
  );
}
