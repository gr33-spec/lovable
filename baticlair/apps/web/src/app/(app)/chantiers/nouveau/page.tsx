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
 * NOUVEAU CAP (22 octobre 2026) : UN GROS BOUTON « Donne ta liste de matériaux » (liste remise au propre) et, en petit
 * dessous, « Je n'ai qu'un devis » (« On t'avance la liste, sans garantie, tu la peaufines. »). Avant (21 octobre) : deux
 * gros boutons, « J'ai un devis » (déposer le PDF, parcours §48, étape 1) et « J'ai déjà ma liste » (photo d'une liste écrite à la main, d'un bon ou d'un devis de négoce, PDF ou
 * capture : l'artisan a déjà compté, les lignes sont lues telles qu'écrites, sans calcul ni question). Le chantier se crée
 * au dépôt, sous un nom d'attente ; la lecture d'un devis lui donne le nom du client, l'adresse et le métier. Les deux
 * chemins arrivent sur le même écran de liste. Rien à taper.
 */
export default function NouveauChantierPage() {
  const router = useRouter();
  const { company } = useSession();
  const billing = useBilling();
  const [pending, setPending] = useState<"devis" | "liste" | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [erreurListe, setErreurListe] = useState<string | null>(null);
  // Une clé par dépôt : double appui ou nouvelle tentative = un seul chantier.
  const key = useRef(newActionKey());
  const project = useRef<Project | null>(null);

  async function drop(file: File, kind: "devis" | "liste") {
    setError(null);
    setErreurListe(null);
    if (file.size > MAX_DOCUMENT_BYTES) return setError(new ApiError("payload_too_large", 413));
    setPending(kind);
    try {
      const trade = company?.trades.find((t) => t !== "other") ?? null;
      project.current ??= await api<Project>("/v1/projects", { method: "POST", body: { name: NEW_PROJECT_NAME, clientName: null, address: null, trade }, idempotencyKey: key.current });
      const form = new FormData();
      if (kind === "liste") {
        await attachFile(form, file);
        await api(`/v1/projects/${encodeURIComponent(project.current.id)}/liste?ecran=1`, { method: "POST", body: form });
        // Une liste n'a ni client ni adresse à lire : le chantier porte la date de la liste (renommable d'un tap).
        const jour = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
        await api(`/v1/projects/${encodeURIComponent(project.current.id)}`, { method: "PATCH", body: { name: `Ma liste du ${jour}` } }).catch(() => undefined);
      } else {
        form.append("purpose", "client_quote");
        await attachFile(form, file);
        await api<ProjectDocument>(`/v1/projects/${encodeURIComponent(project.current.id)}/documents`, { method: "POST", body: form });
      }
      // replace : « Retour » depuis le chantier ramène à la liste des chantiers, pas au dépôt. La lecture part là-bas.
      router.replace(`/chantiers/${project.current.id}`);
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError("internal_error", 500);
      if (err.code === "plan_limit_reached") billing.reload();
      else if (kind === "liste" && (err.code === "analysis_failed" || err.code === "unreadable_document")) {
        setErreurListe(err.reason === "nothing_read" || err.code === "analysis_failed" ? "Je n'ai rien lu sur ce fichier. Reprends la photo bien à plat, bien éclairée, ou envoie un PDF." : "Ce fichier n'est ni une photo ni un PDF.");
      } else setError(err);
      setPending(null);
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
      <h1 className="text-[34px] leading-[1.02] font-extrabold tracking-[-0.03em]">Nouvelle liste</h1>
      {erreurListe ? (
        <p role="alert" className="rounded-xl bg-warn-bg p-4 text-[15px] font-semibold text-warn">
          {erreurListe}
        </p>
      ) : null}
      <DropZone kind="liste" onFile={(f) => void drop(f, "liste")} pending={pending === "liste"} error={error} />
      <DropZone small onFile={(f) => void drop(f, "devis")} pending={pending === "devis"} error={null} />
    </>
  );
}
