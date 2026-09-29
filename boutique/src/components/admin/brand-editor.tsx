"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveBrandAction } from "@/app/admin/actions";
import type { ImageRef } from "@/lib/image-ref";
import { SOCIAL_LABELS, SOCIAL_NETWORKS, type SocialNetwork } from "@/lib/validation";
import { SocialIcon } from "../ui/social-icon";
import { ImagePicker } from "./image-picker";
import { Notice, useToast, useUnsavedGuard } from "./ui";

interface Brand {
  shopName: string;
  tagline: string;
  introText: string;
  aboutTitle: string;
  aboutText: string;
  logo: ImageRef | null;
  favicon: ImageRef | null;
  hero: ImageRef | null;
  aboutImage: ImageRef | null;
  socials: { network: SocialNetwork; url: string }[];
}

const PLACEHOLDERS: Record<SocialNetwork, string> = {
  facebook: "https://www.facebook.com/…",
  instagram: "https://www.instagram.com/…",
  whatsapp: "06 12 34 56 78",
  tiktok: "https://www.tiktok.com/@…",
  pinterest: "https://www.pinterest.fr/…",
  youtube: "https://www.youtube.com/@…",
  site: "https://…",
};

export function BrandEditor({ initial }: { initial: Brand }) {
  const [b, setB] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [socials, setSocials] = useState<Record<SocialNetwork, string>>(
    () => Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n, initial.socials.find((s) => s.network === n)?.url ?? ""])) as Record<SocialNetwork, string>,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const dirty = useMemo(() => JSON.stringify({ ...b, socials }) !== JSON.stringify({ ...saved, socials: Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n, saved.socials.find((s) => s.network === n)?.url ?? ""])) }), [b, socials, saved]);
  useUnsavedGuard(dirty);
  const set = <K extends keyof Brand>(k: K, v: Brand[K]) => setB((prev) => ({ ...prev, [k]: v }));

  const save = () => {
    setError(null);
    start(async () => {
      const res = await saveBrandAction({
        shopName: b.shopName,
        tagline: b.tagline,
        introText: b.introText,
        aboutTitle: b.aboutTitle,
        aboutText: b.aboutText,
        logoImageId: b.logo?.id ?? null,
        faviconImageId: b.favicon?.id ?? null,
        heroImageId: b.hero?.id ?? null,
        aboutImageId: b.aboutImage?.id ?? null,
        socials: SOCIAL_NETWORKS.map((network) => ({ network, url: socials[network] })),
      });
      if (res.ok) {
        setSaved(b);
        toast("Identité de la boutique enregistrée.");
        router.refresh();
      } else setError(res.error);
    });
  };

  return (
    <section aria-labelledby="titre-marque" className="space-y-6 pb-40 lg:pb-24">
      <h2 id="titre-marque" className="font-serif text-2xl">
        Identité de la marque
      </h2>
      <div className="card grid gap-6 p-5 md:grid-cols-2">
        <ImagePicker label="Logo" hint="Idéalement carré, sur fond clair." value={b.logo} onChange={(v) => set("logo", v)} round />
        <ImagePicker label="Icône de l'onglet (favicon)" hint="Facultatif : le logo est utilisé sinon." value={b.favicon} onChange={(v) => set("favicon", v)} round />
        <ImagePicker label="Visuel d'accueil" hint="Grande photo en haut de l'accueil (portrait conseillé). Sinon : la dernière création." value={b.hero} onChange={(v) => set("hero", v)} />
        <ImagePicker label="Photo de l'atelier" hint="Pour la page « L'atelier » (vous, vos mains, votre table de travail…)." value={b.aboutImage} onChange={(v) => set("aboutImage", v)} />
      </div>
      <div className="card space-y-4 p-5">
        <label className="block">
          <span className="field-label">Nom de la boutique</span>
          <input className="input" value={b.shopName} maxLength={80} onChange={(e) => set("shopName", e.target.value)} />
        </label>
        <label className="block">
          <span className="field-label">Phrase d&apos;accroche (titre de l&apos;accueil)</span>
          <input className="input" value={b.tagline} maxLength={160} onChange={(e) => set("tagline", e.target.value)} />
        </label>
        <label className="block">
          <span className="field-label">Courte introduction</span>
          <textarea className="input !min-h-20" value={b.introText} maxLength={600} onChange={(e) => set("introText", e.target.value)} />
        </label>
        <label className="block">
          <span className="field-label">Titre de la présentation</span>
          <input className="input" value={b.aboutTitle} maxLength={120} onChange={(e) => set("aboutTitle", e.target.value)} />
        </label>
        <label className="block">
          <span className="field-label">Présentation de la créatrice (page « L&apos;atelier »)</span>
          <textarea className="input !min-h-48" value={b.aboutText} maxLength={6000} onChange={(e) => set("aboutText", e.target.value)} />
        </label>
      </div>
      <div className="card space-y-3 p-5">
        <h3 className="font-sans text-base font-semibold">Réseaux sociaux</h3>
        <p className="text-sm text-text-2">Laissez vide un réseau que vous n&apos;utilisez pas. Pour WhatsApp, indiquez simplement votre numéro.</p>
        {SOCIAL_NETWORKS.map((n) => (
          <label key={n} className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary" aria-hidden="true">
              <SocialIcon network={n} />
            </span>
            <span className="sr-only">{SOCIAL_LABELS[n]}</span>
            <input className="input" value={socials[n]} placeholder={PLACEHOLDERS[n]} inputMode={n === "whatsapp" ? "tel" : "url"} onChange={(e) => setSocials({ ...socials, [n]: e.target.value })} />
          </label>
        ))}
      </div>
      {error && <Notice tone="danger">{error}</Notice>}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-64">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-3">
          <p className="flex-1 text-sm text-text-2">{dirty ? "Modifications non enregistrées" : "Tout est enregistré"}</p>
          <button type="button" className="btn btn-primary" disabled={pending || !dirty} onClick={save}>
            {pending && <Loader2 size={18} className="animate-spin" aria-hidden="true" />} Enregistrer
          </button>
        </div>
      </div>
    </section>
  );
}
