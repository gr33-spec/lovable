"use client";

import { Check, Palette, RotateCcw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveThemeAction } from "@/app/admin/actions";
import { CUSTOM_THEME_ID, customTheme, getTheme, isHexColor, THEMES, themeCss, themeStyle, type CustomPalette, type Theme } from "@/lib/themes";
import { useToast } from "./ui";

// Choix des couleurs du site.
//  - Toucher un thème l'applique IMMÉDIATEMENT en aperçu (toute la page change),
//    sans rien enregistrer ; « Appliquer à la boutique » l'enregistre.
//  - « Créer ma palette » : 3 couleurs seulement, tout le reste est calculé
//    (survol, fonds pâles, bordures, textes) avec des contrastes garantis.

const DEFAULT_PALETTE: CustomPalette = { primary: "#7A4E6B", secondary: "#F3E6EC", accent: "#C9A86A" };

function applyPreview(theme: Theme) {
  const style = document.getElementById("theme");
  if (style) style.textContent = themeCss(theme);
}

/** Vignette : un vrai petit morceau de boutique dans les couleurs du thème. */
function ThemeSwatch({ theme }: { theme: Theme }) {
  const t = theme.tokens;
  return (
    <div className="overflow-hidden rounded-xl border" style={{ ...themeStyle(theme), background: t.background, borderColor: t.border }} aria-hidden="true">
      <div className="flex items-center justify-between px-2.5 pt-2 pb-1.5" style={{ borderBottom: `1px solid ${t.border}`, background: t.surface }}>
        <span className="font-serif text-[12px] leading-none" style={{ color: t.text }}>
          La Bohème
        </span>
        <span className="flex gap-1">
          <span className="h-1 w-3 rounded-full" style={{ background: t.border }} />
          <span className="h-1 w-3 rounded-full" style={{ background: t.primary }} />
        </span>
      </div>
      <div className="flex gap-2 p-2.5">
        <div className="relative h-14 w-11 shrink-0 rounded-t-full rounded-b-md" style={{ background: t.secondary }}>
          <Sparkles size={10} className="absolute top-1.5 right-1" style={{ color: t.accent }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-semibold tracking-[0.14em] uppercase" style={{ color: t.accentText }}>
            Nouveau
          </p>
          <p className="font-serif text-[13px] leading-tight" style={{ color: t.text }}>
            Fleurs <em style={{ color: t.accentText }}>pailletées</em>
          </p>
          <span className="mt-1.5 inline-block rounded-full px-2.5 py-1 text-[9px] font-semibold" style={{ background: t.primary, color: t.onPrimary }}>
            Ajouter
          </span>
        </div>
      </div>
      <div className="flex h-2.5">
        <span className="flex-[3]" style={{ background: t.primary }} />
        <span className="flex-[2]" style={{ background: t.secondary }} />
        <span className="flex-[1]" style={{ background: t.accent }} />
      </div>
    </div>
  );
}

/** Aperçu plus grand, qui suit le thème affiché (variables CSS de la page). */
function LivePreview() {
  return (
    <div className="card overflow-hidden" aria-label="Aperçu de la boutique">
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <span className="font-serif text-lg">La Bohème en Paillettes</span>
        <span className="hidden gap-4 text-xs font-medium text-text-2 sm:flex">
          <span className="text-primary">Boutique</span>
          <span>Nouveautés</span>
          <span>L&apos;atelier</span>
        </span>
      </div>
      <div className="grid gap-5 bg-bg p-4 sm:grid-cols-[1.2fr_1fr] sm:p-6">
        <div>
          <p className="eyebrow">Fait main</p>
          <p className="mt-2 font-serif text-3xl leading-tight">
            Bijoux en résine <em className="text-accent-text">pailletée</em>
          </p>
          <p className="mt-2 text-sm text-text-2">Texte courant et informations secondaires, toujours lisibles.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="btn btn-primary btn-sm">Ajouter au panier</span>
            <span className="btn btn-outline btn-sm">Nouveautés</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip !border-primary !bg-primary !text-on-primary">Boucles d&apos;oreilles</span>
            <span className="chip">Broches</span>
            <span className="badge bg-primary-soft text-primary">Sélection</span>
          </div>
        </div>
        <div className="rounded-[20px] border border-border bg-surface p-3 shadow-soft">
          <div className="relative aspect-[4/3] rounded-t-[999px] rounded-b-2xl bg-secondary">
            <Sparkles size={18} className="absolute top-4 right-5 text-accent" aria-hidden="true" />
            <span className="badge absolute bottom-2 left-2 bg-surface text-[10px] tracking-[0.08em] uppercase">Nouveau</span>
          </div>
          <p className="mt-3 text-[15px] font-medium">Fleurs pailletées</p>
          <p className="text-sm text-text-2">24,00 €</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border bg-surface-2 px-4 py-3 text-xs">
        {[
          ["Fond", "var(--c-bg)"],
          ["Principale", "var(--c-primary)"],
          ["Douce", "var(--c-secondary)"],
          ["Accent", "var(--c-accent)"],
          ["Texte", "var(--c-text)"],
        ].map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5 rounded-full border border-border bg-surface py-1 pr-2.5 pl-1">
            <span className="h-4 w-4 rounded-full border border-border" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function ColorField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  const [shown, setShown] = useState(value);
  // Couleur changée par le sélecteur : on met le texte à jour (sans effet).
  if (value !== shown) {
    setShown(value);
    setText(value);
  }
  const id = `couleur-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} (sélecteur)`}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-12 w-14 shrink-0 cursor-pointer rounded-xl border border-border-strong bg-surface p-1"
        />
        <input
          id={id}
          className="input font-mono uppercase"
          value={text}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => {
            const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
            setText(v);
            if (isHexColor(v)) onChange(v.toUpperCase());
          }}
        />
      </div>
      <p className="field-hint">{hint}</p>
    </div>
  );
}

