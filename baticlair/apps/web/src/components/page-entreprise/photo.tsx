import type { PhotoPublique } from "@baticlair/domain/page-entreprise";

/** Une photo en AVIF puis WebP, à la bonne taille pour l'écran, chargée seulement quand elle approche. */
export function Photo({ photo, alt, sizes, prioritaire = false, className = "" }: { photo: PhotoPublique; alt: string; sizes: string; prioritaire?: boolean; className?: string }) {
  const v = photo.variantes;
  if (!v.length) return null;
  const moyenne = v[Math.min(1, v.length - 1)]!;
  return (
    <picture>
      <source type="image/avif" srcSet={v.map((x) => `${x.avif} ${x.largeur}w`).join(", ")} sizes={sizes} />
      <source type="image/webp" srcSet={v.map((x) => `${x.webp} ${x.largeur}w`).join(", ")} sizes={sizes} />
      <img
        src={moyenne.webp}
        alt={alt}
        width={photo.largeur || undefined}
        height={photo.hauteur || undefined}
        loading={prioritaire ? "eager" : "lazy"}
        decoding={prioritaire ? "sync" : "async"}
        {...(prioritaire ? { fetchPriority: "high" as const } : {})}
        className={className}
      />
    </picture>
  );
}

