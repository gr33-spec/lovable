import localFont from "next/font/local";
import type { PdfCover } from "@/lib/types";
import type { PdfColors } from "@/lib/pdf/prefs";

// Mêmes polices que le PDF (fichiers embarqués, servis par l'application).
const serif = localFont({ src: "../lib/pdf/fonts/fraunces-latin-600-normal.woff", display: "swap" });
const serifItalic = localFont({ src: "../lib/pdf/fonts/fraunces-latin-400-italic.woff", display: "swap" });
const grotesk = localFont({ src: "../lib/pdf/fonts/space-grotesk-latin-700-normal.woff", display: "swap" });

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
      {style === "editorial" && (
        <div className="absolute inset-0" style={{ background: "#fcfbf8" }}>
          <div className="absolute inset-x-[7.4cqw] top-[7.4cqw] flex items-end justify-between border-b-[0.3cqw] border-[#1c1b18] pb-[1.4cqw]">
            <span className="truncate text-[1.7cqw] font-bold uppercase tracking-[0.3em] text-[#1c1b18]">{brand}</span>
            <span className={`${serifItalic.className} text-[2cqw] text-[#56524a]`}>Édition</span>
          </div>
          <div className="absolute left-[7.4cqw] right-[10cqw] top-[25cqw]">
            <div className="text-[1.7cqw] font-bold uppercase tracking-[0.3em]" style={{ color: c.brand }}>{kicker}</div>
            <div className={`${serif.className} mt-[2.6cqw] line-clamp-3 text-[9cqw] leading-[1.02] tracking-tight`} style={{ color: c.deep }}>{title}</div>
            {subtitle && <div className={`${serifItalic.className} mt-[2cqw] truncate text-[3.2cqw] text-[#56524a]`}>{subtitle}</div>}
            {recipient && <div className={`${serifItalic.className} mt-[3cqw] truncate text-[2.1cqw] text-[#1c1b18]`}>— À l&apos;attention de {recipient}</div>}
          </div>
          <div className="absolute inset-x-0 bottom-0 h-[50cqw]" style={{ background: gradient }}>
            <div className="absolute inset-x-[7.4cqw] top-[5cqw] flex gap-[3cqw]">
              {[0.55, 0.8, 0.7].map((v, i) => (
                <div key={i} className="flex-1">
                  <div className="h-[0.9cqw] w-[50%] rounded-full" style={{ background: c.glow, opacity: 0.8 }} />
                  <div className="mt-[1.2cqw] h-[3.4cqw] rounded-[0.6cqw]" style={{ width: `${v * 100}%`, background: "#fff" }} />
                </div>
              ))}
            </div>
            <div className="absolute inset-x-[7.4cqw] bottom-[5cqw] space-y-[1cqw] border-t pt-[2cqw]" style={{ borderColor: c.deep3 }}>
              {[0.5, 0.4].map((w, i) => (
                <div key={i} className="h-[0.8cqw] rounded-full bg-white/40" style={{ width: `${w * 100}%` }} />
              ))}
            </div>
          </div>
        </div>
      )}
      {style === "bento" && (
        <div className="absolute inset-0 p-[4.7cqw]" style={{ background: c.deep }}>
          <div className="relative h-[74cqw] overflow-hidden rounded-[3.4cqw] p-[4.4cqw]" style={{ background: `radial-gradient(circle at 90% 5%, ${c.glow}55 0%, transparent 45%), linear-gradient(145deg, ${c.brand} 0%, ${c.deep3} 55%, ${c.deep2} 100%)` }}>
            <div className="flex items-center gap-[1.6cqw]">
              <span className="flex h-[4.4cqw] w-[4.4cqw] items-center justify-center rounded-[1.2cqw] text-[2.3cqw] font-extrabold" style={{ background: c.glow, color: c.deep }}>{letter}</span>
              <span className="truncate text-[1.7cqw] font-bold uppercase tracking-[0.25em] text-white">{brand}</span>
            </div>
            <div className="absolute inset-x-[4.4cqw] bottom-[4.4cqw]">
              <div className="text-[1.6cqw] font-bold uppercase tracking-[0.3em]" style={{ color: c.soft }}>{kicker}</div>
              <div className={`${grotesk.className} mt-[2cqw] line-clamp-2 text-[7.6cqw] leading-[1.02] tracking-tight text-white`}>{title}</div>
              {subtitle && <div className="mt-[1.4cqw] truncate text-[2.4cqw]" style={{ color: c.soft }}>{subtitle}</div>}
              {recipient && <span className="mt-[2.4cqw] inline-block max-w-full truncate rounded-[2cqw] px-[2cqw] py-[0.8cqw] text-[1.8cqw] text-white" style={{ background: c.deep }}>À l&apos;attention de <b>{recipient}</b></span>}
            </div>
          </div>
          <div className="mt-[1.8cqw] flex gap-[1.8cqw]">
            {[0.55, 0.8, 0.7].map((v, i) => (
              <div key={i} className="flex h-[20cqw] flex-1 flex-col justify-between rounded-[2.8cqw] p-[2.4cqw]" style={{ background: c.deep2 }}>
                <div className="h-[0.9cqw] w-[55%] rounded-full bg-white/30" />
                <div className="h-[3.4cqw] rounded-[0.6cqw]" style={{ width: `${v * 100}%`, background: "#fff" }} />
              </div>
            ))}
          </div>
          <div className="mt-[1.8cqw] flex gap-[1.8cqw]">
            <div className="h-[24cqw] flex-[1.5] rounded-[2.8cqw]" style={{ background: c.deep2 }} />
            <div className="h-[24cqw] flex-1 rounded-[2.8cqw]" style={{ background: c.deep2 }} />
          </div>
        </div>
      )}
      {style === "suisse" && (
        <div className="absolute inset-0 bg-white">
          <div className="absolute inset-x-0 top-0 h-[79cqw]" style={{ background: c.brand }}>
            <div className="absolute inset-y-0 left-1/3 w-px opacity-40" style={{ background: c.muted }} />
            <div className="absolute inset-y-0 left-2/3 w-px opacity-40" style={{ background: c.muted }} />
            <div className="absolute inset-x-[7.4cqw] top-[7.4cqw] flex justify-between text-[1.6cqw] font-bold uppercase tracking-[0.25em] text-white">
              <span className="truncate">{brand}</span>
            </div>
            <div className="absolute left-[7.4cqw] right-[10cqw] bottom-[5.4cqw]">
              <div className="text-[1.6cqw] font-bold uppercase tracking-[0.3em]" style={{ color: c.soft }}>{kicker}</div>
              <div className={`${grotesk.className} mt-[2.2cqw] line-clamp-2 text-[8.4cqw] leading-[0.98] tracking-tighter text-white`}>{title}</div>
              {subtitle && <div className="mt-[1.8cqw] truncate text-[2.6cqw]" style={{ color: c.soft }}>{subtitle}</div>}
            </div>
          </div>
          <div className="absolute inset-x-[7.4cqw] top-[84cqw]">
            {recipient && <div className="mb-[2.6cqw] truncate text-[2cqw] font-semibold text-[#111316]"><span className="mr-[2cqw] text-[1.5cqw] uppercase tracking-[0.2em] text-[#4a4d52]">À l&apos;attention de</span>{recipient}</div>}
            <div className="flex border-t-[0.5cqw] border-[#111316]">
              {[0.55, 0.8, 0.7].map((v, i) => (
                <div key={i} className={`flex-1 pt-[1.6cqw] ${i ? "border-l border-[#dcdddf] pl-[2cqw]" : ""}`}>
                  <div className="h-[0.8cqw] w-[50%] rounded-full bg-[#c9ccd0]" />
                  <div className="mt-[1.2cqw] h-[3.4cqw] rounded-[0.6cqw]" style={{ width: `${v * 100}%`, background: "#111316" }} />
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-x-[7.4cqw] bottom-[5cqw] border-t-[0.3cqw] border-[#111316] pt-[2cqw]">
            <div className="h-[0.9cqw] w-[20%]" style={{ background: c.brand }} />
          </div>
        </div>
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
