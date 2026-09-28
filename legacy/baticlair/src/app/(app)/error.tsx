"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ErrorPageProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

/** Repli en cas d'erreur inattendue sur un écran (§2.6 : jamais de page blanche). */
export default function Error({ error, unstable_retry }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <Card className="flex w-full flex-col items-center gap-3 bg-red/10">
        <AlertTriangle className="h-10 w-10 text-red" aria-hidden="true" />
        <p className="font-display text-lg font-bold">Une erreur est survenue</p>
        <p className="font-sans text-sm text-muted">
          Quelque chose n&apos;a pas fonctionné. Réessaie dans un instant.
        </p>
        <Button onClick={() => unstable_retry()} fullWidth>
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
          Réessayer
        </Button>
      </Card>
    </div>
  );
}
