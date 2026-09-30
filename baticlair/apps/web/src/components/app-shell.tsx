"use client";

import { SessionGate } from "@/lib/session";
import { useTrackNavigation } from "@/lib/history";
import { AppNav } from "./app-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  useTrackNavigation();
  return (
    <SessionGate>
      <AppNav />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4.5 pt-6 pb-32 lg:max-w-3xl lg:pt-10 lg:pb-12 lg:pl-72">{children}</main>
    </SessionGate>
  );
}
