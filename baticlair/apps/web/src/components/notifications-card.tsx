"use client";

import { useCallback, useState } from "react";
import { askBrowserPermission, type NotificationsState } from "@/components/notifications-prompt";
import { Button, Card, ErrorNotice } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/** § 43.4 : le réglage dans Compte, pour activer (ou couper) les notifications à tout moment. */
export function NotificationsCard() {
  const fetchState = useCallback((signal: AbortSignal) => api<NotificationsState>("/v1/me/notifications", { signal }), []);
  const { data, setData } = useResource(fetchState);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const enabled = data?.enabled ?? false;
  const set = async (value: boolean) => {
    setPending(true);
    setError(null);
    try {
      if (value) await askBrowserPermission();
      setData(await api<NotificationsState>("/v1/me/notifications", { method: "POST", body: { enabled: value } }));
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
    }
  };
  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-xs font-extrabold tracking-[0.04em] text-muted">NOTIFICATIONS</h2>
      <p className="text-sm text-muted">Être prévenu quand un fournisseur répond ou pose une question, et quand la lecture d&apos;un devis se termine.</p>
      {error ? <ErrorNotice error={error} /> : null}
      <Button variant={enabled ? "secondary" : "primary"} pending={pending} disabled={!data} onClick={() => void set(!enabled)} aria-pressed={enabled}>
        {enabled ? "Notifications activées — couper" : "Activer les notifications"}
      </Button>
    </Card>
  );
}
