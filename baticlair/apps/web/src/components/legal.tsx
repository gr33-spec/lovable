import Link from "next/link";
import { PAGES_LEGALES } from "@/lib/legal";

/** Le pied des pages légales et de la connexion : les quatre pages, puis le retour. */
/** `clair` : sur un fond de nuit (la landing), les liens passent en blanc atténué. */
export function LiensLegaux({ sauf, clair = false }: { sauf?: string; clair?: boolean }) {
  return (
    <nav aria-label="Pages légales" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {PAGES_LEGALES.filter((p) => p.href !== sauf).map((p) => (
        <Link key={p.href} href={p.href} className={`font-semibold underline ${clair ? "text-white/70" : "text-muted"}`}>
          {p.label}
        </Link>
      ))}
    </nav>
  );
}

export const styleLegal = { h2: "font-display text-lg font-extrabold", p: "text-[15px] leading-relaxed", ul: "text-[15px] leading-relaxed list-disc pl-5" };
