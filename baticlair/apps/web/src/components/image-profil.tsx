"use client";

import { useEffect, useRef, useState } from "react";
import { IMAGE_PROFIL_COTE, PHRASE_FORMATS_IMAGE_PROFIL } from "../../../../packages/domain/src/missions/image-profil";
import { api, getActiveCompanyId } from "@/lib/api";
import { phraseErreur, type EntrepriseVue } from "@/lib/missions";
import { BoutonContour, BoutonJaune, CARTE, Refus } from "./ux-kit";

/**
 * LE LOGO OU LA PHOTO DU PROFIL MISSIONS (Greg, 12 novembre 2026, dossier de corrections UX, point 12).
 * `AvatarEntreprise` : l'image carrée de l'entreprise, partout où son nom apparaît (profil public, annonces, réponses,
 * conversations) ; sans image, ou si elle ne se charge pas, ses initiales. `ImageProfilEditeur` : choisir, recadrer,
 * voir l'aperçu, remplacer, retirer.
 */

const TAILLES = { moyen: "size-12 text-[13px]", grand: "size-20 text-[20px]" } as const;

/** Les images déjà chargées, par adresse : une même entreprise affichée dix fois n'est lue qu'une fois. */
const dejaLues = new Map<string, Promise<string | null>>();
function lireImage(adresse: string): Promise<string | null> {
  let p = dejaLues.get(adresse);
  if (!p) {
    const companyId = getActiveCompanyId();
    p = fetch(adresse, { headers: companyId ? { "x-company-id": companyId } : {}, credentials: "same-origin" })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => (b ? URL.createObjectURL(b) : null))
      .catch(() => null);
    dejaLues.set(adresse, p);
  }
  return p;
}

export function AvatarEntreprise({ entreprise, jaune = false, taille = "moyen" }: { entreprise: Pick<EntrepriseVue, "id" | "initiales" | "image">; jaune?: boolean; taille?: keyof typeof TAILLES }) {
  const adresse = entreprise.image ? `/v1/profil-public/${entreprise.id}/image?v=${entreprise.image}` : null;
  const [charge, setCharge] = useState<{ adresse: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!adresse) return;
    let vivant = true;
    void lireImage(adresse).then((url) => vivant && setCharge({ adresse, url }));
    return () => {
      vivant = false;
    };
  }, [adresse]);
  const url = adresse && charge?.adresse === adresse ? charge.url : null;
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-extrabold ${TAILLES[taille]} ${jaune ? "bg-accent text-on-accent" : "bg-[#efece6] text-[#130901]"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- image privée lue avec la session (adresse locale au navigateur). */}
      {url ? <img src={url} alt="" className="size-full object-cover" /> : entreprise.initiales}
    </span>
  );
}

const APERCU = 240;

interface Cadrage {
  zoom: number;
  x: number;
  y: number;
}

/** Dessine l'image dans un carré : `zoom` 1 = l'image remplit tout juste le carré ; `x`, `y` de 0 à 100 = quelle partie on voit. */
function dessiner(toile: HTMLCanvasElement, image: HTMLImageElement, c: Cadrage, cote: number) {
  toile.width = cote;
  toile.height = cote;
  const g = toile.getContext("2d");
  if (!g) return;
  // Fond blanc : un logo transparent reste lisible une fois en JPEG.
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, cote, cote);
  const echelle = (cote / Math.min(image.naturalWidth, image.naturalHeight)) * c.zoom;
  const l = image.naturalWidth * echelle;
  const h = image.naturalHeight * echelle;
  g.drawImage(image, -(l - cote) * (c.x / 100), -(h - cote) * (c.y / 100), l, h);
}

