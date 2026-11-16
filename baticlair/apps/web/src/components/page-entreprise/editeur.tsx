"use client";

import { ArrowDown, ArrowUp, Check, Copy, ExternalLink, Eye, Image as ImageIcon, Loader2, Monitor, Plus, Share2, Smartphone, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ContenuPage, type Prestation } from "@baticlair/domain/page-entreprise";
import { EnTeteRubrique } from "@/components/en-tete-rubrique";
import { Button, Card, Skeleton } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { envoyerPhoto, GaleriePhotos, type PhotoEditeur } from "./editeur-photos";
import { rafraichirPagePublique } from "./rafraichir";
import { LIBELLES, VuePage } from "./vue-page";

/**
 * « MA PAGE » (Greg, 16 novembre 2026), depuis Profil › Mon entreprise. Réglée en 5 minutes au téléphone : chaque
 * changement s'enregistre tout seul et s'applique tout de suite (page publique régénérée), l'aperçu se dessine en direct
 * pendant qu'on touche. Interface dans la charte Mobiiz ; la page, elle, prend les couleurs de l'artisan.
 */
interface Reglages {
  visible: boolean;
  masquee: boolean;
  adresse: string;
  adresseModifiable: boolean;
  couleur: string | null;
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
    <label className="grid gap-1.5">
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
  const [largeur, setLargeur] = useState(360);
  useEffect(() => {
    const el = cadre.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLargeur(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const ordinateur = ecran === "ordinateur";
  const echelle = ordinateur ? Math.min(1, largeur / 1200) : 1;
  return (
    <div className={plein ? "fixed top-0 left-0 z-50 flex h-dvh w-full flex-col bg-black/80 p-3" : "grid gap-2"}>
      <div className="flex items-center justify-between gap-2">
        <div role="radiogroup" aria-label="Taille de l'aperçu" className="flex gap-1 rounded-full bg-black/10 p-1">
          {(["telephone", "ordinateur"] as const).map((e) => (
            <button key={e} type="button" role="radio" aria-checked={ecran === e} onClick={() => setEcran(e)} className={`flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold ${ecran === e ? "bg-surface shadow" : plein ? "text-white" : ""}`}>
              {e === "telephone" ? <Smartphone size={15} aria-hidden="true" /> : <Monitor size={15} aria-hidden="true" />} {e === "telephone" ? "Téléphone" : "Ordinateur"}
            </button>
          ))}
        </div>
        {plein ? (
          <button type="button" onClick={onFermer} aria-label="Fermer l'aperçu" className="flex size-11 items-center justify-center rounded-full bg-white text-black">
            <X size={20} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div ref={cadre} className={`mx-auto w-full overflow-hidden rounded-[28px] border-[6px] border-black/80 bg-black/80 ${ordinateur ? "" : "max-w-[390px]"} ${plein ? "flex-1" : ""}`}>
        {/* Le `transform` fait du cadre le repère de la barre d'appel (position fixe) : elle reste dans l'aperçu. */}
        <div className="overflow-y-auto bg-white" style={{ height: plein ? "100%" : ordinateur ? 640 * echelle : 620, transform: "translateZ(0)" }} data-testid="apercu-page" inert aria-hidden="true">
          <div style={ordinateur ? { width: 1200, transform: `scale(${echelle})`, transformOrigin: "top left", height: `${100 / echelle}%` } : undefined}>
            <VuePage contenu={contenu} apercu />
          </div>
        </div>
      </div>
    </div>
  );
}

function Partager({ url, nom, onFermer }: { url: string; nom: string; onFermer: () => void }) {
  const [copie, setCopie] = useState(false);
  const texte = `${nom} : notre page, nos réalisations et nos coordonnées ${url}`;
  return (
    <div role="dialog" aria-modal="true" aria-label="Partager ma page" className="fixed top-0 left-0 z-50 flex h-dvh w-full items-end justify-center bg-black/60 sm:items-center" onClick={onFermer}>
      <div className="w-full max-w-md rounded-t-[24px] bg-surface p-5 sm:rounded-[24px]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[20px] font-extrabold">Partager ma page</h2>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="flex size-11 items-center justify-center rounded-full bg-black/10">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <p className="mb-3 rounded-xl bg-black/5 px-3 py-2 text-[14px] break-all">{url}</p>
        <div className="grid gap-2">
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
    <div className="grid gap-4">
      <span className="text-[15px] font-bold">Mes chantiers</span>
      <p className="text-[13px] text-muted">Un chantier = un titre et quelques photos. Sur ta page, la première photo s&apos;affiche en grand ; on la touche pour voir les autres.</p>
      {data.realisations.map((r, i) => (
        <div key={r.id} className="grid gap-3 rounded-2xl border border-line p-3">
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
            <button type="button" aria-label={`Monter « ${r.titre} »`} disabled={i === 0} onClick={() => ordre(i, -1)} className="flex size-11 items-center justify-center rounded-full disabled:opacity-30">
              <ArrowUp size={18} aria-hidden="true" />
            </button>
            <button type="button" aria-label={`Descendre « ${r.titre} »`} disabled={i === data.realisations.length - 1} onClick={() => ordre(i, 1)} className="flex size-11 items-center justify-center rounded-full disabled:opacity-30">
              <ArrowDown size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Retirer le chantier « ${r.titre} »`}
              onClick={() => {
                if (window.confirm(`Retirer « ${r.titre} » et ses photos ?`)) void apres(api<MaPage>(`/v1/ma-page/realisations/${r.id}`, { method: "DELETE" }));
              }}
              className="flex size-11 items-center justify-center rounded-full"
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
          </div>
          <GaleriePhotos photos={data.photos} realisationId={r.id} total={total} max={data.choix.limites.photos} actif={actif} stockage={data.choix.stockagePhotos} onErreur={onErreur} onChange={() => onChange()} />
        </div>
      ))}
      {sansChantier.length ? (
        <div className="grid gap-3 rounded-2xl border border-dashed border-line p-3">
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
    <div className="grid gap-2">
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

  if (chargement && !data) return <p className="text-[15px] text-muted">Ta page ne s&apos;est pas chargée. Vérifie ta connexion et réessaie.</p>;
  if (!data || !r || !contenu) return <Skeleton lines={6} label="Chargement de ta page…" />;

  const url = `${window.location.origin}/e/${r.adresse}`;
  const theme = data.choix.theme;
  const couleurActive = r.couleur ?? null;
  const teinteMetier = data.choix.teintes.find((x) => x.id === theme.teinte)!;
  const couverture = data.photos.find((p) => p.role === "couverture" && p.id === data.reglages.couvertureId);
  const couvertureEnCours = data.photos.some((p) => p.role === "couverture" && p.statut === "traitement");

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
      <div className="grid gap-4">
        <EnTeteRubrique titre="Ma page" />
        <p className="text-[15px] text-muted">Une vraie page pour ton entreprise, à partager avec tes clients. Remplis quelques champs, ajoute tes photos de chantiers : elle se fabrique toute seule.</p>

        <Card className="grid gap-3 p-4">
          <Interrupteur actif={r.visible} onChange={(v) => changer("visible", v)} label="Page visible" aide={r.visible ? "En ligne : tout le monde peut la voir avec le lien." : "Privée : personne ne la voit pour l'instant."} />
          {r.masquee ? <p className="rounded-xl bg-red-500/10 px-3 py-2 text-[14px] font-bold text-red-700 dark:text-red-300">Ta page a été masquée par l&apos;équipe Mobiiz après un signalement. Écris-nous à contact@mobiiz.fr.</p> : null}
          <p className="text-[14px] break-all">
            <span className="text-muted">Adresse : </span>
            <span className="font-bold">{url.replace(/^https?:\/\//, "")}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {r.visible && !r.masquee ? (
              <a href={`/e/${r.adresse}`} target="_blank" rel="noopener" className="pressable inline-flex min-h-12 items-center gap-2 rounded-2xl bg-accent px-4 font-bold text-on-accent">
                <ExternalLink size={18} aria-hidden="true" /> Voir ma page
              </a>
            ) : (
              <Button onClick={() => setApercuPlein(true)}>
                <Eye size={18} aria-hidden="true" /> Voir ma page
              </Button>
            )}
            <Button variant="secondary" onClick={() => setPartage(true)} disabled={!r.visible}>
              <Share2 size={18} aria-hidden="true" /> Partager
            </Button>
          </div>
          {!r.visible ? <p className="text-[13px] text-muted">Rends ta page visible pour la partager.</p> : null}
          <p className="text-[13px] text-muted" role="status" aria-live="polite">
            {etat === "enregistrement" ? "Enregistrement…" : etat === "enregistre" ? "Enregistré : ta page est à jour." : null}
          </p>
          {erreur ? (
            <p className="text-[14px] font-bold text-red-700 dark:text-red-300" role="alert">
              {erreur}
            </p>
          ) : null}
        </Card>

        <div className="lg:hidden">
          <Apercu contenu={contenu} />
        </div>

        <Card className="grid gap-3 p-4">
          <h2 className="text-[18px] font-extrabold">Teinte</h2>
          <p className="text-[14px] text-muted">Pour les détails de ta page. Le bouton « Appeler » reste jaune.</p>
          <div role="radiogroup" aria-label="Teinte de la page" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <button type="button" role="radio" aria-checked={couleurActive === null} onClick={() => changer("couleur", null)} className={`pressable flex min-h-12 items-center gap-2 rounded-2xl border-2 px-3 text-left text-[14px] font-bold ${couleurActive === null ? "border-accent bg-accent/15" : "border-line"}`}>
              <span className="size-6 shrink-0 rounded-full" style={{ background: teinteMetier.hex }} aria-hidden="true" /> Selon le métier
            </button>
            {data.choix.teintes.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={couleurActive === c.hex} onClick={() => changer("couleur", c.hex)} className={`pressable flex min-h-12 items-center gap-2 rounded-2xl border-2 px-3 text-left text-[14px] font-bold ${couleurActive === c.hex ? "border-accent bg-accent/15" : "border-line"}`}>
                <span className="size-6 shrink-0 rounded-full" style={{ background: c.hex }} aria-hidden="true" /> {c.nom}
              </button>
            ))}
          </div>
        </Card>

        <Card className="grid gap-4 p-4">
          <h2 className="text-[18px] font-extrabold">Prestations</h2>
          <p className="text-[14px] text-muted">Ce que tu fais, en quelques blocs : un titre et une phrase. {data.choix.limites.prestations} au plus.</p>
          {r.prestations.map((x, i) => (
            <div key={i} className="grid gap-2 rounded-2xl bg-black/5 p-3">
              <div className="flex items-center gap-2">
                <input
                  aria-label={`Titre de la prestation ${i + 1}`}
                  value={x.titre}
                  maxLength={60}
                  placeholder="Couverture ardoise"
                  onChange={(e) => changer("prestations", r.prestations.map((y, k) => (k === i ? { ...y, titre: e.target.value } : y)))}
                  className="min-h-12 flex-1 rounded-xl border border-line bg-surface px-3 text-[16px] font-bold"
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
                className="rounded-xl border border-line bg-surface px-3 py-2 text-[15px]"
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

        <Card className="grid gap-4 p-4">
          <h2 className="text-[18px] font-extrabold">Photos</h2>
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
          <div className="grid gap-2">
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

          <div className="grid gap-2">
            <span className="text-[15px] font-bold">Photo de couverture</span>
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-line bg-black/5">
              {couverture?.variantes[1] ?? couverture?.variantes[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={(couverture.variantes[1] ?? couverture.variantes[0])!.webp} alt="Photo de couverture" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center p-4 text-center text-[13px] text-muted">{couvertureEnCours ? "Préparation de la photo…" : "Sans photo choisie : la première photo de tes chantiers ouvre ta page. Prends une vue large de la maison terminée."}</span>
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

          <PhotoEquipe data={data} actif={data.choix.stockagePhotos && data.reglages.photosAccord} onErreur={setErreur} recharger={charger} />
        </Card>

        <Card className="grid gap-4 p-4">
          <h2 className="text-[18px] font-extrabold">Ce que tu dis de toi</h2>
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
            <div className="grid gap-2 rounded-2xl border-2 border-accent p-3" data-testid="proposition">
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
        </Card>

        <Card className="grid gap-4 p-4">
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
          <Champ label="Mon site web" type="url" inputMode="url" valeur={r.siteWeb ?? ""} onChange={(v) => changer("siteWeb", v || null)} max={200} placeholder="www.mon-entreprise.fr" aide="Un bouton « Voir mon site » apparaît sur ta page." />
          <AnneeChamp valeur={r.creeeEn} onChange={(n) => changer("creeeEn", n)} />
          <div className="grid gap-2">
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
        </Card>

        <Card className="grid gap-3 p-4">
          <h2 className="text-[18px] font-extrabold">Adresse de la page</h2>
          <p className="text-[15px] break-all">{url.replace(/^https?:\/\//, "")}</p>
          {r.adresseModifiable ? (
            nouvelleAdresse === null ? (
              <Button variant="secondary" onClick={() => setNouvelleAdresse(r.adresse)}>
                Modifier l&apos;adresse (une seule fois)
              </Button>
            ) : (
              <div className="grid gap-2">
                <label className="grid gap-1 text-[14px] font-bold">
                  Nouvelle adresse
                  <span className="flex items-center rounded-xl border border-line bg-surface px-3">
                    <span className="text-muted">/e/</span>
                    <input value={nouvelleAdresse} maxLength={50} onChange={(e) => setNouvelleAdresse(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} className="min-h-12 flex-1 bg-transparent px-1 text-[16px] outline-none" />
                  </span>
                </label>
                <p className="text-[13px] text-muted">Tu ne pourras plus la changer ensuite. L&apos;ancienne adresse continuera de mener à ta page.</p>
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
      {apercuPlein ? <Apercu contenu={contenu} plein onFermer={() => setApercuPlein(false)} /> : null}
      {partage ? <Partager url={url} nom={data.profil.nom} onFermer={() => setPartage(false)} /> : null}
    </div>
  );
}
