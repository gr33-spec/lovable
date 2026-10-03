"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { api } from "@/lib/api";

export interface NotificationsState {
  enabled: boolean;
  promptCount: number;
  askAtNextSend: boolean;
}

/** L'autorisation du navigateur, si on peut la demander ici ; sinon rien ne bloque l'activation côté compte. */
export async function askBrowserPermission(): Promise<void> {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "default") await Notification.requestPermission();
  } catch {
    // Navigateur sans notifications (ou refus) : le réglage du compte reste enregistré.
  }
}

/**
 * § 43.4 : juste après le premier envoi fournisseur (jamais à l'installation), un petit écran :
 * « Active tes notifications pour être prévenu dès que ton fournisseur te répond ou te pose une
 * question ». Reproposé au troisième envoi si refusé, puis plus jamais ; réglable dans Compte.
 */
export function NotificationsPrompt({ trigger }: { trigger: number }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (trigger === 0) return;
    let cancelled = false;
    void api<NotificationsState>("/v1/me/notifications")
      .then((s) => {
        if (!cancelled && s.askAtNextSend) setOpen(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [trigger]);
  if (!open) return null;
  const done = async (enable: boolean) => {
    setPending(true);
    try {
      if (enable) {
        await askBrowserPermission();
        await api<NotificationsState>("/v1/me/notifications", { method: "POST", body: { enabled: true } });
      }
      await api<NotificationsState>("/v1/me/notifications/prompted", { method: "POST" });
    } catch {
      // Un écran d'invitation ne doit jamais casser l'envoi qui vient de réussir.
    } finally {
      setPending(false);
      setOpen(false);
    }
  };
  return (
    <section role="dialog" aria-label="Activer les notifications" className="flex flex-col gap-3 rounded-[20px] bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <Bell size={22} aria-hidden="true" className="mt-0.5 shrink-0 text-accent-text" />
        <p className="text-[15px] leading-snug">Active tes notifications pour être prévenu dès que ton fournisseur te répond ou te pose une question.</p>
      </div>
      <Button pending={pending} onClick={() => void done(true)}>
        Activer
      </Button>
      <button type="button" disabled={pending} onClick={() => void done(false)} className="min-h-11 self-center text-sm font-bold text-muted">
        Plus tard
      </button>
    </section>
  );
}
