import { Fragment } from "react";

/** Étoile à 4 branches (éclat de paillette). Décorative uniquement. */
export function Sparkle({ size = 18, className = "", delay = 0 }: { size?: number; className?: string; delay?: 0 | 1 | 2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`twinkle ${delay ? `delay-${delay}` : ""} ${className}`}
      fill="currentColor"
    >
      <path d="M12 0c.6 5.6 2.9 9.4 12 12-9.1 2.6-11.4 6.4-12 12-.6-5.6-2.9-9.4-12-12C9.1 9.4 11.4 5.6 12 0z" />
    </svg>
  );
}

/**
 * Texte avec mots mis en valeur : « Bijoux en résine *pailletée* » → le mot
 * entre étoiles scintille. La créatrice choisit elle-même le mot, depuis
 * l'administration. Rien n'est interprété comme du HTML.
 */
export function Highlighted({ text }: { text: string }) {
  const parts = text.split(/\*([^*]{1,40})\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="text-shimmer">
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** Même texte, sans les étoiles (titres de page, partages, e-mails). */
export function plainText(text: string): string {
  return text.replace(/\*([^*]{1,40})\*/g, "$1");
}