export function ImageProfilEditeur({ entreprise, onChange }: { entreprise: EntrepriseVue; onChange: (e: EntrepriseVue) => void }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [cadrage, setCadrage] = useState<Cadrage>({ zoom: 1, x: 50, y: 50 });
  const [pending, setPending] = useState<"envoi" | "retrait" | null>(null);
  const [confirmer, setConfirmer] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const toile = useRef<HTMLCanvasElement>(null);
  const fichier = useRef<HTMLInputElement>(null);
  const glisse = useRef<{ x: number; y: number; depart: Cadrage } | null>(null);

  useEffect(() => {
    if (image && toile.current) dessiner(toile.current, image, cadrage, APERCU);
  }, [image, cadrage]);

  function choisir(f: File | undefined) {
    setRefus(null);
    setOk(null);
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      setRefus("Choisis une image JPEG, PNG ou WebP.");
      return;
    }
    if (f.size > 12 * 1024 * 1024) {
      setRefus("Cette image est trop lourde (12 Mo au plus avant recadrage).");
      return;
    }
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      setCadrage({ zoom: 1, x: 50, y: 50 });
      setImage(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setRefus("Cette image n'a pas pu être lue. Essaie avec une autre.");
    };
    img.src = url;
  }

  async function enregistrer() {
    if (!image || pending) return;
    setPending("envoi");
    setRefus(null);
    try {
      // Le recadrage redessine l'image : ce qui part est un carré neuf, sans les informations cachées de la photo.
      const sortie = document.createElement("canvas");
      dessiner(sortie, image, cadrage, IMAGE_PROFIL_COTE);
      const blob = await new Promise<Blob | null>((fin) => sortie.toBlob(fin, "image/jpeg", 0.86));
      if (!blob) throw new Error("recadrage");
      const corps = new FormData();
      corps.append("file", blob, "image-profil.jpg");
      onChange(await api<EntrepriseVue>("/v1/profil-public/image", { method: "PUT", body: corps }));
      setImage(null);
      setOk("Image enregistrée.");
    } catch (e) {
      setRefus(phraseErreur(e));
    } finally {
      setPending(null);
    }
  }

  async function retirer() {
    setPending("retrait");
    setRefus(null);
    try {
      onChange(await api<EntrepriseVue>("/v1/profil-public/image", { method: "DELETE" }));
      setConfirmer(false);
      setOk("Image retirée. Tes initiales sont affichées à la place.");
    } catch (e) {
      setRefus(phraseErreur(e));
    } finally {
      setPending(null);
    }
  }

  const regler = (cle: keyof Cadrage, libelle: string, min: number, max: number, pas: number) => (
    <label className="flex items-center gap-3 text-[13px] font-bold text-[#5c5648]">
      <span className="w-20 shrink-0">{libelle}</span>
      <input type="range" min={min} max={max} step={pas} value={cadrage[cle]} onChange={(e) => setCadrage((c) => ({ ...c, [cle]: Number(e.target.value) }))} className="min-h-11 min-w-0 flex-1 accent-[#130901]" />
    </label>
  );

  return (
    <section aria-label="Logo ou photo de l'entreprise" className={`flex flex-col gap-3 p-4 ${CARTE}`}>
      <div className="flex items-center gap-3">
        <AvatarEntreprise entreprise={entreprise} jaune taille="grand" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[16px] font-extrabold">Logo ou photo de l&apos;entreprise</h2>
          <p className="text-[13px] leading-snug text-[#5c5648]">{entreprise.image ? "Visible avec ton nom dans tes annonces, tes réponses et tes conversations Missions." : "Sans image, tes initiales sont affichées."}</p>
        </div>
      </div>
      <input ref={fichier} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Choisir une image" onChange={(e) => (choisir(e.target.files?.[0]), (e.target.value = ""))} />
      {image ? (
        <div role="group" aria-label="Recadrer l'image" className="flex flex-col gap-2">
          <canvas
            ref={toile}
            aria-label="Aperçu de l'image recadrée"
            role="img"
            className="size-60 max-w-full touch-none self-center rounded-full bg-white shadow-card"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              glisse.current = { x: e.clientX, y: e.clientY, depart: cadrage };
            }}
            onPointerMove={(e) => {
              const g = glisse.current;
              if (!g) return;
              const borne = (v: number) => Math.max(0, Math.min(100, v));
              setCadrage({ zoom: g.depart.zoom, x: borne(g.depart.x - ((e.clientX - g.x) / APERCU) * 100), y: borne(g.depart.y - ((e.clientY - g.y) / APERCU) * 100) });
            }}
            onPointerUp={() => (glisse.current = null)}
            onPointerCancel={() => (glisse.current = null)}
          />
          <p className="text-center text-[13px] text-[#5c5648]">Fais glisser l&apos;image, ou règle ci-dessous.</p>
          {regler("zoom", "Zoom", 1, 3, 0.05)}
          {regler("x", "Horizontal", 0, 100, 1)}
          {regler("y", "Vertical", 0, 100, 1)}
          <BoutonJaune pending={pending === "envoi"} onClick={() => void enregistrer()}>
            Utiliser cette image
          </BoutonJaune>
          <BoutonContour onClick={() => setImage(null)}>Annuler</BoutonContour>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <BoutonContour onClick={() => fichier.current?.click()}>{entreprise.image ? "Remplacer l'image" : "Ajouter un logo ou une photo"}</BoutonContour>
          {entreprise.image ? (
            confirmer ? (
              <div role="group" aria-label="Confirmer le retrait de l'image" className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => void retirer()} disabled={pending !== null} className="pressable min-h-11 rounded-full bg-[#130901] px-4 text-[14px] font-extrabold text-white disabled:opacity-60">
                  {pending === "retrait" ? "Retrait…" : "Oui, retirer l'image"}
                </button>
                <button type="button" onClick={() => setConfirmer(false)} className="min-h-11 px-3 text-[14px] font-extrabold underline underline-offset-4">
                  Annuler
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmer(true)} className="min-h-11 self-start text-[14px] font-extrabold underline underline-offset-4">
                Retirer l&apos;image
              </button>
            )
          ) : null}
        </div>
      )}
      <p className="text-[12px] leading-snug text-[#6b6557]">{PHRASE_FORMATS_IMAGE_PROFIL}</p>
      {ok ? (
        <p role="status" className="rounded-xl bg-[#d9f1e3] px-4 py-3 text-[14px] font-semibold text-[#0b6b43]">
          {ok}
        </p>
      ) : null}
      <Refus>{refus}</Refus>
    </section>
  );
}

