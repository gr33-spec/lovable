"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { DropZone } from "@/components/journey";
import { Paywall, useBilling } from "@/components/paywall";
import { BackButton } from "@/components/ui";
import { api, ApiError, MAX_DOCUMENT_BYTES, newActionKey, type Project, type ProjectDocument } from "@/lib/api";
import { NEW_PROJECT_NAME } from "@/lib/project-name";
import { attachFile } from "@/lib/upload";
import { useSession } from "@/lib/session";

/**
 * NOUVEAU CHANTIER = UNE SEULE ACTION : DÉPOSER LE PDF (parcours §48, étape 1). Le chantier se crée au dépôt, sous un
 * nom d'attente ; la lecture lui donne le nom du client, l'adresse et le métier de l'entreprise. Rien à taper.
 */
export default function NouveauChantierPage() {
  const router = useRouter();
  const { company } = useSession();
  const billing = useBilling();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  // Une clé par dépôt : double appui ou nouvelle tentative = un seul chantier.
  const key = useRef(newActionKey());
  const project = useRef<Project | null>(null);

  async function drop(file: File) {
    setError(null);
    if (file.size > MAX_DOCUMENT_BYTES) return setError(new ApiError("payload_too_large", 413));
    setPending(true);
    try {
      const trade = company?.trades.find((t) => t !== "other") ?? null;
      project.current ??= await api<Project>("/v1/projects", { method: "POST", body: { name: NEW_PROJECT_NAME, clientName: null, address: null, trade }, idempotencyKey: key.current });
      const form = new FormData();
      form.append("purpose", "client_quote");
      await attachFile(form, file);
      await api<ProjectDocument>(`/v1/projects/${encodeURIComponent(project.current.id)}/documents`, { method: "POST", body: form });
      // replace : « Retour » depuis le chantier ramène à la liste des chantiers, pas au dépôt. La lecture part là-bas.
      router.replace(`/chantiers/${project.current.id}`);
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError("internal_error", 500);
      if (err.code === "plan_limit_reached") billing.reload();
      else setError(err);
      setPending(false);
    }
  }

  if (billing.data?.limitReached) {
    return (
      <>
        <BackButton fallback="/chantiers" />
        <Paywall status={billing.data} onChange={billing.setData} />
      </>
    );
  }

  return (
    <>
      <BackButton fallback="/chantiers" />
      <DropZone onFile={(f) => void drop(f)} pending={pending} error={error} />
    </>
  );
}
