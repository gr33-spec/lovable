import type { Metadata } from "next";
import Link from "next/link";
import { SocialLinks } from "@/components/shop/footer";
import { Img } from "@/components/ui/img";
import { renderRichText } from "@/lib/rich-text";
import { getSettings } from "@/lib/server/cached";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: "L'atelier", description: s.aboutText.slice(0, 155), alternates: { canonical: "/a-propos" } };
}

export default async function AboutPage() {
  const s = await getSettings();
  return (
    <div className="container-page py-10 sm:py-16">
      <div className="grid items-start gap-10 md:grid-cols-[1fr_1.1fr] md:gap-16">
        <div className="aspect-[4/5] overflow-hidden rounded-[28px] bg-secondary shadow-soft md:sticky md:top-24">
          <Img image={s.aboutImage ?? s.logo} alt={s.aboutImage?.alt || s.shopName} sizes="(min-width: 768px) 45vw, 100vw" priority fit={s.aboutImage ? "cover" : "contain"} className="h-full w-full" />
        </div>
        <div>
          <p className="eyebrow">L&apos;atelier</p>
          <h1 className="mt-2 text-4xl sm:text-5xl">{s.aboutTitle || s.shopName}</h1>
          <div className="prose-shop mt-6 text-[17px]">{renderRichText(s.aboutText)}</div>
          {s.socials.length > 0 && (
            <div className="mt-8">
              <p className="mb-3 font-semibold">Suivre l&apos;atelier</p>
              <SocialLinks socials={s.socials} />
            </div>
          )}
          <Link href="/boutique" className="btn btn-primary mt-10">
            Découvrir les créations
          </Link>
        </div>
      </div>
    </div>
  );
}
