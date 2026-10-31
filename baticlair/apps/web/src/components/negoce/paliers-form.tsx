"use client";

import { INPUT } from "@/components/ui";
import type { Paliers } from "@/lib/negoce";

/**
 * LES PALIERS DE LIVRAISON (espace négoce, point 2), communs à tous les dépôts : « Gratuite jusqu'à X km », jusqu'à deux
 * paliers payants « Y € jusqu'à Z km », puis « Je ne livre pas au-delà de N km ». Valeurs par défaut proposées.
 */
export interface PaliersSaisis {
  gratuiteJusquaKm: string;
  paliers: { jusquaKm: string; prixHt: string }[];
  maxKm: string;
}

export const depuisPaliers = (p: Paliers): PaliersSaisis => ({ gratuiteJusquaKm: String(p.gratuiteJusquaKm), paliers: p.paliers.map((x) => ({ jusquaKm: String(x.jusquaKm), prixHt: String(x.prixHt) })), maxKm: String(p.maxKm) });
export const versPaliers = (s: PaliersSaisis) => ({ gratuiteJusquaKm: s.gratuiteJusquaKm.trim(), paliers: s.paliers.filter((p) => p.jusquaKm.trim() || p.prixHt.trim()).map((p) => ({ jusquaKm: p.jusquaKm.trim(), prixHt: p.prixHt.trim() })), maxKm: s.maxKm.trim() });

const champ = `${INPUT} w-24 text-right font-bold`;

/** Multimétier (Greg, 25 octobre 2026) : ce que le négoce chiffre. Rien n'est choisi d'office : il coche lui-même. */
export type Offre = "generaliste" | "specialiste";
export interface OffreSaisie {
  offre: Offre | null;
  familles: string[];
}

const FAMILLES_NEGOCE: readonly { id: string; label: string }[] = [
  { id: "couverture", label: "Couverture" },
  { id: "charpente", label: "Charpente" },
  { id: "maconnerie", label: "Maçonnerie" },
  { id: "electricite", label: "Électricité" },
  { id: "plomberie", label: "Plomberie" },
  { id: "amenagement_exterieur", label: "Aménagement extérieur" },
  { id: "menuiseries_fermetures", label: "Menuiseries et fermetures" },
  { id: "second_oeuvre", label: "Second œuvre (plâtrerie, peinture, carrelage, sols)" },
  { id: "serrurerie_metallerie", label: "Serrurerie et métallerie" },
];

/** Le choix est complet : généraliste, ou spécialiste d'au moins une famille. */
export const offreValide = (o: OffreSaisie) => o.offre === "generaliste" || (o.offre === "specialiste" && o.familles.length > 0);

export function OffreForm({ valeur, onChange }: { valeur: OffreSaisie; onChange: (v: OffreSaisie) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-[14px] font-semibold">Ce que vous chiffrez</legend>
      {(
        [
          ["generaliste", "Généraliste : je chiffre toute la liste"],
          ["specialiste", "Spécialiste : je chiffre seulement mes familles"],
        ] as const
      ).map(([id, label]) => (
        <label key={id} className={`flex min-h-12 items-center gap-3 rounded-xl border-2 bg-surface px-4 text-[15px] font-semibold ${valeur.offre === id ? "border-accent" : "border-line"}`}>
          <input type="radio" name="offre-negoce" checked={valeur.offre === id} onChange={() => onChange({ ...valeur, offre: id })} className="size-5 shrink-0 accent-accent" />
          {label}
        </label>
      ))}
      {valeur.offre === "specialiste" ? (
        <div role="group" aria-label="Mes familles" className="flex flex-col gap-1.5 pl-2">
          {FAMILLES_NEGOCE.map((f) => (
            <label key={f.id} className="flex min-h-11 items-center gap-3 text-[15px]">
              <input
                type="checkbox"
                checked={valeur.familles.includes(f.id)}
                onChange={(e) => onChange({ ...valeur, familles: e.currentTarget.checked ? [...valeur.familles, f.id] : valeur.familles.filter((x) => x !== f.id) })}
                className="size-5 shrink-0 accent-accent"
              />
              {f.label}
            </label>
          ))}
          <p className="text-[13px] text-muted">Vous ne recevez que les lignes de ces familles ; une commande sans aucune ne vous envoie rien.</p>
        </div>
      ) : null}
    </fieldset>
  );
}

