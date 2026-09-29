import { imageSrc, imageSrcSet, type ImageRef } from "@/lib/image-ref";

// Image responsive : le navigateur choisit la taille adaptée à l'écran
// (srcset), un aperçu flou s'affiche pendant le chargement, les images hors
// écran ne se chargent qu'au défilement (lazy).

export function Img({
  image,
  alt,
  sizes,
  priority = false,
  className = "",
  fit = "cover",
  fallbackLabel,
}: {
  image: ImageRef | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fit?: "cover" | "contain";
  fallbackLabel?: string;
}) {
  if (!image) {
    return (
      <div className={`flex items-center justify-center bg-surface-2 text-text-2 ${className}`} role="img" aria-label={alt}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true" className="opacity-60">
          <path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z" />
          <path d="M18 15l.8 2 2 .7-2 .8-.8 2-.8-2-2-.8 2-.7z" />
        </svg>
        {fallbackLabel && <span className="sr-only">{fallbackLabel}</span>}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- variantes pré-générées et servies par le CDN
    <img
      src={imageSrc(image, 640)}
      srcSet={imageSrcSet(image)}
      sizes={sizes}
      width={image.w}
      height={image.h}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding={priority ? "sync" : "async"}
      className={className}
      style={{
        objectFit: fit,
        backgroundImage: image.ph ? `url(${image.ph})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />
  );
}
