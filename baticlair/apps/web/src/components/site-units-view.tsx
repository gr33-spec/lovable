"use client";

import { ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui";
import type { SiteUnitItem, SiteUnits } from "@/lib/api";

/**
 * LE CHANTIER PAR LOGEMENT (retour du fondateur, 2026-10-05 : « mettre de l'ordre, logement 1 tant de prises…,
 * logement 2…, puis on regroupe pour l'envoi au fournisseur ; il faut penser ça comme des professionnels »). Les
 * quantités du devis, rangées par logement ; les logements identiques en un seul bloc « × 6 ». Le total à commander
 * reste la liste des fournitures, à l'onglet d'à côté.
 */
export function SiteUnitsView({
  data,
  onTotal,
}: {
  data: SiteUnits;
  onTotal: () => void;
}) {
  return (
    <section
      aria-label="Le chantier par logement"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col px-1">
        <h2 className="font-display text-[20px] font-extrabold tracking-[-0.02em]">
          Le chantier par logement
        </h2>
        <p className="text-[14px] font-bold text-muted">
          {data.count} logements
          {data.units.length < data.count
            ? ` · ${data.units.length} types différents`
            : ""}
        </p>
      </div>
      {data.units.map((u) => (
        <Block
          key={u.key}
          title={
            u.labels.length > 1
              ? `${u.labels.length} logements identiques`
              : u.labels[0]!
          }
          times={u.labels.length > 1 ? u.labels.length : null}
          detail={u.labels.length > 1 ? u.labels.join(", ") : null}
          items={u.items}
        />
      ))}
      {data.other.length > 0 ? (
        <Block
          title="Hors logements (parties communes…)"
          times={null}
          detail={null}
          items={data.other}
        />
      ) : null}
      <p className="px-1 text-[13px] leading-snug text-muted">
        Les quantités du devis, rangées par logement. Le total, calculé aux
        unités du fournisseur, est dans « Total à commander ».
      </p>
      <Button onClick={onTotal}>
        Voir le total à commander
        <ArrowRight size={18} aria-hidden="true" />
      </Button>
    </section>
  );
}

function Block({
  title,
  times,
  detail,
  items,
}: {
  title: string;
  times: number | null;
  detail: string | null;
  items: SiteUnitItem[];
}) {
  return (
    <article
      aria-label={title}
      className="flex flex-col overflow-hidden rounded-[20px] bg-surface shadow-card"
    >
      <header className="flex items-start gap-3 border-b border-ink/15 px-4 py-3">
        <Building2
          size={20}
          className="mt-0.5 shrink-0 text-accent-text"
          aria-hidden="true"
        />
        <span className="flex min-w-0 grow flex-col">
          <span className="text-[16px] leading-snug font-extrabold">
            {title}
          </span>
          {detail ? (
            <span className="line-clamp-2 text-[13px] text-muted">
              {detail}
            </span>
          ) : null}
        </span>
        {times ? (
          <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-0.5 text-[14px] font-extrabold text-accent-text">
            × {times}
          </span>
        ) : null}
      </header>
      <ul className="flex flex-col divide-y divide-ink/15 px-4">
        {items.map((i) => (
          <li
            key={i.lineIds[0]}
            className="flex items-baseline justify-between gap-3 py-2"
          >
            <span className="min-w-0 text-[14px] leading-snug font-semibold">
              {i.designation}
            </span>
            <span className="shrink-0 text-[15px] font-extrabold whitespace-nowrap tabular-nums">
              {quantity(i)}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

/** « 14 », « 25 ml » ; l'unité « u » ne s'écrit pas. */
const quantity = (i: SiteUnitItem) =>
  i.quantity === null
    ? "?"
    : !i.unit || /^(u|unités?|pi[eè]ces?|pcs?)$/i.test(i.unit.trim())
      ? i.quantity
      : `${i.quantity} ${i.unit === "m2" ? "m²" : i.unit}`;
