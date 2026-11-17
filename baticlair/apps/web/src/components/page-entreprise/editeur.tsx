"use client";

import { ArrowDown, ArrowLeft, ArrowUp, Check, Copy, ExternalLink, Eye, Image as ImageIcon, Loader2, Monitor, Plus, Share2, Smartphone, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { texteSurCouleur, type ContenuPage, type Prestation } from "@baticlair/domain/page-entreprise";
import { Button, Card, Skeleton } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { envoyerPhoto, GaleriePhotos, type PhotoEditeur } from "./editeur-photos";
import { rafraichirPagePublique } from "./rafraichir";
import { LIBELLES, VuePage } from "./vue-page";

/**
 * « MON SITE » (Greg, 16 novembre 2026), onglet de la navigation principale (avant : Profil › Ma page). Réglée en 5 minutes au téléphone : chaque
 * changement s'enregistre tout seul et s'applique tout de suite (page publique régénérée), l'aperçu se dessine en direct
 * pendant qu'on touche. Interface dans la charte Mobiiz ; la page, elle, prend les couleurs de l'artisan.
 */
interface Reglages {
  visible: boolean;
  masquee: boolean;
  adresse: string;
  adresseModifiable: boolean;
  couleur: string | null;
  couleurBoutons: string | null;
  prestations: Prestation[];
  accroche: string | null;
  presentation: string | null;
  telephone: string | null;
  zone: string | null;
  horaires: string | null;
  siteWeb: string | null;
  creeeEn: number | null;
  certifications: string[];
  afficherAdresse: boolean;
  photosAccord: boolean;
  couvertureId: string | null;
}
interface MaPage {
  reglages: Reglages;
  profil: { nom: string; metiers: string[]; telephone: string | null; zone: string | null; adressePostale: string | null; siret: string | null; verifiee: boolean; logo: boolean };
  contenu: ContenuPage;
  photos: (PhotoEditeur & { largeur: number; hauteur: number; partage: string | null })[];
  realisations: { id: string; titre: string }[];
  choix: {
    teintes: readonly { id: string; nom: string; hex: string }[];
    couleursBoutons: readonly { id: string; nom: string; hex: string }[];
    certifications: readonly string[];
    theme: { nom: string; teinte: string; accroche: string; presentation: string; prestations: Prestation[] };
    limites: { accroche: number; presentation: number; photos: number; prestations: number };
    stockagePhotos: boolean;
    missions: boolean;
  };
}

type Etat = "pret" | "enregistrement" | "enregistre" | "erreur";
const CHAMPS_TEXTE = new Set<keyof Reglages>(["accroche", "presentation", "telephone", "zone", "horaires", "siteWeb", "prestations"]);

function Interrupteur({ actif, onChange, label, aide }: { actif: boolean; onChange: (v: boolean) => void; label: string; aide?: string }) {
  return (
    <button type="button" role="switch" aria-checked={actif} onClick={() => onChange(!actif)} className="pressable flex w-full items-center justify-between gap-4 rounded-2xl py-2 text-left">
      <span>
        <span className="block text-[16px] font-bold">{label}</span>
        {aide ? <span className="block text-[14px] text-muted">{aide}</span> : null}
      </span>
      <span aria-hidden="true" className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${actif ? "bg-accent" : "bg-black/25"}`}>
        <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-[left] ${actif ? "left-7" : "left-1"}`} />
      </span>
    </button>
  );
}

function Champ({ label, valeur, onChange, placeholder, max, multi = false, type = "text", aide, inputMode }: { label: string; valeur: string; onChange: (v: string) => void; placeholder?: string; max: number; multi?: boolean; type?: string; aide?: string; inputMode?: "tel" | "url" | "numeric" }) {
  const cls = "w-full rounded-xl border border-line bg-surface px-4 py-3 text-[16px] outline-none placeholder:text-muted focus-visible:border-accent";
  return (
    <label className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
      <span className="flex items-baseline justify-between gap-2 text-[14px] font-bold">
        {label}
        {multi || max <= 120 ? (
          <span className="text-[12px] font-normal text-muted">
            {valeur.length}/{max}
          </span>
        ) : null}
      </span>
      {multi ? <textarea rows={5} maxLength={max} value={valeur} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cls} /> : <input type={type} inputMode={inputMode} maxLength={max} value={valeur} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={`${cls} min-h-13`} />}
      {aide ? <span className="text-[13px] text-muted">{aide}</span> : null}
    </label>
  );
}

/** L'année de création : tapée librement, enregistrée quand elle est complète (4 chiffres, 1900 à cette année). */
function AnneeChamp({ valeur, onChange }: { valeur: number | null; onChange: (n: number | null) => void }) {
  const [texte, setTexte] = useState(valeur ? String(valeur) : "");
  return (
    <Champ
      label="Année de création"
      inputMode="numeric"
      valeur={texte}
      max={4}
      placeholder="2008"
      aide="Facultatif : « Depuis 2008 » s'affiche avec tes garanties."
      onChange={(v) => {
        const t = v.replace(/\D/g, "").slice(0, 4);
        setTexte(t);
        const n = Number(t);
        if (!t) onChange(null);
        else if (t.length === 4 && n >= 1900 && n <= new Date().getFullYear()) onChange(n);
      }}
    />
  );
}

