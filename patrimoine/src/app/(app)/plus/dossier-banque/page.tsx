"use client";

import { usePageState } from "@/lib/nav";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, CircleAlert, CircleCheck, FileDown, Loader2, Rocket, RotateCcw, Share } from "lucide-react";
import { useStore } from "@/lib/store";
import { computeSnapshot, companyTree } from "@/lib/engine/snapshot";
import { qualityIssues } from "@/lib/engine/quality";
import { companySubset } from "@/lib/engine/subset";
import { sharePdf } from "@/components/tenancy/common";
import { CoverPreview } from "@/components/pdf-cover-preview";
import { AssetsNature } from "@/components/assets-nature";
import { APP_COLOR, DEFAULT_COVER, PDF_COVERS, PDF_SECTIONS, pdfColors, pdfThemeId, prefsQuery } from "@/lib/pdf/prefs";
import { paletteFor, themeDef, THEMES } from "@/lib/theme";
import type { PdfPrefs, PdfSection } from "@/lib/types";
import { Button, Card, Page, PageHeader, SectionTitle, SelectField, Stack, TextField, cx } from "@/components/ui";

export default function DossierBanquePage() {
  const { data, nowMonth, role, setSettings } = useStore();
  const [scope, setScope] = usePageState<string | undefined>("perimetre", undefined);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readOnly = role === "lecture";

  // Présentation du PDF : enregistrée automatiquement, et passée dans l'adresse
  // pour que le document ouvert reflète toujours le dernier choix.
  const prefs: PdfPrefs = data.settings.pdf ?? {};
  const setPrefs = (patch: Partial<PdfPrefs>) => {
    const next: Record<string, unknown> = { ...prefs, ...patch };
    for (const k of Object.keys(next)) if (next[k] === undefined || (Array.isArray(next[k]) && !(next[k] as unknown[]).length)) delete next[k];
    setSettings({ pdf: next as PdfPrefs });
  };
  const query = [scope ? `societe=${scope}` : "", prefsQuery(prefs)].filter(Boolean).join("&");
  const url = `/api/dossier-banque${query ? `?${query}` : ""}`;
  const scopeName = scope ? data.companies.find((c) => c.id === scope)?.name : data.settings.groupName || "Tout le groupe";
  const groupTitle = data.settings.groupName || data.companies.find((c) => c.kind === "holding")?.name || "Patrimoine";
  const coverTitle = scope ? (scopeName ?? "Société") : prefs.title || groupTitle;
  const colors = pdfColors(prefs, data.settings.theme);
  const colorId = prefs.color ?? APP_COLOR;
  const appTheme = themeDef(data.settings.theme);
  const model = prefs.cover ?? DEFAULT_COVER;

  // Vérification avant envoi : ce qui manque apparaîtra « — » dans le dossier.
  const issues = useMemo(() => {
    const scoped = scope ? companySubset(data, scope) : data;
    const list = qualityIssues(scoped, computeSnapshot(scoped, nowMonth));
    const holding = data.companies.find((c) => c.kind === "holding") ?? data.companies[0];
    if (holding && !holding.email && !holding.phone) list.push({ id: "contact", label: "Coordonnées de contact", detail: "E-mail et téléphone affichés en couverture", href: "/plus/societes", severity: "advice", priority: "utile", group: { key: "contact", name: "Coordonnées", kind: "societe" } });
    return list;
  }, [data, nowMonth, scope]);

  const critical = issues.filter((i) => i.severity === "critical");
  const advice = issues.filter((i) => i.severity !== "critical");
  const companies = companyTree(data.companies).map(({ company, depth }) => ({ value: company.id, label: `${"  ".repeat(depth)}${company.name}` }));

  const actions = (cls: string) => (
    <div className={cx("grid grid-cols-2 gap-2", cls)}>
      <Button href={url} icon={<FileDown size={18} />}>
        Ouvrir
      </Button>
      <Button
        variant="secondary"
        icon={sharing ? <Loader2 size={18} className="animate-spin" /> : <Share size={18} />}
        onClick={async () => {
          setSharing(true);
          setError(await sharePdf(url, `Presentation patrimoniale - ${scopeName}.pdf`));
          setSharing(false);
        }}
      >
        Partager
      </Button>
    </div>
  );

  return (
    <>
      <PageHeader title="Dossier banque" back="/plus" subtitle="Présentation de votre patrimoine" />
      <Page>
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6">
        <div className="min-w-0">
        <Card>
          <SelectField label="Périmètre" value={scope} options={companies} onChange={setScope} emptyLabel="Tout le groupe" hint="Choisissez une société pour un dossier limité à elle (et ses filiales)." />
          <p className="mt-3 text-[13px] text-ink-2">
            Environ 6 pages : synthèse et points forts, état du patrimoine, crédits, capacité de remboursement et trajectoire, comptes annuels s&apos;ils sont renseignés. Seuls les chiffres connus apparaissent.
          </p>
        </Card>
        {actions("mt-3")}
        {error && <p className="mt-2 text-center text-xs text-neg">{error}</p>}
        {critical.length > 0 && <p className="mt-2 text-[12.5px] text-neg">{`${critical.length} élément(s) à compléter avant d'envoyer : voir « Avant d'envoyer ».`}</p>}
        <div className="mt-3">
          <AssetsNature />
        </div>

        <SectionTitle
          action={
            Object.keys(prefs).length > 0 && !readOnly ? (
              <button type="button" onClick={() => setSettings({ pdf: {} })} className="flex items-center gap-1 text-[13px] font-medium text-brand">
                <RotateCcw size={14} /> Par défaut
              </button>
            ) : undefined
          }
        >
          Personnaliser
        </SectionTitle>
        <Card>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Modèle</p>
          <div className="mt-2 grid grid-cols-3 gap-x-3 gap-y-3.5" role="radiogroup" aria-label="Modèle du dossier">
            {PDF_COVERS.map((cv) => {
              const on = model === cv.id;
              return (
                <button
                  key={cv.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={cv.label}
                  disabled={readOnly}
                  onClick={() => setPrefs({ cover: cv.id === DEFAULT_COVER ? undefined : cv.id })}
                  className="group min-w-0 text-left transition active:scale-[0.98]"
                >
                  <span className={cx("relative block rounded-[12px] p-[3px] transition", on ? "bg-brand" : "bg-transparent")}>
                    <CoverPreview style={cv.id} colors={colors} title={coverTitle} subtitle={prefs.subtitle ?? data.settings.ownerName} recipient={prefs.recipient} brand={groupTitle} />
                    {on && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-on-brand shadow">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </span>
                  <span className={cx("mt-1.5 block truncate text-center text-[13px] font-semibold", on ? "text-brand" : "text-ink")}>{cv.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[12.5px] text-muted">
            {PDF_COVERS.find((cv) => cv.id === model)?.hint}.{" "}
            {["editorial", "bento", "suisse"].includes(model) ? "Ce modèle habille tout le document, pas seulement la couverture." : "Ce style change la couverture ; les pages intérieures restent classiques."}
            {model === "bento" && " Pages sombres : parfait à l'écran, plus gourmand en encre à l'impression."}
          </p>

          <p className="mt-5 text-[12px] font-semibold uppercase tracking-wide text-muted">Couleur du document</p>
          <div className="mt-2 flex flex-wrap gap-2.5" role="radiogroup" aria-label="Couleur du document">
            {[{ id: APP_COLOR, name: `Comme l'application (${appTheme.name})`, base: appTheme.base }, ...THEMES].map((t) => {
              const p = paletteFor(t.base);
              const on = colorId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={t.name}
                  title={t.name}
                  disabled={readOnly}
                  onClick={() => setPrefs({ color: t.id === APP_COLOR ? undefined : t.id })}
                  className={cx("flex h-10 items-center justify-center rounded-full transition active:scale-95", t.id === APP_COLOR ? "gap-1.5 bg-black/[0.04] pl-1 pr-3" : "w-10", on && "ring-2 ring-brand ring-offset-2 ring-offset-card")}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: `linear-gradient(135deg, ${p.brandGlow} 0%, ${p.brand} 55%, ${p.deep} 100%)` }}>
                    {on && <Check size={15} className="text-white" strokeWidth={3} />}
                  </span>
                  {t.id === APP_COLOR && <span className="text-[13px] font-medium text-ink">Comme l&apos;app</span>}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[12.5px] text-muted">
            {colorId === APP_COLOR ? `Suit la couleur de l'application (${appTheme.name}).` : `${themeDef(pdfThemeId(prefs, data.settings.theme)).name}, pour les documents uniquement.`} S&apos;applique aussi aux baux, quittances et états des lieux.
          </p>
        </Card>

        <Card className="mt-3">
          <Stack>
            <TextField label="Titre de couverture" value={prefs.title} placeholder={groupTitle} hint={scope ? "Dossier d'une société : son nom sert de titre." : undefined} onChange={(v) => setPrefs({ title: v })} />
            <TextField label="Sous-titre" value={prefs.subtitle} placeholder={data.settings.ownerName || "Ex. Présentation 2026"} onChange={(v) => setPrefs({ subtitle: v })} />
            <TextField label="À l'attention de" value={prefs.recipient} placeholder="Ex. Crédit Agricole, M. Martin" onChange={(v) => setPrefs({ recipient: v })} />
            <TextField label="Mot d'introduction" multiline value={prefs.message} placeholder="Quelques lignes pour présenter votre démarche (facultatif)" hint="Affiché en tête du dossier, signé de votre nom." onChange={(v) => setPrefs({ message: v })} />
          </Stack>
        </Card>

        <SectionTitle>Parties du dossier</SectionTitle>
        <Card className="py-1">
          <div className="divide-y divide-line">
            <div className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="block text-[14.5px] font-medium text-ink">Couverture et synthèse</span>
                <span className="block text-[12.5px] text-muted">Toujours présentes</span>
              </span>
            </div>
            {PDF_SECTIONS.map((sec) => {
              const on = !prefs.hide?.includes(sec.id);
              const toggle = () => setPrefs({ hide: on ? [...(prefs.hide ?? []), sec.id] : (prefs.hide ?? []).filter((x): x is PdfSection => x !== sec.id) });
              return (
                <div key={sec.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-medium text-ink">{sec.label}</span>
                    <span className="block text-[12.5px] text-muted">{sec.hint}</span>
                  </span>
                  <button type="button" role="switch" aria-checked={on} aria-label={sec.label} disabled={readOnly} onClick={toggle} className={cx("relative h-7 w-12 shrink-0 rounded-full transition", on ? "bg-brand" : "bg-black/15")}>
                    <span className={cx("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
        <p className="mt-2 text-[12.5px] text-muted">Réglages enregistrés automatiquement, valables aussi pour les dossiers de financement des projets. Ils ne changent aucun chiffre.</p>

        </div>
        <div className="min-w-0 lg:[&>*:first-child]:mt-0">
        <SectionTitle>Avant d&apos;envoyer</SectionTitle>
        {issues.length === 0 && (
          <Card>
            <div className="flex items-center gap-2 text-[14px] font-semibold text-pos">
              <CircleCheck size={18} /> Tout est renseigné : les montants du dossier sont complets.
            </div>
          </Card>
        )}
        {critical.length > 0 && (
          <Card className="border border-neg/30 py-1">
            <div className="flex items-start gap-2 pb-1 pt-3 text-[13.5px] font-semibold text-neg">
              <CircleAlert size={17} className="mt-0.5 shrink-0" />
              <span>
                {`${critical.length} élément(s) à compléter avant d'envoyer : sans eux, certains montants du dossier seraient faussés (mensualités sous-estimées ou charges manquantes).`}
              </span>
            </div>
            <div className="divide-y divide-line">
              {critical.map((i) => (
                <Link key={i.id} href={i.href} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-ink">{i.label}</span>
                    {/^(li|r|v|rl|bd)-/.test(i.id) && <span className="block text-[12px] leading-snug text-muted">{i.detail}</span>}
                  </span>
                  <span className="max-w-[60%] shrink-0 truncate text-[12.5px] font-medium text-series-1">{i.id.startsWith("c-") ? "Saisir les charges" : i.id.startsWith("r-") ? "Saisir les loyers" : /^(li|v|rl|bd)-/.test(i.id) ? "À vérifier" : "Saisir la mensualité"}</span>
                </Link>
              ))}
            </div>
          </Card>
        )}
        {advice.length > 0 && (
          <Card className="mt-3 py-1">
            <div className="flex items-center gap-2 pb-1 pt-3 text-[13.5px] font-semibold text-warn">
              <CircleAlert size={17} /> {`${advice.length} information(s) conseillée(s)`}
            </div>
            <div className="divide-y divide-line">
              {advice.slice(0, 8).map((i) => (
                <Link key={i.id} href={i.href} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
                  <span className="min-w-0 flex-1 truncate text-ink">{i.label}</span>
                  <span className="max-w-[55%] shrink-0 truncate text-muted">{i.detail}</span>
                </Link>
              ))}
            </div>
            {advice.length > 8 && (
              <Link href="/plus/a-completer" className="block py-2.5 text-[13.5px] font-medium text-series-1">
                Voir les {advice.length} éléments
              </Link>
            )}
          </Card>
        )}

        </div>
        </div>
        {actions("mt-6 lg:mx-auto lg:max-w-xl")}

        <Link href="/patrimoine?vue=projets" className="mt-6 flex items-center gap-3 rounded-2xl bg-card px-4 py-4 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-soft text-brand">
            <Rocket size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink">Demander un financement</span>
            <span className="block text-[12.5px] text-muted">Créez un projet : son dossier de financement inclut ce dossier en résumé.</span>
          </span>
        </Link>
      </Page>
    </>
  );
}