export function ThemePicker({ current, custom }: { current: string; custom: CustomPalette | null }) {
  const router = useRouter();
  const toast = useToast();
  const [saved, setSaved] = useState({ id: current, palette: custom });
  const [selected, setSelected] = useState(current);
  const [palette, setPalette] = useState<CustomPalette>(custom ?? DEFAULT_PALETTE);
  const [pending, start] = useTransition();
  const savedTheme = useMemo(() => getTheme(saved.id, saved.palette), [saved]);
  const previewTheme = useMemo(() => (selected === CUSTOM_THEME_ID ? customTheme(palette) : getTheme(selected)), [selected, palette]);
  const dirty = selected !== saved.id || (selected === CUSTOM_THEME_ID && JSON.stringify(palette) !== JSON.stringify(saved.palette));
  const savedRef = useRef(savedTheme);
  useEffect(() => {
    savedRef.current = savedTheme;
  }, [savedTheme]);

  // Aperçu immédiat sur toute la page ; en quittant la page sans enregistrer,
  // on revient aux couleurs réellement enregistrées.
  useEffect(() => applyPreview(previewTheme), [previewTheme]);
  useEffect(() => () => applyPreview(savedRef.current), []);

  const adjusted = selected === CUSTOM_THEME_ID && previewTheme.tokens.primary.toUpperCase() !== palette.primary.toUpperCase();

  function save() {
    start(async () => {
      const res = await saveThemeAction(selected, selected === CUSTOM_THEME_ID ? palette : undefined);
      if (res.ok) {
        setSaved({ id: selected, palette: selected === CUSTOM_THEME_ID ? palette : saved.palette });
        toast(`Couleurs « ${previewTheme.name} » appliquées à toute la boutique.`);
        router.refresh();
      } else toast(res.error, "error");
    });
  }

  return (
    <section id="couleurs" className="mb-12 scroll-mt-4" aria-labelledby="titre-theme">
      <h2 id="titre-theme" className="mb-1 font-serif text-3xl">
        Couleurs du site
      </h2>
      <p className="mb-5 max-w-2xl text-sm text-text-2">
        Touchez un thème : il s&apos;affiche aussitôt en aperçu sur cette page. Rien n&apos;est modifié sur la boutique tant que vous n&apos;avez pas touché « Appliquer à la boutique ». Tous les thèmes gardent un fond clair et des textes lisibles.
      </p>

      <div className="sticky top-2 z-20 mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface/95 p-3 pl-4 shadow-soft backdrop-blur" role="status">
        <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          <span className="flex h-6 w-6 shrink-0 overflow-hidden rounded-full border border-border" aria-hidden="true">
            <span className="flex-1" style={{ background: previewTheme.tokens.primary }} />
            <span className="flex-1" style={{ background: previewTheme.tokens.accent }} />
          </span>
          {dirty ? (
            <span>
              Aperçu : <strong>{previewTheme.name}</strong> <span className="text-text-2">(pas encore appliqué)</span>
            </span>
          ) : (
            <span>
              Thème de la boutique : <strong>{savedTheme.name}</strong>
            </span>
          )}
        </span>
        {dirty && (
          <span className="flex gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={pending}
              onClick={() => {
                setSelected(saved.id);
                if (saved.palette) setPalette(saved.palette);
              }}
            >
              <RotateCcw size={15} aria-hidden="true" /> Annuler
            </button>
            <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={save}>
              <Check size={15} aria-hidden="true" /> {pending ? "Application…" : "Appliquer à la boutique"}
            </button>
          </span>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 2xl:grid-cols-4" role="radiogroup" aria-label="Thème">
          {THEMES.map((t) => {
            const active = selected === t.id;
            return (
              <div key={t.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelected(t.id)}
                  className={`group relative block h-full w-full rounded-2xl border bg-surface p-2 text-left transition duration-300 ${active ? "border-primary shadow-lift ring-2 ring-primary/25" : "border-border hover:-translate-y-0.5 hover:shadow-soft"}`}
                >
                  <ThemeSwatch theme={t} />
                  <span className="mt-2 flex items-center gap-1.5 px-1 text-sm font-semibold">
                    {active && <Check size={14} className="text-primary" aria-hidden="true" />}
                    {t.name}
                    {saved.id === t.id && <span className="badge ml-auto bg-primary-soft px-2 text-[10px] text-primary">Actuel</span>}
                  </span>
                  <span className="block px-1 pb-1 text-xs leading-snug text-text-2">{t.description}</span>
                </button>
              </div>
            );
          })}
          <div>
            <button
              type="button"
              role="radio"
              aria-checked={selected === CUSTOM_THEME_ID}
              onClick={() => setSelected(CUSTOM_THEME_ID)}
              className={`relative flex h-full min-h-[170px] w-full flex-col rounded-2xl border border-dashed p-2 text-left transition duration-300 ${selected === CUSTOM_THEME_ID ? "border-primary shadow-lift ring-2 ring-primary/25" : "border-border-strong hover:shadow-soft"}`}
            >
              {saved.palette || selected === CUSTOM_THEME_ID ? (
                <ThemeSwatch theme={customTheme(palette)} />
              ) : (
                <span className="flex flex-1 items-center justify-center rounded-xl bg-surface-2 text-primary">
                  <Palette size={28} aria-hidden="true" />
                </span>
              )}
              <span className="mt-2 flex items-center gap-1.5 px-1 text-sm font-semibold">
                {selected === CUSTOM_THEME_ID && <Check size={14} className="text-primary" aria-hidden="true" />}
                Créer ma palette
                {saved.id === CUSTOM_THEME_ID && <span className="badge ml-auto bg-primary-soft px-2 text-[10px] text-primary">Actuel</span>}
              </span>
              <span className="block px-1 pb-1 text-xs leading-snug text-text-2">Trois couleurs, le reste est calculé pour vous.</span>
            </button>
          </div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <LivePreview />
          {selected === CUSTOM_THEME_ID && (
            <div className="card space-y-4 p-4 sm:p-5">
              <div>
                <h3 className="text-base">Ma palette</h3>
                <p className="text-sm text-text-2">Choisissez trois couleurs. Les nuances de survol, les fonds pâles, les bordures et les textes sont calculés automatiquement.</p>
              </div>
              <ColorField label="Couleur principale" hint="Boutons, liens, éléments sélectionnés." value={palette.primary} onChange={(v) => setPalette((p) => ({ ...p, primary: v }))} />
              <ColorField label="Couleur douce" hint="Petits aplats : badges, fonds de photo, encadrés. Toujours éclaircie." value={palette.secondary} onChange={(v) => setPalette((p) => ({ ...p, secondary: v }))} />
              <ColorField label="Accent" hint="Détails : éclats, filets, mot mis en valeur." value={palette.accent} onChange={(v) => setPalette((p) => ({ ...p, accent: v }))} />
              {adjusted && (
                <p className="flex items-start gap-2 rounded-xl bg-info-bg p-3 text-sm text-info">
                  <span className="mt-0.5 flex h-4 w-8 shrink-0 overflow-hidden rounded-full border border-border" aria-hidden="true">
                    <span className="flex-1" style={{ background: palette.primary }} />
                    <span className="flex-1" style={{ background: previewTheme.tokens.primary }} />
                  </span>
                  Votre couleur principale est un peu claire pour porter du texte blanc : les boutons utilisent sa version plus profonde, pour rester lisibles.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
