import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  envoyee: "Envoyée",
  relancee: "Relancée",
  recue: "Réponse reçue",
  comparee: "Comparée",
};

const TONES: Record<string, string> = {
  envoyee: "border-ink text-ink",
  relancee: "border-amber text-amber",
  recue: "border-green text-green",
  comparee: "border-blue text-blue",
};

interface DemandeStatusBadgeProps {
  status: string;
  className?: string;
}

/** Pastille de statut d'une demande de devis (étape 7). */
export function DemandeStatusBadge({ status, className }: DemandeStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border-2 bg-card px-2.5 py-0.5 font-sans text-xs font-semibold",
        TONES[status] ?? TONES.envoyee,
        className
      )}
    >
      {LABELS[status] ?? LABELS.envoyee}
    </span>
  );
}
