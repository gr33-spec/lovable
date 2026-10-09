"use client";


/** La bulle où BatiClair parle à l'artisan (« tu »), au-dessus d'une étape du chantier. */

export function AssistantMessage({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="flex items-start gap-2.5" aria-label={label}>
      {/* Sur téléphone, pas de colonne d'avatar : chaque pixel de largeur sert au contenu. */}
      <span aria-hidden="true" className="flex size-8 shrink-0 max-lg:hidden items-center justify-center rounded-[10px] bg-accent font-display text-[15px] font-extrabold text-white">
        B
      </span>
      <div className="flex min-w-0 grow flex-col gap-3 lg:pt-1">{children}</div>
    </div>
  );
}

export function Say({ children }: { children: React.ReactNode }) {
  return <p className="text-[17px] leading-snug font-semibold">{children}</p>;
}