/** Signaler le logo ou la photo d'une AUTRE entreprise à l'équipe Mobiiz : un geste, une confirmation, jamais deux fois. */
export function SignalerImage({ entreprise }: { entreprise: Pick<EntrepriseVue, "id" | "image"> }) {
  const [etat, setEtat] = useState<"repos" | "confirmer" | "envoi" | "fait">("repos");
  const [refus, setRefus] = useState<string | null>(null);
  if (!entreprise.image || entreprise.id === getActiveCompanyId()) return null;
  async function signaler() {
    setEtat("envoi");
    setRefus(null);
    try {
      await api(`/v1/profil-public/${entreprise.id}/image/signalement`, { method: "POST", body: {} });
      setEtat("fait");
    } catch (e) {
      setRefus(phraseErreur(e));
      setEtat("repos");
    }
  }
  if (etat === "fait")
    return (
      <p role="status" className="text-center text-[13px] font-semibold text-muted">
        Merci. L&apos;équipe Mobiiz va regarder cette image.
      </p>
    );
  return (
    <div className="flex flex-col items-center gap-1">
      {etat === "repos" ? (
        <button type="button" onClick={() => setEtat("confirmer")} className="min-h-11 text-[13px] font-semibold text-muted underline underline-offset-4">
          Signaler cette image
        </button>
      ) : (
        <div role="group" aria-label="Confirmer le signalement de l'image" className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={() => void signaler()} disabled={etat === "envoi"} className="pressable min-h-11 rounded-full border border-ink/35 px-4 text-[14px] font-extrabold disabled:opacity-60">
            Oui, signaler à Mobiiz
          </button>
          <button type="button" onClick={() => setEtat("repos")} className="min-h-11 px-3 text-[14px] font-extrabold underline underline-offset-4">
            Annuler
          </button>
        </div>
      )}
      <Refus>{refus}</Refus>
    </div>
  );
}
