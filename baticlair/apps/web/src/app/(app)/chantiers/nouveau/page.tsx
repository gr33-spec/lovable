"use client";

import { CoupDeMainIa } from "@/components/coup-de-main-ia";
import { useSearchParams } from "next/navigation";

import { PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useRef, useState } from "react";
import { EcrireMaListe } from "@/components/ecrire-ma-liste";
import { BoutonDecrire } from "@/components/decrire-mon-chantier";
import { DropZone } from "@/components/journey";
import { Paywall, useBilling } from "@/components/paywall";
import { BackButton } from "@/components/ui";
import { api, ApiError, MAX_DOCUMENT_BYTES, newActionKey, type Project, type ProjectDocument } from "@/lib/api";
import { NEW_PROJECT_NAME } from "@/lib/project-name";
import { attachFile } from "@/lib/upload";
import { useSession } from "@/lib/session";

/**
 * ACHAT GROUPÉ PAR MÉTIER (Greg, 27 octobre 2026, 2e message, point 31) : trois choix, « Depuis mon devis — on t'avance »,
 * « Photo de ma liste », « Je la note moi-même ». Avant, NOUVEAU CAP (22 octobre 2026) : UN GROS BOUTON « Donne ta liste de matériaux » (liste remise au propre) et, en petit
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
      // Seul « rien lu » parle de la photo ; une panne du service de lecture dit la panne, avec son code support.
      else if (kind === "liste" && (err.reason === "nothing_read" || err.code === "unreadable_document")) {
        setErreurListe(err.reason === "nothing_read" ? "Je n'ai rien lu sur ce fichier. Reprends la photo bien à plat, bien éclairée, ou envoie un PDF." : "Ce fichier n'est ni une photo ni un PDF.");
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
      <h1 className="text-[34px] leading-[1.02] font-extrabold tracking-[-0.03em]">Ma liste de matériaux</h1>
      {erreurListe ? (
        <p role="alert" className="rounded-xl bg-warn-bg p-4 text-[15px] font-semibold text-warn">
          {erreurListe}
        </p>
      ) : null}
      {/* Greg, 30 octobre 2026 (point 10) : la lecture est une aide, dit avant de déposer. */}
      <CoupDeMainIa />
      {/* Point 31 (Greg, 27 octobre 2026, 2e message) : trois choix, ses mots. */}
      <DropZone small titre="Depuis mon devis — on t'avance" sousTitre="Je te prépare la liste, tu vérifies les quantités." onFile={(f) => void drop(f, "devis")} pending={pending === "devis"} error={error} />
      <DropZone small kind="liste" titre="Photo de ma liste" sousTitre="Une photo, un PDF ou une capture : je la remets au propre." onFile={(f) => void drop(f, "liste")} pending={pending === "liste"} error={null} />
      <SaisieListeReprise />
      {/* Assistant Mobiiz (Greg, 31 octobre 2026, point 1) : le quatrième départ, la description écrite ou dictée. */}
      <BoutonDecrire />
    </>
  );
}

/**
 * Achat groupé (Greg, 27 octobre 2026, point 1) : la liste se fait aussi À LA MAIN (désignation, quantité, unité), puis
 * arrive sur le même écran de liste, avec ses deux sorties.
 */
function SaisieListeReprise() {
  return (
    <Suspense>
      <SaisieListe />
    </Suspense>
  );
}

function SaisieListe() {
  // « Reprendre ta liste » (accueil) arrive ici avec ?liste=1 : l'écran se rouvre sur la liste gardée.
  const reprise = useSearchParams().get("liste") === "1";
  const [ouvertMain, setOuvert] = useState<boolean | null>(null);
  const ouvert = ouvertMain ?? reprise;
  const fermer = useCallback(() => setOuvert(false), []);
  return (
    <>
      <button type="button" onClick={() => setOuvert(true)} className="pressable flex min-h-16 items-center gap-3 rounded-xl bg-surface px-4 py-3 text-left shadow-card active:bg-ground">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ground text-ink" aria-hidden="true">
          <PenLine size={20} />
        </span>
        <span className="flex flex-col">
          <span className="text-[16px] font-semibold">Je la note moi-même</span>
          <span className="text-[14px] leading-snug text-muted">Matériau, quantité, unité.</span>
        </span>
      </button>
      {ouvert ? <EcrireMaListe onFermer={fermer} /> : null}
    </>
  );
}