function Apercu({ contenu, plein, onFermer }: { contenu: ContenuPage; plein?: boolean; onFermer?: () => void }) {
  const [ecran, setEcran] = useState<"telephone" | "ordinateur">("telephone");
  const cadre = useRef<HTMLDivElement>(null);
  const defile = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(360);
  useEffect(() => {
    const el = cadre.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLargeur(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Plein écran : la page derrière ne bouge plus, « Échap » ramène à l'édition.
  useEffect(() => {
    if (!plein) return;
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const touche = (e: KeyboardEvent) => e.key === "Escape" && onFermer?.();
    window.addEventListener("keydown", touche);
    return () => {
      document.body.style.overflow = avant;
      window.removeEventListener("keydown", touche);
    };
  }, [plein, onFermer]);
  const ordinateur = ecran === "ordinateur";
  const echelle = ordinateur ? Math.min(1, largeur / 1200) : 1;
  /** En plein écran le site se parcourt comme en vrai (menu, « Voir plus ») ; un lien interne défile dans l'aperçu, rien ne part. */
  const clic = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a");
    if (!a) return;
    e.preventDefault();
    const cible = a.getAttribute("href");
    if (cible?.startsWith("#") && cible.length > 1) defile.current?.querySelector(cible)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const choixEcran = (
    <div role="radiogroup" aria-label="Taille de l'aperçu" className={`flex gap-1 rounded-full p-1 ${plein ? "bg-white/12" : "bg-black/10"}`}>
      {(["telephone", "ordinateur"] as const).map((e) => (
        <button key={e} type="button" role="radio" aria-checked={ecran === e} onClick={() => setEcran(e)} className={`flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold ${ecran === e ? "bg-surface text-ink shadow" : plein ? "text-white" : ""}`}>
          {e === "telephone" ? <Smartphone size={15} aria-hidden="true" /> : <Monitor size={15} aria-hidden="true" />} {e === "telephone" ? "Téléphone" : "Ordinateur"}
        </button>
      ))}
    </div>
  );
  return (
    <div
      className={plein ? "fixed top-0 left-0 z-[70] flex h-dvh w-full flex-col gap-3 bg-[#0b0b0c]/95 px-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur" : "grid gap-2"}
      {...(plein ? { role: "dialog", "aria-modal": true, "aria-label": "Aperçu de mon site" } : {})}
    >
      <div className="flex items-center justify-between gap-2">
        {plein ? (
          <button type="button" onClick={onFermer} className="pressable flex min-h-11 items-center gap-1.5 rounded-full bg-white pr-4 pl-3 text-[15px] font-extrabold text-black">
            <ArrowLeft size={18} aria-hidden="true" /> Retour
          </button>
        ) : null}
        {choixEcran}
      </div>
      <div ref={cadre} className={`mx-auto w-full overflow-hidden rounded-[28px] border-[6px] border-black/80 bg-black/80 ${ordinateur ? "" : "max-w-[390px]"} ${plein ? "min-h-0 flex-1" : ""}`}>
        {/* Le `transform` fait du cadre le repère de la barre d'appel (position fixe) : elle reste dans l'aperçu.
            Le défilement est sur ce cadre, jamais rendu inerte : le doigt fait défiler le site (Greg, 17 novembre 2026). */}
        <div ref={defile} className="overscroll-contain overflow-y-auto bg-white" style={{ height: plein ? "100%" : ordinateur ? 640 * echelle : 620, transform: "translateZ(0)", WebkitOverflowScrolling: "touch" }} data-testid="apercu-page" onClickCapture={plein ? clic : undefined}>
          <div
            style={ordinateur ? { width: 1200, transform: `scale(${echelle})`, transformOrigin: "top left", height: `${100 / echelle}%` } : undefined}
            {...(plein ? {} : { inert: true, "aria-hidden": true })}
          >
            <VuePage contenu={contenu} apercu />
          </div>
        </div>
      </div>
    </div>
  );
}

function Partager({ url, nom, onFermer }: { url: string; nom: string; onFermer: () => void }) {
  const [copie, setCopie] = useState(false);
  const texte = `${nom} : notre site, nos réalisations et nos coordonnées ${url}`;
  return (
    <div role="dialog" aria-modal="true" aria-label="Partager mon site" className="fixed top-0 left-0 z-50 flex h-dvh w-full items-end justify-center bg-black/60 sm:items-center" onClick={onFermer}>
      <div className="w-full max-w-md rounded-t-[24px] bg-surface p-5 sm:rounded-[24px]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[20px] font-extrabold">Partager mon site</h2>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="flex size-11 items-center justify-center rounded-full bg-black/10">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <p className="mb-3 rounded-xl bg-black/5 px-3 py-2 text-[14px] break-all">{url}</p>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
          <Button
            onClick={async () => {
              await navigator.clipboard?.writeText(url).catch(() => undefined);
              setCopie(true);
            }}
          >
            {copie ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />} {copie ? "Lien copié" : "Copier le lien"}
          </Button>
          <a href={`https://wa.me/?text=${encodeURIComponent(texte)}`} target="_blank" rel="noopener" className="pressable flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-line px-4 text-[16px] font-bold">
            Envoyer sur WhatsApp
          </a>
          {typeof navigator !== "undefined" && "share" in navigator ? (
            <Button variant="secondary" onClick={() => navigator.share({ title: nom, text: texte, url }).catch(() => undefined)}>
              <Share2 size={18} aria-hidden="true" /> Autres applications
            </Button>
          ) : null}
        </div>
        <figure className="mt-4 flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/v1/ma-page/qr.svg" alt={`QR code de l'adresse ${url}`} width={180} height={180} className="rounded-xl bg-white p-2" />
          <figcaption className="text-[13px] text-muted">À imprimer sur un devis, un véhicule ou une carte.</figcaption>
        </figure>
      </div>
    </div>
  );
}

/** Les chantiers : un titre (« Toiture ardoise · Paimpol ») et leurs photos ; on les crée, renomme, range et retire. */
function Chantiers({ data, actif, onErreur, onChange }: { data: MaPage; actif: boolean; onErreur: (m: string | null) => void; onChange: (d?: MaPage) => void }) {
  const [titre, setTitre] = useState("");
  const total = data.photos.filter((p) => p.role === "galerie" && p.statut !== "erreur").length;
  const sansChantier = data.photos.filter((p) => p.role === "galerie" && !p.realisationId);
  const apres = async (appel: Promise<MaPage | { page: MaPage }>) => {
    try {
      const d = await appel;
      onChange("page" in d ? d.page : d);
      void rafraichirPagePublique();
    } catch (e) {
      onErreur((e as ApiError).phrase ?? "Ce changement n'a pas été enregistré.");
    }
  };
  const ordre = (i: number, pas: number) => {
    const ids = data.realisations.map((x) => x.id);
    const j = i + pas;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    void apres(api<MaPage>("/v1/ma-page/realisations/ordre", { method: "PUT", body: { ids } }));
  };
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <span className="text-[15px] font-bold">Mes chantiers</span>
      <p className="text-[13px] text-muted">Un chantier = un titre et quelques photos. Sur ton site, la première photo s&apos;affiche en grand ; on la touche pour voir les autres.</p>
      {data.realisations.map((r, i) => (
        <div key={r.id} className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-2xl border border-line p-3">
          <div className="flex items-center gap-1">
            <input
              aria-label="Titre du chantier"
              defaultValue={r.titre}
              maxLength={80}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== r.titre) void apres(api<MaPage>(`/v1/ma-page/realisations/${r.id}`, { method: "PATCH", body: { titre: v } }));
              }}
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-[16px] font-bold"
            />
            <button type="button" aria-label={`Monter « ${r.titre} »`} disabled={i === 0} onClick={() => ordre(i, -1)} className="flex size-11 shrink-0 items-center justify-center rounded-full disabled:opacity-30">
              <ArrowUp size={18} aria-hidden="true" />
            </button>
            <button type="button" aria-label={`Descendre « ${r.titre} »`} disabled={i === data.realisations.length - 1} onClick={() => ordre(i, 1)} className="flex size-11 shrink-0 items-center justify-center rounded-full disabled:opacity-30">
              <ArrowDown size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Retirer le chantier « ${r.titre} »`}
              onClick={() => {
                if (window.confirm(`Retirer « ${r.titre} » et ses photos ?`)) void apres(api<MaPage>(`/v1/ma-page/realisations/${r.id}`, { method: "DELETE" }));
              }}
              className="flex size-11 shrink-0 items-center justify-center rounded-full"
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
          </div>
          <GaleriePhotos photos={data.photos} realisationId={r.id} total={total} max={data.choix.limites.photos} actif={actif} stockage={data.choix.stockagePhotos} onErreur={onErreur} onChange={() => onChange()} />
        </div>
      ))}
      {sansChantier.length ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-2xl border border-dashed border-line p-3">
          <span className="text-[14px] font-bold">Photos sans chantier</span>
          <GaleriePhotos photos={data.photos} realisationId={null} total={total} max={data.choix.limites.photos} actif={false} stockage={data.choix.stockagePhotos} onErreur={onErreur} onChange={() => onChange()} />
        </div>
      ) : null}
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!titre.trim()) return;
          void apres(api<{ page: MaPage }>("/v1/ma-page/realisations", { method: "POST", body: { titre } })).then(() => setTitre(""));
        }}
      >
        <input aria-label="Titre du nouveau chantier" value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={80} placeholder="Toiture ardoise · Paimpol" className="min-h-12 min-w-0 basis-full rounded-xl border border-line bg-surface px-3 text-[16px]" />
        <Button type="submit" variant="secondary" disabled={!titre.trim()}>
          <Plus size={18} aria-hidden="true" /> Nouveau chantier
        </Button>
      </form>
    </div>
  );
}

/** La photo « À propos » : l'artisan ou son équipe, facultative. */
function PhotoEquipe({ data, actif, onErreur, recharger }: { data: MaPage; actif: boolean; onErreur: (m: string | null) => void; recharger: () => Promise<void> }) {
  const photo = data.photos.find((p) => p.role === "equipe");
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
      <span className="text-[15px] font-bold">Photo de toi ou de ton équipe (facultatif)</span>
      <div className="flex flex-wrap items-center gap-3">
        {photo?.variantes[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.variantes[0].webp} alt="Photo de l'équipe" className="h-20 w-28 rounded-xl object-cover" />
        ) : photo ? (
          <Loader2 size={18} className="motion-safe:animate-spin" aria-label="Préparation…" />
        ) : null}
        {actif ? (
          <label className="pressable inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border border-line px-3 text-[14px] font-bold">
            <ImageIcon size={16} aria-hidden="true" /> {photo ? "Changer" : "Ajouter une photo"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                const err = await envoyerPhoto(f, "equipe");
                if (err) onErreur(err);
                await recharger();
              }}
            />
          </label>
        ) : null}
        {photo ? (
          <button
            type="button"
            className="text-[14px] font-bold text-muted underline"
            onClick={async () => {
              await api("/v1/ma-page/equipe", { method: "DELETE" }).catch(() => undefined);
              await recharger();
              void rafraichirPagePublique();
            }}
          >
            Retirer
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function EditeurMaPage() {
  const [data, setData] = useState<MaPage | null>(null);
  const [r, setR] = useState<Reglages | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState<ApiError | null>(null);
  const [etat, setEtat] = useState<Etat>("pret");
  const [apercuPlein, setApercuPlein] = useState(false);
  const fermerApercu = useCallback(() => setApercuPlein(false), []);
  const [partage, setPartage] = useState(false);
  const [proposition, setProposition] = useState<{ accroche: string; presentation: string; source: string; phrase: string | null } | null>(null);
  const [aide, setAide] = useState(false);
  const [nouvelleAdresse, setNouvelleAdresse] = useState<string | null>(null);
  const [versionLogo, setVersionLogo] = useState(0);
  const enAttente = useRef<Partial<Reglages>>({});
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  const charger = useCallback(async () => {
    try {
      const d = await api<MaPage>("/v1/ma-page");
      setData(d);
      setChargement(null);
    } catch (e) {
      setChargement(e instanceof ApiError ? e : new ApiError("network", 0));
    }
  }, []);
  useEffect(() => {
    const c = new AbortController();
    api<MaPage>("/v1/ma-page", { signal: c.signal }).then(
      (d) => {
        setData(d);
        setR(d.reglages);
      },
      (e: unknown) => {
        if (!c.signal.aborted) setChargement(e instanceof ApiError ? e : new ApiError("network", 0));
      },
    );
    return () => c.abort();
  }, []);

  // Une photo en préparation (serveur) : on relit jusqu'à ce qu'elle soit prête.
  const enPreparation = data?.photos.some((p) => p.statut === "traitement") ?? false;
  useEffect(() => {
    if (!enPreparation) return;
    const t = setInterval(() => void charger(), 1500);
    return () => clearInterval(t);
  }, [enPreparation, charger]);

  const enregistrer = useCallback(async () => {
    const corps = enAttente.current;
    enAttente.current = {};
    if (!Object.keys(corps).length) return;
    setEtat("enregistrement");
    try {
      const d = await api<MaPage>("/v1/ma-page", { method: "PATCH", body: corps });
      setData(d);
      // Les valeurs nettoyées par le serveur (site web, téléphone) reviennent, sauf un champ qu'on est en train de taper.
      setR((avant) => (avant ? { ...d.reglages, ...Object.fromEntries(Object.keys(avant).filter((k) => CHAMPS_TEXTE.has(k as keyof Reglages) && k in enAttente.current).map((k) => [k, avant[k as keyof Reglages]])) } as Reglages : d.reglages));
      // « Enregistré : ta page est à jour » seulement quand la page publique est régénérée.
      await rafraichirPagePublique();
      if (!Object.keys(enAttente.current).length) setEtat("enregistre");
      setErreur(null);
    } catch (e) {
      setEtat("erreur");
      setErreur((e as ApiError).phrase ?? "Ce changement n'a pas été enregistré. Réessaie.");
    }
  }, []);

  const changer = useCallback(
    <K extends keyof Reglages>(cle: K, valeur: Reglages[K]) => {
      setR((avant) => (avant ? { ...avant, [cle]: valeur } : avant));
      enAttente.current = { ...enAttente.current, [cle]: valeur };
      setEtat("enregistrement");
      if (minuteur.current) clearTimeout(minuteur.current);
      minuteur.current = setTimeout(() => void enregistrer(), CHAMPS_TEXTE.has(cle) ? 700 : 50);
    },
    [enregistrer],
  );

  const contenu = useMemo<ContenuPage | null>(() => {
    if (!data || !r) return null;
    const vide = (s: string | null) => (s?.trim() ? s.trim() : null);
    return {
      ...data.contenu,
      couleur: r.couleur,
      couleurBoutons: r.couleurBoutons,
      prestations: r.prestations.filter((x) => x.titre.trim()),
      accroche: vide(r.accroche),
      presentation: vide(r.presentation),
      telephone: vide(r.telephone) ?? data.profil.telephone,
      zone: vide(r.zone) ?? data.profil.zone,
      horaires: vide(r.horaires),
      siteWeb: vide(r.siteWeb),
      creeeEn: r.creeeEn,
      certifications: r.certifications,
      adressePostale: r.afficherAdresse ? data.profil.adressePostale : null,
      // La page privée n'a pas de logo public : l'aperçu lit celui du compte.
      logo: data.profil.logo ? `/v1/company/logo?v=${versionLogo}` : null,
    };
  }, [data, r, versionLogo]);

  if (chargement && !data) return <p className="text-[15px] text-muted">Ton site ne s&apos;est pas chargé. Vérifie ta connexion et réessaie.</p>;
  if (!data || !r || !contenu) return <Skeleton lines={6} label="Chargement de ton site…" />;

  const url = `${window.location.origin}/e/${r.adresse}`;
  const theme = data.choix.theme;
  const couleurActive = r.couleur ?? null;
  const teinteMetier = data.choix.teintes.find((x) => x.id === theme.teinte)!;
  const couverture = data.photos.find((p) => p.role === "couverture" && p.id === data.reglages.couvertureId);
  const couvertureEnCours = data.photos.some((p) => p.role === "couverture" && p.statut === "traitement");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 pb-20 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:pb-24">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
        <h1 className="font-display text-[28px] leading-tight font-extrabold tracking-[-0.02em]">Mon site</h1>
        <p className="text-[15px] text-muted">Un vrai site pour ton entreprise, à partager avec tes clients. Chaque changement s&apos;enregistre tout seul.</p>
        {!r.visible ? (
          <a href="#visibilite" className="text-[14px] font-bold underline">
            Ton site est privé pour l&apos;instant : le rendre visible
          </a>
        ) : null}
        {/* L'état de l'enregistrement reste en vue pendant qu'on descend dans l'éditeur. */}
        <div className="pointer-events-none sticky top-2 z-10 grid gap-1 empty:hidden">
          {etat === "enregistrement" || etat === "enregistre" ? (
            <p className="justify-self-start rounded-full bg-surface px-3 py-1 text-[13px] text-muted shadow-card" role="status" aria-live="polite">
              {etat === "enregistrement" ? "Enregistrement…" : "Enregistré : ton site est à jour."}
            </p>
          ) : null}
          {erreur ? (
            <p className="rounded-xl bg-surface px-3 py-2 text-[14px] font-bold text-red-700 shadow-card dark:text-red-300" role="alert">
              {erreur}
            </p>
          ) : null}
        </div>

        <div className="lg:hidden">
          <Apercu contenu={contenu} />
        </div>

        <Card className="grid grid-cols-[minmax(0,1fr)] gap-3 p-4">
          <h2 className="text-[18px] font-extrabold">Couleur des boutons</h2>
          <p className="text-[14px] text-muted">« Appeler », « Demander un devis », les petits traits et la ville du titre.</p>
          <div role="radiogroup" aria-label="Couleur des boutons" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {data.choix.couleursBoutons.map((c, i) => {
              // Le jaune Mobiiz est la valeur par défaut : choisi, rien n'est enregistré (null).
              const actif = (r.couleurBoutons?.toLowerCase() ?? "#fed206") === c.hex.toLowerCase();
              return (
                <button key={c.id} type="button" role="radio" aria-checked={actif} aria-label={c.nom} onClick={() => changer("couleurBoutons", i === 0 ? null : c.hex)} className={`pressable grid justify-items-center gap-1.5 rounded-2xl border-2 px-1 py-2.5 text-[12.5px] font-bold ${actif ? "border-accent bg-accent/15" : "border-line"}`}>
                  {/* Un vrai petit bouton, dans sa couleur. */}
                  <span className="flex h-8 w-full max-w-[84px] items-center justify-center rounded-full text-[11px] font-extrabold" style={{ background: c.hex, color: texteSurCouleur(c.hex) }} aria-hidden="true">
                    Appeler
                  </span>
                  <span className="text-center leading-tight">{c.nom}</span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="grid grid-cols-[minmax(0,1fr)] gap-3 p-4">
          <h2 className="text-[18px] font-extrabold">Teinte</h2>
          <p className="text-[14px] text-muted">La couleur des fonds sombres : l&apos;accueil sans photo, le contact, ton logo.</p>
          <div role="radiogroup" aria-label="Teinte de la page" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[{ id: "metier", nom: "Selon le métier", hex: teinteMetier.hex, valeur: null as string | null }, ...data.choix.teintes.map((c) => ({ ...c, valeur: c.hex as string | null }))].map((c) => {
              const actif = couleurActive === c.valeur;
              return (
                <button key={c.id} type="button" role="radio" aria-checked={actif} onClick={() => changer("couleur", c.valeur)} className={`pressable flex min-h-14 items-center gap-2.5 rounded-2xl border-2 p-2 pr-3 text-left text-[14px] font-bold ${actif ? "border-accent bg-accent/15" : "border-line"}`}>
                  {/* La pastille montre le rendu : la teinte et la couleur des boutons. */}
                  <span className="relative grid size-10 shrink-0 place-items-end overflow-hidden rounded-xl p-1.5" style={{ background: `radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, ${c.hex} 85%, white 10%), ${c.hex} 70%)` }} aria-hidden="true">
                    <span className="h-1.5 w-4 rounded-full" style={{ background: r.couleurBoutons ?? "#FED206" }} />
                  </span>
                  <span className="min-w-0">{c.nom}</span>
                  {actif ? <Check size={16} className="ml-auto shrink-0" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="grid grid-cols-[minmax(0,1fr)] gap-4 p-4">
          <h2 className="text-[18px] font-extrabold">Prestations</h2>
          <p className="text-[14px] text-muted">Ce que tu fais, en quelques blocs : un titre et une phrase. {data.choix.limites.prestations} au plus.</p>
          {r.prestations.map((x, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)] gap-2 rounded-2xl bg-black/5 p-3">
              <div className="flex items-center gap-2">
                <input
                  aria-label={`Titre de la prestation ${i + 1}`}
                  value={x.titre}
                  maxLength={60}
                  placeholder="Couverture ardoise"
                  onChange={(e) => changer("prestations", r.prestations.map((y, k) => (k === i ? { ...y, titre: e.target.value } : y)))}
                  className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-[16px] font-bold"
                />
                <button type="button" aria-label={`Retirer la prestation ${x.titre || i + 1}`} onClick={() => changer("prestations", r.prestations.filter((_, k) => k !== i))} className="flex size-11 shrink-0 items-center justify-center rounded-full">
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </div>
              <textarea
                aria-label={`Phrase de la prestation ${i + 1}`}
                value={x.texte}
                maxLength={200}
                rows={2}
                placeholder="Une phrase pour dire ce que tu fais."
                onChange={(e) => changer("prestations", r.prestations.map((y, k) => (k === i ? { ...y, texte: e.target.value } : y)))}
                className="w-full min-w-0 rounded-xl border border-line bg-surface px-3 py-2 text-[15px]"
              />
            </div>
          ))}
          {r.prestations.length < data.choix.limites.prestations ? (
            <div className="flex flex-wrap gap-2">
              {theme.prestations
                .filter((x) => !r.prestations.some((y) => y.titre === x.titre))
                .map((x) => (
                  <button key={x.titre} type="button" onClick={() => changer("prestations", [...r.prestations, x])} className="pressable inline-flex min-h-11 items-center gap-1 rounded-full border-2 border-line px-3 text-[14px] font-bold">
                    <Plus size={16} aria-hidden="true" /> {x.titre}
                  </button>
                ))}
              <button type="button" onClick={() => changer("prestations", [...r.prestations, { titre: "", texte: "" }])} className="pressable inline-flex min-h-11 items-center gap-1 rounded-full border-2 border-line px-3 text-[14px] font-bold">
                <Plus size={16} aria-hidden="true" /> Autre prestation
              </button>
            </div>
          ) : null}
        </Card>

        <Card className="grid grid-cols-[minmax(0,1fr)] gap-4 p-4">
          <h2 className="text-[18px] font-extrabold">Chantiers</h2>
          <p className="rounded-xl bg-accent/15 px-3 py-2 text-[13px]">
            Mets seulement tes propres photos de chantiers. Avant de publier une photo prise chez un client, demande-lui son accord ; évite les personnes reconnaissables, les plaques d&apos;immatriculation, les numéros de rue et les intérieurs qui permettent de situer un domicile.
          </p>
          {data.choix.stockagePhotos && !data.reglages.photosAccord ? (
            <label className="flex items-start gap-3 rounded-2xl border-2 border-line p-3 text-[14px]">
              <input
                type="checkbox"
                className="mt-0.5 size-6 shrink-0 accent-[#FED206]"
                onChange={async (e) => {
                  if (!e.target.checked) return;
                  const d = await api<MaPage>("/v1/ma-page/accord-photos", { method: "POST" }).catch(() => null);
                  if (d) setData(d);
                  else setErreur("Ton accord n'a pas été enregistré. Réessaie.");
                }}
              />
              <span>
                J&apos;ai pris ces photos ou j&apos;ai le droit de les utiliser. Les clients concernés sont d&apos;accord, et les personnes reconnaissables aussi (salariés compris). Je retire une photo dès qu&apos;on me le demande.
              </span>
            </label>
          ) : null}
          <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
            <span className="text-[15px] font-bold">Photo de couverture</span>
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-line bg-black/5">
              {couverture?.variantes[1] ?? couverture?.variantes[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={(couverture.variantes[1] ?? couverture.variantes[0])!.webp} alt="Photo de couverture" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center p-4 text-center text-[13px] text-muted">{couvertureEnCours ? "Préparation de la photo…" : "Sans photo choisie : la première photo de tes chantiers ouvre ton site. Prends une vue large de la maison terminée."}</span>
              )}
              {couvertureEnCours ? <Loader2 size={20} className="absolute top-3 right-3 motion-safe:animate-spin" aria-hidden="true" /> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {data.choix.stockagePhotos && data.reglages.photosAccord ? (
                <label className="pressable inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border border-line px-3 text-[14px] font-bold">
                  <ImageIcon size={16} aria-hidden="true" /> {couverture ? "Changer la photo" : "Choisir une photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      setErreur(null);
                      const err = await envoyerPhoto(f, "couverture");
                      if (err) setErreur(err);
                      await charger();
                    }}
                  />
                </label>
              ) : null}
              {couverture ? (
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-1 text-[14px] font-bold text-muted underline"
                  onClick={async () => {
                    const d = await api<MaPage>("/v1/ma-page/couverture", { method: "DELETE" }).catch(() => null);
                    if (d) {
                      setData(d);
                      void rafraichirPagePublique();
                    }
                  }}
                >
                  <Trash2 size={14} aria-hidden="true" /> Retirer cette photo
                </button>
              ) : null}
            </div>
          </div>

          <Chantiers data={data} actif={data.choix.stockagePhotos && data.reglages.photosAccord} onErreur={setErreur} onChange={(d) => (d ? setData(d) : void charger())} />
        </Card>

        <Card className="grid grid-cols-[minmax(0,1fr)] gap-4 p-4">
          <h2 className="text-[18px] font-extrabold">À propos</h2>
          <Champ label="Accroche" valeur={r.accroche ?? ""} onChange={(v) => changer("accroche", v || null)} max={data.choix.limites.accroche} placeholder={theme.accroche.replace("{zone}", contenu.zone ? ` à ${contenu.zone}` : "")} aide="Une phrase sous ton nom. Vide : ton métier et ta ville." />
          <Champ label="Présentation" multi valeur={r.presentation ?? ""} onChange={(v) => changer("presentation", v || null)} max={data.choix.limites.presentation} placeholder={theme.presentation} />
          <Button
            variant="secondary"
            pending={aide}
            onClick={async () => {
              setAide(true);
              try {
                setProposition(await api("/v1/ma-page/aide-ecriture", { method: "POST", body: { accroche: r.accroche, presentation: r.presentation } }));
              } catch (e) {
                setErreur((e as ApiError).phrase ?? "Mobiiz n'a pas pu écrire pour l'instant.");
              } finally {
                setAide(false);
              }
            }}
          >
            <Sparkles size={18} aria-hidden="true" /> Mobiiz m&apos;aide à l&apos;écrire
          </Button>
          <p className="text-[13px] text-muted">Relis la proposition : n&apos;écris rien que tu ne peux pas prouver.</p>
          {proposition ? (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-2 rounded-2xl border-2 border-accent p-3" data-testid="proposition">
              <p className="text-[13px] text-muted">{proposition.phrase ?? (proposition.source === "ia" ? "Proposition de Mobiiz (compte comme une analyse). Modifie-la à ta guise." : "Proposition tirée de ton profil. Modifie-la à ta guise.")}</p>
              <p className="font-bold">{proposition.accroche}</p>
              <p className="text-[15px] whitespace-pre-line">{proposition.presentation}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    changer("accroche", proposition.accroche);
                    changer("presentation", proposition.presentation);
                    setProposition(null);
                  }}
                >
                  Utiliser ces textes
                </Button>
                <Button variant="secondary" onClick={() => setProposition(null)}>
                  Garder les miens
                </Button>
              </div>
            </div>
          ) : null}
          <PhotoEquipe data={data} actif={data.choix.stockagePhotos && data.reglages.photosAccord} onErreur={setErreur} recharger={charger} />
        </Card>

        <Card className="grid grid-cols-[minmax(0,1fr)] gap-3 p-4" id="visibilite" data-testid="visibilite">
          <Interrupteur actif={r.visible} onChange={(v) => changer("visible", v)} label="Page visible" aide={r.visible ? "En ligne : tout le monde peut voir ton site avec le lien." : "Privé : personne ne le voit pour l'instant."} />
          {r.masquee ? <p className="rounded-xl bg-red-500/10 px-3 py-2 text-[14px] font-bold text-red-700 dark:text-red-300">Ton site a été masqué par l&apos;équipe Mobiiz après un signalement. Écris-nous à contact@mobiiz.fr.</p> : null}
          <p className="text-[14px] break-all">
            <span className="text-muted">Adresse : </span>
            <span className="font-bold">{url.replace(/^https?:\/\//, "")}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {r.visible && !r.masquee ? (
              <a href={`/e/${r.adresse}?depuis=mon-site`} className="pressable inline-flex min-h-12 items-center gap-2 rounded-2xl border-2 border-line px-4 font-bold">
                <ExternalLink size={18} aria-hidden="true" /> Ouvrir en ligne
              </a>
            ) : null}
            <Button variant="secondary" onClick={() => setPartage(true)} disabled={!r.visible}>
              <Share2 size={18} aria-hidden="true" /> Partager
            </Button>
          </div>
          {!r.visible ? <p className="text-[13px] text-muted">Rends ton site visible pour le partager.</p> : null}
        </Card>

        <Card className="grid grid-cols-[minmax(0,1fr)] gap-4 p-4">
          <h2 className="text-[18px] font-extrabold">Coordonnées</h2>
          <div className="rounded-2xl bg-black/5 p-3 text-[14px]">
            <p>
              <span className="font-bold">{data.profil.nom}</span> · {data.profil.metiers.map((m) => LIBELLES[m] ?? m).join(", ") || "métier à choisir"}
            </p>
            <p className="text-muted">
              Repris de ton profil et synchronisés. <Link href="/compte/entreprise" className="font-bold underline">Modifier dans Mon entreprise</Link>
            </p>
          </div>
          <Champ label="Téléphone" type="tel" inputMode="tel" valeur={r.telephone ?? ""} onChange={(v) => changer("telephone", v || null)} max={25} placeholder={data.profil.telephone ?? "06 12 34 56 78"} aide={data.profil.telephone ? "Vide : celui de ton profil, mis à jour tout seul." : "Le bouton « Appeler » apparaît avec un numéro."} />
          <Champ label="Zone d'intervention" valeur={r.zone ?? ""} onChange={(v) => changer("zone", v || null)} max={120} placeholder={data.profil.zone ?? "Lannion, Perros-Guirec, Trégor"} aide={data.profil.zone ? `Vide : ${data.profil.zone}, d'après ton profil.` : undefined} />
          <Champ label="Horaires" valeur={r.horaires ?? ""} onChange={(v) => changer("horaires", v || null)} max={200} placeholder="Du lundi au vendredi, 8 h – 18 h" />
          <Champ label="Ton autre site internet" type="url" inputMode="url" valeur={r.siteWeb ?? ""} onChange={(v) => changer("siteWeb", v || null)} max={200} placeholder="www.mon-entreprise.fr" aide="Si tu en as déjà un : un lien « Voir mon site » apparaît en bas de ton site Mobiiz." />
          <AnneeChamp valeur={r.creeeEn} onChange={(n) => changer("creeeEn", n)} />
          <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
            <span className="text-[14px] font-bold">Certifications et assurances</span>
            <div className="flex flex-wrap gap-2">
              {[...new Set([...data.choix.certifications, ...r.certifications])].map((c) => {
                const actif = r.certifications.includes(c);
                return (
                  <button key={c} type="button" aria-pressed={actif} onClick={() => changer("certifications", actif ? r.certifications.filter((x) => x !== c) : [...r.certifications, c].slice(0, 10))} className={`pressable min-h-11 rounded-full border-2 px-3 text-[14px] font-bold ${actif ? "border-accent bg-accent/20" : "border-line"}`}>
                    {actif ? "✓ " : ""}
                    {c}
                  </button>
                );
              })}
            </div>
            <input
              placeholder="Autre (ex. : Handibat), puis Entrée"
              maxLength={60}
              className="min-h-12 rounded-xl border border-line bg-surface px-4 text-[16px]"
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const v = e.currentTarget.value.trim();
                if (v && !r.certifications.includes(v)) changer("certifications", [...r.certifications, v].slice(0, 10));
                e.currentTarget.value = "";
              }}
            />
            <span className="text-[13px] text-muted">Seulement ce que tu as vraiment, à jour : tu en es responsable. « Entreprise vérifiée » s&apos;ajoute tout seul quand ton SIRET est vérifié{data.profil.verifiee ? " (c'est le cas)" : ""}.</span>
          </div>
          {data.profil.adressePostale ? (
            <Interrupteur actif={r.afficherAdresse} onChange={(v) => changer("afficherAdresse", v)} label="Afficher mon adresse" aide={`${data.profil.adressePostale}. Désactivé : seule ta zone s'affiche.`} />
          ) : null}
          <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
            <span className="text-[15px] font-bold">Logo</span>
            <div className="flex flex-wrap items-center gap-3">
              {data.profil.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/v1/company/logo?v=${versionLogo}`} alt="Logo actuel" className="size-16 rounded-xl border border-line bg-white object-contain" />
              ) : (
                <span className="flex size-16 items-center justify-center rounded-xl border border-dashed border-line text-[12px] text-muted">Initiales</span>
              )}
              <label className="pressable inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border border-line px-3 text-[14px] font-bold">
                <ImageIcon size={16} aria-hidden="true" /> {data.profil.logo ? "Remplacer" : "Ajouter un logo"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    try {
                      const { reduireImage } = await import("@/lib/reduire-image");
                      const blob = await reduireImage(f, 512, 0.9);
                      if (blob.size > 500_000) throw new Error("Logo trop lourd (500 Ko au plus).");
                      const form = new FormData();
                      form.append("file", blob, "logo.jpg");
                      await api("/v1/company/logo", { method: "PUT", body: form });
                      setVersionLogo((v) => v + 1);
                      await charger();
                      void rafraichirPagePublique();
                    } catch (err) {
                      setErreur((err as ApiError).phrase ?? (err as Error).message ?? "Le logo n'a pas été enregistré.");
                    }
                  }}
                />
              </label>
              {data.profil.logo ? (
                <button
                  type="button"
                  className="text-[14px] font-bold text-muted underline"
                  onClick={async () => {
                    if (!window.confirm("Retirer le logo ? Il disparaît aussi de tes demandes de prix.")) return;
                    await api("/v1/company/logo", { method: "DELETE" }).catch(() => undefined);
                    await charger();
                    void rafraichirPagePublique();
                  }}
                >
                  Retirer
                </button>
              ) : null}
            </div>
            <span className="text-[13px] text-muted">Le même logo que sur tes demandes de prix. Sans logo, tes initiales s&apos;affichent.</span>
          </div>

        </Card>

        <Card className="grid grid-cols-[minmax(0,1fr)] gap-3 p-4">
          <h2 className="text-[18px] font-extrabold">Adresse du site</h2>
          <p className="text-[15px] break-all">{url.replace(/^https?:\/\//, "")}</p>
          {r.adresseModifiable ? (
            nouvelleAdresse === null ? (
              <Button variant="secondary" onClick={() => setNouvelleAdresse(r.adresse)}>
                Modifier l&apos;adresse (une seule fois)
              </Button>
            ) : (
              <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
                <label className="grid grid-cols-[minmax(0,1fr)] gap-1 text-[14px] font-bold">
                  Nouvelle adresse
                  <span className="flex items-center rounded-xl border border-line bg-surface px-3">
                    <span className="text-muted">/e/</span>
                    <input value={nouvelleAdresse} maxLength={50} onChange={(e) => setNouvelleAdresse(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} className="min-h-12 min-w-0 flex-1 bg-transparent px-1 text-[16px] outline-none" />
                  </span>
                </label>
                <p className="text-[13px] text-muted">Tu ne pourras plus la changer ensuite. L&apos;ancienne adresse continuera de mener à ton site.</p>
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      try {
                        const d = await api<MaPage>("/v1/ma-page/adresse", { method: "PUT", body: { adresse: nouvelleAdresse } });
                        setData(d);
                        setR(d.reglages);
                        setNouvelleAdresse(null);
                        void rafraichirPagePublique();
                      } catch (e) {
                        setErreur((e as ApiError).phrase ?? "Cette adresse n'est pas possible.");
                      }
                    }}
                  >
                    Valider
                  </Button>
                  <Button variant="secondary" onClick={() => setNouvelleAdresse(null)}>
                    Annuler
                  </Button>
                </div>
              </div>
            )
          ) : (
            <p className="text-[13px] text-muted">Adresse déjà modifiée une fois.</p>
          )}
        </Card>
      </div>

      <div className="sticky top-4 hidden lg:block">
        <Apercu contenu={contenu} />
      </div>
      {/* « Voir mon site » flottant (Greg, 17 novembre 2026) : toujours à portée de pouce, au-dessus du menu sur téléphone.
          Il ouvre le site en plein écran, qui défile, avec « Retour » en haut. RÈGLE CHANGÉE : avant, un bouton en bas de l'éditeur. */}
      {apercuPlein ? null : (
        <button
          type="button"
          onClick={() => setApercuPlein(true)}
          className="pressable fixed right-4 z-40 flex min-h-14 items-center gap-2 rounded-full bg-accent px-5 text-[16px] font-extrabold text-on-accent shadow-float lg:right-8 lg:bottom-8!"
          style={{ bottom: "calc(var(--nav-space) + 4px)" }}
        >
          <Eye size={20} aria-hidden="true" /> Voir mon site
        </button>
      )}
      {apercuPlein ? <Apercu contenu={contenu} plein onFermer={fermerApercu} /> : null}
      {partage ? <Partager url={url} nom={data.profil.nom} onFermer={() => setPartage(false)} /> : null}
    </div>
  );
}
