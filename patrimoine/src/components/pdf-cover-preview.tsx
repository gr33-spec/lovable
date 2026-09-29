import type { PdfCover } from "@/lib/types";
import type { PdfColors } from "@/lib/pdf/prefs";

// Aperçu de la couverture du dossier PDF, dessiné en HTML avec les mêmes
// couleurs et la même composition que le vrai document (lib/pdf/bank.tsx).
// Les tailles sont relatives à la largeur de l'aperçu (unités cqw).

export function CoverPreview({ style, colors: c, title, subtitle, recipient, kicker = "Présentation patrimoniale", brand }: { style: PdfCover; colors: PdfColors; title: string; subtitle?: string; recipient?: string; kicker?: string; brand: string }) {
  const gradient = `linear-gradient(145deg, ${c.deep} 0%, ${c.deep2} 55%, ${c.deep3} 100%)`;
  const halos = `radial-gradient(circle at 92% 4%, ${c.glow}55 0%, transparent 42%), radial-gradient(circle at 4% 100%, ${c.brand}88 0%, transparent 55%)`;
  const letter = (brand.replace(/^(SC|SCI|SAS|SARL|EURL|SA)\s+(DU\s+|DE\s+LA\s+|DE\s+|DES\s+)?/i, "").trim()[0] ?? "P").toUpperCase();
  const head = (onDark: boolean) => (
    <>
      <div className="flex items-center gap-[2cqw]">
        <span className="flex h-[5cqw] w-[5cqw] items-center justify-center rounded-[1.4cqw] text-[2.6cqw] font-extrabold" style={{ background: onDark ? c.glow : c.brand, color: onDark ? c.deep : "#fff" }}>
          {letter}
        </span>
        <span className="truncate text-[1.9cqw] font-bold uppercase tracking-[0.25em]" style={{ color: onDark ? "#fff" : c.deep }}>
          {brand}
        </span>
      </div>
    </>
  );
  const titleBlock = (onDark: boolean) => (
    <>
      <div className="flex items-center gap-[1.6cqw]">
        <span className="h-[0.45cqw] w-[5.5cqw] rounded-full" style={{ background: onDark ? c.glow : c.brand }} />
        <span className="text-[1.8cqw] font-bold uppercase tracking-[0.3em]" style={{ color: onDark ? c.glow : c.brand }}>
          {kicker}
        </span>
      </div>
      <div className="mt-[3cqw] line-clamp-2 text-[7.4cqw] font-extrabold leading-[1.08] tracking-tight" style={{ color: onDark ? "#fff" : c.deep }}>
        {title}
      </div>
      {subtitle && (
        <div className="mt-[2cqw] truncate text-[2.8cqw] font-semibold" style={{ color: onDark ? c.muted : "#4d5663" }}>
          {subtitle}
        </div>
      )}
      {recipient && (
        <span className="mt-[3.5cqw] inline-block max-w-full truncate rounded-full border px-[2.4cqw] py-[1cqw] text-[1.9cqw]" style={{ borderColor: onDark ? c.deep3 : c.muted, background: onDark ? c.deep2 : c.soft, color: onDark ? "#fff" : c.deep }}>
          À l&apos;attention de <b>{recipient}</b>
        </span>
      )}
    </>
  );
  const kpis = (onDark: boolean, boxed = false) => (
    <div className="flex gap-[2.4cqw]">
      {[0.62, 0.8, 0.7].map((w, i) => (
        <div key={i} className={`flex-1 ${boxed ? "rounded-[1.6cqw] border p-[2cqw]" : "border-t-[0.4cqw] pt-[1.8cqw]"}`} style={boxed ? { borderColor: "#e4e7ec", background: c.stripe } : { borderColor: onDark ? c.glow : "#e4e7ec" }}>
          <div className="h-[1cqw] w-[45%] rounded-full" style={{ background: onDark ? c.muted : "#c9ced6", opacity: 0.7 }} />
          <div className="mt-[1.4cqw] h-[2.6cqw] rounded-full" style={{ width: `${w * 100}%`, background: onDark ? "#fff" : c.deep }} />
        </div>
      ))}
    </div>
  );
  const foot = (onDark: boolean) => (
    <div className="absolute inset-x-[7.4cqw] bottom-[5cqw] flex gap-[4cqw] border-t pt-[2.4cqw]" style={{ borderColor: onDark ? c.deep3 : "#e4e7ec" }}>
      {[0, 1].map((col) => (
        <div key={col} className="flex-1 space-y-[1cqw]">
          <div className="h-[0.9cqw] w-[35%] rounded-full" style={{ background: onDark ? c.glow : c.brand }} />
          {[0.8, 0.6, 0.7].map((w, i) => (
            <div key={i} className="h-[0.8cqw] rounded-full" style={{ width: `${w * 100}%`, background: onDark ? "#ffffff" : "#c9ced6", opacity: onDark ? 0.45 : 1 }} />
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="@container relative aspect-[210/297] w-full overflow-hidden rounded-[10px] bg-white shadow-[0_12px_30px_-10px_rgba(15,27,45,0.35)] ring-1 ring-black/5" aria-hidden>
      {style === "immersive" && (
        <>
          <div className="absolute inset-0" style={{ background: `${halos}, ${gradient}` }} />
          <div className="absolute right-[-22cqw] top-[12cqw] h-[57cqw] w-[57cqw] rounded-full border" style={{ borderColor: `${c.glow}33` }} />
          <div className="absolute left-[7.4cqw] right-[7.4cqw] top-[8.4cqw]">{head(true)}</div>
          <div className="absolute left-[7.4cqw] right-[12cqw] top-[39cqw]">{titleBlock(true)}</div>
          <div className="absolute inset-x-[7.4cqw] top-[88cqw]">{kpis(true)}</div>
          {foot(true)}
        </>
      )}
      {style === "bandeau" && (
        <>
          <div className="absolute inset-x-0 top-0 h-[62cqw]" style={{ background: `${halos}, ${gradient}` }} />
          <div className="absolute left-[7.4cqw] right-[7.4cqw] top-[8.4cqw]">{head(true)}</div>
          <div className="absolute left-[7.4cqw] right-[12cqw] top-[27cqw]">{titleBlock(true)}</div>
          <div className="absolute inset-x-[7.4cqw] top-[72cqw]">{kpis(false, true)}</div>
          {foot(false)}
        </>
      )}
      {style === "epure" && (
        <>
          <div className="absolute inset-y-0 left-0 w-[2cqw]" style={{ background: c.brand }} />
          <div className="absolute inset-y-0 left-[2cqw] w-[0.7cqw]" style={{ background: c.muted }} />
          <div className="absolute right-[-12cqw] top-[-10cqw] h-[43cqw] w-[43cqw] rounded-full" style={{ background: c.soft }} />
          <div className="absolute left-[8.8cqw] right-[7.4cqw] top-[8.4cqw]">{head(false)}</div>
          <div className="absolute left-[8.8cqw] right-[12cqw] top-[40cqw]">
            {titleBlock(false)}
          </div>
          <div className="absolute left-[8.8cqw] right-[7.4cqw] top-[89cqw]">{kpis(false)}</div>
          {foot(false)}
        </>
      )}
    </div>
  );
}
