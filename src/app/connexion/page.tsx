import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ConnexionPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center font-display text-3xl font-black">
          Bati<span className="text-blue">Clair</span>
        </h1>
        <p className="mb-6 text-center font-sans text-base text-muted">
          Le juste prix de tes matériaux.
        </p>
        <Card className="flex flex-col gap-3">
          <label htmlFor="email" className="font-sans text-sm font-semibold">
            Ton e-mail
          </label>
          <input
            id="email"
            type="email"
            placeholder="toi@exemple.fr"
            className="tap-target w-full rounded-xl border-2 border-ink bg-paper px-4 text-base"
          />
          <Button type="submit" fullWidth>
            Recevoir mon lien
          </Button>
          <p className="text-center font-sans text-xs text-muted">
            Pas de mot de passe. On t&apos;envoie un lien de connexion par
            e-mail.
          </p>
        </Card>
      </div>
    </div>
  );
}
