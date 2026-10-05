"use client";

import { SessionGate } from "@/lib/session";
import { useTrackNavigation } from "@/lib/history";
import { AppNav } from "./app-nav";
import { FileViewer } from "./file-viewer";

export function AppShell({ children }: { children: React.ReactNode }) {
  useTrackNavigation();
  return (
    <SessionGate>
      <AppNav />
      <FileViewer />
      {/* Sur grand écran, la place du menu (pl-72) s'ajoute à la colonne au lieu de la rogner : 48rem de contenu, 56rem au-delà de 1280 px. */}
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4.5 pt-6 pb-32 lg:max-w-[66rem] lg:pt-10 lg:pb-12 lg:pl-72 xl:max-w-[74rem]">{children}</main>
    </SessionGate>
  );
}