export function PaliersForm({ valeur, onChange }: { valeur: PaliersSaisis; onChange: (v: PaliersSaisis) => void }) {
  const palier = (i: number, cle: "jusquaKm" | "prixHt", v: string) => {
    const paliers = valeur.paliers.map((p, j) => (j === i ? { ...p, [cle]: v } : p));
    onChange({ ...valeur, paliers });
  };
  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <legend className="px-1 text-[14px] font-semibold">Vos paliers de livraison (pour tous vos dépôts)</legend>
      <label className="flex flex-wrap items-center gap-2 text-[14px] font-semibold">
        Gratuite jusqu&apos;à
        <input inputMode="numeric" aria-label="Livraison gratuite jusqu'à, en km" value={valeur.gratuiteJusquaKm} onChange={(e) => onChange({ ...valeur, gratuiteJusquaKm: e.currentTarget.value })} className={champ} />
        km
      </label>
      {valeur.paliers.map((p, i) => (
        <label key={i} className="flex flex-wrap items-center gap-2 text-[14px] font-semibold">
          <input inputMode="decimal" aria-label={`Prix du palier ${i + 1}, en euros HT`} value={p.prixHt} onChange={(e) => palier(i, "prixHt", e.currentTarget.value)} className={champ} />
          € HT jusqu&apos;à
          <input inputMode="numeric" aria-label={`Distance du palier ${i + 1}, en km`} value={p.jusquaKm} onChange={(e) => palier(i, "jusquaKm", e.currentTarget.value)} className={champ} />
          km
          <button type="button" onClick={() => onChange({ ...valeur, paliers: valeur.paliers.filter((_, j) => j !== i) })} className="text-[13px] font-semibold text-muted underline">
            Retirer
          </button>
        </label>
      ))}
      {valeur.paliers.length < 2 ? (
        <button type="button" onClick={() => onChange({ ...valeur, paliers: [...valeur.paliers, { jusquaKm: "", prixHt: "" }] })} className="self-start text-[14px] font-semibold text-accent-text underline-offset-4 hover:underline">
          Ajouter un palier payant
        </button>
      ) : null}
      <label className="flex flex-wrap items-center gap-2 text-[14px] font-semibold">
        Je ne livre pas au-delà de
        <input inputMode="numeric" aria-label="Distance maximale de livraison, en km" value={valeur.maxKm} onChange={(e) => onChange({ ...valeur, maxKm: e.currentTarget.value })} className={champ} />
        km
      </label>
      <p className="text-[13px] text-muted">Le prix livré de chaque artisan se calcule depuis votre dépôt le plus proche de son chantier.</p>
    </fieldset>
  );
}

/** Les dépôts : au moins un, « Ajouter un dépôt » (multi-boutiques = tous les dépôts). */
export function DepotsForm({ valeur, onChange }: { valeur: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-[14px] font-semibold">Vos dépôts (l&apos;adresse d&apos;où partent vos livraisons)</legend>
      {valeur.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <input aria-label={`Adresse du dépôt ${i + 1}`} value={d} autoComplete="street-address" placeholder="ZA de Kerampont, 22300 Lannion" onChange={(e) => onChange(valeur.map((x, j) => (j === i ? e.currentTarget.value : x)))} className={`${INPUT} min-w-0 grow`} />
          {valeur.length > 1 ? (
            <button type="button" aria-label={`Retirer le dépôt ${i + 1}`} onClick={() => onChange(valeur.filter((_, j) => j !== i))} className="shrink-0 text-[13px] font-semibold text-muted underline">
              Retirer
            </button>
          ) : null}
        </div>
      ))}
      {valeur.length < 10 ? (
        <button type="button" onClick={() => onChange([...valeur, ""])} className="self-start text-[14px] font-semibold text-accent-text underline-offset-4 hover:underline">
          Ajouter un dépôt
        </button>
      ) : null}
    </fieldset>
  );
}

const DEPARTEMENT = /^(\d{2}|2A|2B|97\d|98\d)$/;

/** Les départements desservis : cochés d'office d'après les dépôts, modifiables (retirer, ajouter). */
export function DepartementsForm({ valeur, onChange }: { valeur: string[]; onChange: (v: string[]) => void }) {
  const ajouter = (brut: string) => {
    const d = brut.trim().toUpperCase();
    if (DEPARTEMENT.test(d) && !valeur.includes(d)) onChange([...valeur, d].sort());
  };
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-[14px] font-semibold">Départements desservis</legend>
      <div className="flex flex-wrap items-center gap-2">
        {valeur.map((d) => (
          <span key={d} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-[14px] font-bold">
            {d}
            <button type="button" aria-label={`Retirer le département ${d}`} onClick={() => onChange(valeur.filter((x) => x !== d))} className="text-muted">
              ×
            </button>
          </span>
        ))}
        <input
          aria-label="Ajouter un département"
          placeholder="+ 29"
          maxLength={3}
          className={`${INPUT} w-20 text-center`}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            ajouter(e.currentTarget.value);
            e.currentTarget.value = "";
          }}
          onBlur={(e) => {
            ajouter(e.currentTarget.value);
            e.currentTarget.value = "";
          }}
        />
      </div>
    </fieldset>
  );
}
