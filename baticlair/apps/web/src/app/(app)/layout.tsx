import { AppShell } from "@/components/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // `data-zone-app` : rendu par le serveur, il dit au tout premier affichage que l'on est dans l'application, pour que le
  // fond prenne déjà le thème choisi (aucun flash clair ou sombre avant que l'écran arrive ; `globals.css`).
  return (
    <div data-zone-app="" className="contents">
      <AppShell>{children}</AppShell>
    </div>
  );
}
