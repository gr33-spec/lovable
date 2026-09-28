import { MailCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function VerificationPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center font-display text-3xl font-black">
          Bati<span className="text-accent">Clair</span>
        </h1>
        <Card className="flex flex-col items-center gap-3 text-center">
          <MailCheck className="h-10 w-10 text-blue" aria-hidden="true" />
          <p className="font-display text-lg font-bold">Vérifie tes e-mails</p>
          <p className="font-sans text-sm text-muted">
            On t&apos;a envoyé un lien de connexion. Ouvre-le depuis ce téléphone
            pour accéder à ton compte BatiClair.
          </p>
        </Card>
      </div>
    </div>
  );
}
