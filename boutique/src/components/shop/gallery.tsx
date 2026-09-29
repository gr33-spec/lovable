"use client";

import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { imageSrc, imageSrcSet, type ImageRef } from "@/lib/image-ref";

// Galerie de la fiche produit : défilement natif au doigt (scroll-snap,
// fluide même sur un téléphone modeste), points de position, miniatures sur
// grand écran, plein écran avec zoom au pincement.

export function Gallery({ images, name }: { images: ImageRef[]; name: string }) {
  const track = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);

  const onScroll = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const target = Math.max(0, Math.min(images.length - 1, i));
    el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
  };

  useEffect(() => {
    const el = track.current;
    el?.addEventListener("scroll", onScroll, { passive: true });
    return () => el?.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  if (!images.length) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-[var(--radius-card)] bg-surface-2 text-text-2" role="img" aria-label={`${name} — photo à venir`}>
        Photo à venir
      </div>
    );
  }

  return (
    <div className="md:sticky md:top-[calc(var(--header-h)+16px)]">
      <div className="relative -mx-4 sm:mx-0">
        <div
          ref={track}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain no-scrollbar sm:rounded-[var(--radius-card)]"
          aria-roledescription="carrousel"
          aria-label={`Photos de ${name}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(index + 1);
            if (e.key === "ArrowLeft") go(index - 1);
          }}
        >
          {images.map((img, i) => (
            <div key={img.id} className="relative aspect-square w-full shrink-0 snap-center bg-surface-2" aria-roledescription="diapositive" aria-label={`${i + 1} sur ${images.length}`}>
              <button type="button" className="block h-full w-full cursor-zoom-in" onClick={() => zoomRef.current?.showModal()} aria-label="Agrandir la photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc(img, 1024)}
                  srcSet={imageSrcSet(img)}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  alt={img.alt || (i === 0 ? name : `${name} — photo ${i + 1}`)}
                  width={img.w}
                  height={img.h}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  className="h-full w-full object-cover"
                  style={{ backgroundImage: `url(${img.ph})`, backgroundSize: "cover" }}
                  draggable={false}
                />
              </button>
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className="btn btn-icon absolute top-1/2 left-3 hidden -translate-y-1/2 bg-surface/90 shadow-soft disabled:opacity-0 md:inline-flex" aria-label="Photo précédente">
              <ChevronLeft size={20} />
            </button>
            <button type="button" onClick={() => go(index + 1)} disabled={index === images.length - 1} className="btn btn-icon absolute top-1/2 right-3 hidden -translate-y-1/2 bg-surface/90 shadow-soft disabled:opacity-0 md:inline-flex" aria-label="Photo suivante">
              <ChevronRight size={20} />
            </button>
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 md:hidden" aria-hidden="true">
              {images.map((img, i) => (
                <span key={img.id} className={`h-1.5 rounded-full bg-white shadow transition-all ${i === index ? "w-5 opacity-100" : "w-1.5 opacity-60"}`} />
              ))}
            </div>
          </>
        )}
        <span className="pointer-events-none absolute right-3 bottom-3 hidden items-center gap-1 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-medium shadow-soft md:flex" aria-hidden="true">
          <ZoomIn size={14} /> Agrandir
        </span>
      </div>

      {images.length > 1 && (
        <ul className="mt-3 hidden gap-2 md:flex" aria-label="Miniatures">
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`Voir la photo ${i + 1}`}
                aria-current={i === index}
                className="block h-20 w-20 overflow-hidden rounded-xl border-2 border-transparent opacity-70 transition aria-[current=true]:border-primary aria-[current=true]:opacity-100 hover:opacity-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageSrc(img, 320)} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={zoomRef}
        aria-label={`Photos de ${name} en grand`}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0"
        onClick={(e) => e.target === zoomRef.current && zoomRef.current?.close()}
      >
        <button type="button" onClick={() => zoomRef.current?.close()} className="btn btn-icon fixed top-[max(12px,env(safe-area-inset-top))] right-3 z-10 bg-white/90 text-black" aria-label="Fermer">
          <X size={22} />
        </button>
        <div className="flex h-full snap-x snap-mandatory overflow-x-auto no-scrollbar">
          {images.map((img, i) => (
            <div key={img.id} className="flex h-full w-screen shrink-0 snap-center items-center justify-center overflow-auto" style={{ touchAction: "pan-x pan-y pinch-zoom" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${img.base}/${img.widths[img.widths.length - 1]}.webp`} alt={img.alt || `${name} — photo ${i + 1}`} className="max-h-full max-w-full object-contain" loading="lazy" />
            </div>
          ))}
        </div>
      </dialog>
    </div>
  );
}
