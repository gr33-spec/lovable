"use client";

import { InfoAnalyse } from "@/components/coup-de-main-ia";
import { useSearchParams } from "next/navigation";

import { Camera, FileText, Image as ImageIcon, Loader2, PenLine, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useId, useRef, useState } from "react";
import { SaisirMaListe } from "@/components/saisir-ma-liste";
import { texteDuPdf } from "@/components/pdf-pages";
import { natureDuDocument } from "../../../../../../../packages/domain/src/documents/nature";
import { BoutonDecrire } from "@/components/decrire-mon-chantier";
import { ErrorNotice } from "@/components/ui";
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

  /** « Importer un document » : le type (devis ou liste) se détermine sans le demander (`natureDuDocument`). */
  async function importer(file: File) {
    // Ni une photo ni un PDF : dit tout de suite, rien n'est créé ni décompté.
    const pdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!pdf && !file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
      setError(null);
      setErreurListe("Ce fichier n'est ni une photo ni un PDF.");
      return;
    }
    // Trop lourd : refusé par le dépôt, en clair, sans lire le fichier.
    if (file.size > MAX_DOCUMENT_BYTES) return drop(file, "liste");
    const nature = natureDuDocument({ type: file.type, nom: file.name }, file.type === "application/pdf" || /\.pdf$/i.test(file.name) ? await texteDuPdf(file) : null);
    await drop(file, nature);
  }

  return (
    <>
      <BackButton fallback="/chantiers" />
      {/* Greg, 31 octobre 2026 : trois entrées, moins d'espace, l'information en une phrase. */}
      <h1 className="text-[30px] leading-[1.05] font-extrabold tracking-[-0.03em]">Ma liste de matériaux</h1>
      {erreurListe ? (
        <p role="alert" className="rounded-xl bg-warn-bg p-4 text-[15px] font-semibold text-warn">
          {erreurListe}
        </p>
      ) : null}
      {error ? <ErrorNotice error={error} /> : null}
      <InfoAnalyse />
      <ImporterUnDocument pending={pending !== null} onFichier={(f) => void importer(f)} />
      <SaisieListeReprise />
      {/* Assistant Mobiiz (Greg, 31 octobre 2026, point 1) : la description écrite ou dictée. */}
      <BoutonDecrire />
    </>
  );
}

/**
 * « IMPORTER UN DOCUMENT » (Greg, 31 octobre 2026) : un devis, une liste, une photo, un PDF ou une capture, une seule
 * entrée ; au toucher, ce que le téléphone sait faire : prendre une photo, choisir une photo, choisir un PDF ou un
 * fichier. Les champs de fichier restent toujours dans la page (le toucher d'une option les ouvre).
 */
function ImporterUnDocument({ pending, onFichier }: { pending: boolean; onFichier: (f: File) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const ids = { photo: useId(), galerie: useId(), fichier: useId() };
  const prendre = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    setOuvert(false);
    if (f && !pending) onFichier(f);
  };
  // Feuille fermée : les champs ne se touchent que par ses options (ni Tab, ni lecteur d'écran avant le bouton).
  const cache = ouvert ? {} : { "aria-hidden": true, tabIndex: -1 };
  const option = "pressable flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl px-3 text-[16px] font-semibold active:bg-ground";
  return (
    <>
      <input id={ids.photo} type="file" accept="image/*" capture="environment" aria-label="Prendre une photo" className="sr-only" disabled={pending} onChange={prendre} {...cache} />
      <input id={ids.galerie} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" aria-label="Choisir une photo" className="sr-only" disabled={pending} onChange={prendre} {...cache} />
      <input id={ids.fichier} type="file" accept="application/pdf,.pdf,image/jpeg,image/png,image/webp" aria-label="Choisir un PDF ou un fichier" className="sr-only" disabled={pending} onChange={prendre} {...cache} />
      <button type="button" disabled={pending} onClick={() => setOuvert(true)} className="pressable flex min-h-16 items-center gap-3 rounded-xl bg-surface px-4 py-3 text-left shadow-card active:bg-ground disabled:opacity-80">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent" aria-hidden="true">
          {pending ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
        </span>
        <span className="flex flex-col">
          <span className="text-[16px] font-semibold">{pending ? "Je prépare ta liste…" : "Importer un document"}</span>
          <span className="text-[14px] leading-snug text-muted">Devis, liste, photo, PDF ou capture d&apos;écran.</span>
        </span>
      </button>
      {ouvert ? (
        <div className="fixed top-0 left-0 z-[60] flex h-[100dvh] w-full items-end justify-center bg-black/40 lg:items-center" onClick={() => setOuvert(false)}>
          <div role="dialog" aria-modal="true" aria-label="Importer un document" onClick={(e) => e.stopPropagation()} className="flex w-full max-w-md flex-col gap-1 rounded-t-3xl bg-surface p-4 pb-[max(env(safe-area-inset-bottom),16px)] text-ink shadow-card lg:rounded-3xl">
            <div className="flex items-center justify-between px-1 pb-1">
              <h2 className="text-[18px] font-extrabold">Importer un document</h2>
              <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer" className="grid size-10 place-items-center rounded-full">
                <X size={19} aria-hidden="true" />
              </button>
            </div>
            <label htmlFor={ids.photo} className={option}>
              <Camera size={21} aria-hidden="true" /> Prendre une photo
            </label>
            <label htmlFor={ids.galerie} className={option}>
              <ImageIcon size={21} aria-hidden="true" /> Choisir une photo
            </label>
            <label htmlFor={ids.fichier} className={option}>
              <FileText size={21} aria-hidden="true" /> Choisir un PDF ou un fichier
            </label>
            <p className="px-1 pt-1 text-[13px] text-muted">Devis ou liste : je le reconnais tout seul.</p>
          </div>
        </div>
      ) : null}
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
          <span className="text-[16px] font-semibold">Saisir ma liste</span>
          <span className="text-[14px] leading-snug text-muted">J&apos;ajoute directement les matériaux, quantités et unités.</span>
        </span>
      </button>
      {ouvert ? <SaisirMaListe onFermer={fermer} /> : null}
    </>
  );
}
