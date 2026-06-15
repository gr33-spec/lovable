import { SearchX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";

/** Page introuvable, affichée par `notFound()` (ex : analyse ou demande supprimée). */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <Card className="flex w-full flex-col items-center gap-3">
        <SearchX className="h-10 w-10 text-blue" aria-hidden="true" />
        <p className="font-display text-lg font-bold">Page introuvable</p>
        <p className="font-sans text-sm text-muted">
          Cette page n&apos;existe pas ou tu n&apos;y as plus accès.
        </p>
        <LinkButton href="/accueil" fullWidth>
          Retour à l&apos;accueil
        </LinkButton>
      </Card>
    </div>
  );
}
