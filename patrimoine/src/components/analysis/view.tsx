"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CircleAlert, FlaskConical, LoaderCircle, ShieldCheck, Sparkles, ThumbsUp, Trash2, TriangleAlert } from "lucide-react";
import { useStore } from "@/lib/store";
import { yearOf } from "@/lib/engine/dates";
import { companyTree } from "@/lib/engine/snapshot";
import { ideaToAction, ideaToScenario } from "@/lib/analysis/to-scenario";
import type { AnalysisIdea, AnalysisResult, AnalysisScope, AnalysisTarget, SavedAnalysis } from "@/lib/analysis/types";
import { SwipeRow, toast } from "@/components/swipe";
import { Button, Card, Page, PageHeader, SectionTitle, SelectField, Segmented, TextField, cx } from "@/components/ui";

// Analyse IA du patrimoine : diagnostic, risques et pistes chiffrées par le
// moteur de l'application. Lancée à la demande ; chaque piste peut être
// testée dans une simulation. L'IA ne modifie jamais les données.

const SUGGESTIONS = [
  "Comment améliorer mon cash-flow ?",
  "Quel bien vendre en priorité, et pourquoi ?",
  "Ai-je de la capacité pour un nouvel achat ?",
  "Quels crédits renégocier ou rembourser ?",
];

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export function scopeHref(scope: AnalysisScope): string {
  return scope.type === "company" ? `/plus/analyse?societe=${scope.id}` : scope.type === "building" ? `/plus/analyse?immeuble=${scope.id}` : "/plus/analyse";
}

export function AnalysisView() {
  const { data, role, setSettings } = useStore();
  const params = useSearchParams();
  const initial: AnalysisScope = params.get("immeuble") ? { type: "building", id: params.get("immeuble")! } : params.get("societe") ? { type: "company", id: params.get("societe")! } : { type: "global" };
  const [kind, setKind] = useState<AnalysisScope["type"]>(initial.type);
  const [companyId, setCompanyId] = useState<string | undefined>(initial.type === "company" ? initial.id : undefined);
  const [buildingId, setBuildingId] = useState<string | undefined>(initial.type === "building" ? initial.id : undefined);
  const [question, setQuestion] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const saved = data.settings.analyses ?? [];
  const [openId, setOpenId] = useState<string | null>(null);
  const shown = saved.find((a) => a.id === openId) ?? null;
  const readOnly = role === "lecture";

  useEffect(() => {
    let alive = true;
    fetch("/api/analyse")
      .then((r) => r.json())
      .then((j) => alive && setEnabled(!!j.enabled))
      .catch(() => alive && setEnabled(null));
    return () => {
      alive = false;
    };
  }, []);

  const scope: AnalysisScope | null =
    kind === "company" ? (companyId ? { type: "company", id: companyId } : null) : kind === "building" ? (buildingId ? { type: "building", id: buildingId } : null) : { type: "global" };

  const run = async () => {
    if (!scope) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/analyse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scope, question }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (j.setup) setEnabled(false);
        throw new Error(j.error ?? "Analyse impossible.");
      }
      const entry: SavedAnalysis = { id: uid(), createdAt: new Date().toISOString(), scope: j.scope, scopeLabel: j.scopeLabel, question: question?.trim() || undefined, result: j.result };
      setSettings({ analyses: [entry, ...saved].slice(0, 5) });
      setOpenId(entry.id);
      setQuestion(undefined);
      requestAnimationFrame(() => document.getElementById("resultat")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeSaved = (a: SavedAnalysis) => {
    setSettings({ analyses: saved.filter((x) => x.id !== a.id) });
    if (openId === a.id) setOpenId(null);
    toast("Analyse supprimée", () => setSettings({ analyses: [...(data.settings.analyses ?? []).filter((x) => x.id !== a.id), a].sort((x, y) => y.createdAt.localeCompare(x.createdAt)).slice(0, 5) }));
  };

  const companies = companyTree(data.companies).map(({ company, depth }) => ({ value: company.id, label: `${"  ".repeat(depth)}${company.name}` }));
  const buildings = data.buildings.map((b) => ({ value: b.id, label: b.name }));
  const current = shown ?? (openId === null && saved[0] ? saved[0] : null);

  return (
    <>
      <PageHeader title="Analyse IA" back="/plus" crumbs={[{ label: "Plus", href: "/plus" }]} subtitle="Diagnostic et pistes, à partir de vos chiffres" />
      <Page>
        {/* Téléphone : formulaire, résultat, historique. Ordinateur : formulaire et historique à gauche, résultat à droite. */}
        <div className="flex flex-col lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start lg:gap-x-6">
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <Card>
              <div className="mb-3 flex items-center gap-2 text-[15px] font-bold text-navy">
                <Sparkles size={18} className="text-gold" /> Nouvelle analyse
              </div>
              <Segmented
                value={kind}
                onChange={setKind}
                options={[
                  { value: "global", label: "Tout" },
                  { value: "company", label: "Société" },
                  { value: "building", label: "Immeuble" },
                ]}
              />
              <div className="mt-3 space-y-3">
                {kind === "company" && <SelectField label="Société" value={companyId} options={companies} onChange={setCompanyId} />}
                {kind === "building" && <SelectField label="Immeuble" value={buildingId} options={buildings} onChange={setBuildingId} />}
                <TextField label="Une question précise ? (facultatif)" value={question} onChange={setQuestion} multiline placeholder="Ex. : si je vends Paimpol, où réinvestir ?" />
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => setQuestion(s)} className="rounded-full bg-soft px-3 py-1.5 text-[12.5px] font-medium text-ink-2 active:bg-black/10">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <Button full disabled={busy || !scope || readOnly || enabled === false} onClick={run} icon={busy ? <LoaderCircle size={18} className="animate-spin" /> : <Sparkles size={18} />}>
                  {busy ? "Analyse en cours… (jusqu'à 2 min)" : readOnly ? "Non disponible en consultation" : "Lancer l'analyse"}
                </Button>
              </div>
              {error && <p className="mt-3 text-[13.5px] text-neg">{error}</p>}
              <p className="mt-3 flex gap-2 text-[12.5px] leading-snug text-muted">
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-pos" />
                Seuls les chiffres calculés par l&apos;application sont envoyés (aucun nom de locataire). L&apos;IA propose, elle ne modifie rien. Quelques centimes par analyse.
              </p>
            </Card>

            {enabled === false && (
              <>
                <SectionTitle>Activer l&apos;analyse IA</SectionTitle>
                <Card className="text-sm text-ink-2">
                  <ol className="list-decimal space-y-1.5 pl-5">
                    <li>Créez une clé sur <b>console.anthropic.com</b> → API Keys → Create Key.</li>
                    <li>Dans Vercel : projet <b>patrimoine</b> → Settings → Environment Variables → ajoutez <b>ANTHROPIC_API_KEY</b> avec cette clé.</li>
                    <li>Deployments → ⋯ → Redeploy.</li>
                  </ol>
                  <p className="mt-2 text-xs text-muted">La même clé active aussi la lecture automatique des bilans.</p>
                </Card>
              </>
            )}
          </div>

          <div id="resultat" className="min-w-0 scroll-mt-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            {current ? (
              <Result analysis={current} />
            ) : (
              <Card className="mt-4 lg:mt-0">
                <div className="flex flex-col items-center py-6 text-center">
                  <Sparkles size={30} className="text-gold" />
                  <div className="mt-2 text-[16px] font-semibold text-ink">Votre première analyse</div>
                  <p className="mt-1 max-w-sm text-sm text-muted">Un diagnostic de votre patrimoine, ses risques et 3 à 6 pistes d&apos;action classées par impact, chacune testable dans une simulation.</p>
                </div>
              </Card>
            )}
          </div>

          <div className="min-w-0 lg:col-start-1 lg:row-start-2">
            {saved.length > 0 && (
              <>
                <SectionTitle>Dernières analyses</SectionTitle>
                <Card className="py-1">
                  <div className="divide-y divide-line">
                    {saved.map((a) => (
                      <SwipeRow key={a.id} actions={readOnly ? [] : [{ label: "Supprimer", icon: <Trash2 size={18} />, tone: "neg", onAction: () => removeSaved(a) }]}>
                        <button type="button" onClick={() => { setOpenId(a.id); requestAnimationFrame(() => document.getElementById("resultat")?.scrollIntoView({ behavior: "smooth", block: "start" })); }} className={cx("flex w-full items-center gap-3 py-3 text-left", current?.id === a.id && "font-semibold")}>
                          <HealthDot level={a.result.sante.niveau} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] text-ink">{a.question || a.scopeLabel}</span>
                            <span className="block truncate text-[12.5px] font-normal text-muted">
                              {new Date(a.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} · {a.scopeLabel}
                            </span>
                          </span>
                        </button>
                      </SwipeRow>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      </Page>
    </>
  );
}

const HEALTH: Record<AnalysisResult["sante"]["niveau"], { label: string; cls: string }> = {
  solide: { label: "Solide", cls: "bg-pos/10 text-pos" },
  correct: { label: "Correct", cls: "bg-warn/10 text-warn" },
  fragile: { label: "Fragile", cls: "bg-neg/10 text-neg" },
};

function HealthDot({ level }: { level: AnalysisResult["sante"]["niveau"] }) {
  return <span className={cx("h-2.5 w-2.5 shrink-0 rounded-full", level === "solide" ? "bg-pos" : level === "correct" ? "bg-warn" : "bg-neg")} />;
}

function targetLink(t: AnalysisTarget, data: ReturnType<typeof useStore>["data"]): { href: string; label: string } | null {
  if (t.type === "immeuble") {
    const b = data.buildings.find((x) => x.id === t.id);
    return b ? { href: `/patrimoine/immeuble/${b.id}`, label: b.name } : null;
  }
  if (t.type === "societe") {
    const c = data.companies.find((x) => x.id === t.id);
    return c ? { href: `/patrimoine/societe/${c.id}`, label: c.name } : null;
  }
  if (t.type === "credit") {
    const l = data.loans.find((x) => x.id === t.id);
    return l ? { href: `/patrimoine/credit/${l.id}`, label: l.name || l.bank || "Crédit" } : null;
  }
  return null;
}

function Result({ analysis }: { analysis: SavedAnalysis }) {
  const r = analysis.result;
  const { data } = useStore();
  const h = HEALTH[r.sante.niveau];
  return (
    <div className="mt-4 lg:mt-0">
      <Card>
        <div className="flex items-center gap-2">
          <span className={cx("rounded-full px-3 py-1 text-[13px] font-bold", h.cls)}>{h.label}</span>
          <span className="text-[12.5px] text-muted">
            {analysis.scopeLabel} · {new Date(analysis.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
          </span>
        </div>
        <p className="mt-3 text-[15.5px] leading-relaxed text-ink">{r.synthese}</p>
        <p className="mt-2 text-[13.5px] text-ink-2">{r.sante.explication}</p>
      </Card>

      {analysis.question && r.reponse && (
        <>
          <SectionTitle>Votre question</SectionTitle>
          <Card>
            <p className="text-[13.5px] font-semibold text-muted">{analysis.question}</p>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink">{r.reponse}</p>
          </Card>
        </>
      )}

      {r.pistes.length > 0 && (
        <>
          <SectionTitle>Pistes, par ordre d&apos;impact</SectionTitle>
          <div className="space-y-3">
            {r.pistes.map((p, i) => (
              <IdeaCard key={i} idea={p} rank={i + 1} />
            ))}
          </div>
        </>
      )}

      {r.risques.length > 0 && (
        <>
          <SectionTitle>Points de vigilance</SectionTitle>
          <Card className="py-1">
            <div className="divide-y divide-line">
              {r.risques.map((k, i) => {
                const link = targetLink(k.cible, data);
                return (
                  <div key={i} className="flex gap-3 py-3">
                    <TriangleAlert size={18} className={cx("mt-0.5 shrink-0", k.gravite === "haute" ? "text-neg" : k.gravite === "moyenne" ? "text-warn" : "text-muted")} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold text-ink">{k.titre}</div>
                      <div className="text-[13.5px] text-ink-2">{k.detail}</div>
                      {link && (
                        <Link href={link.href} className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-series-1">
                          {link.label} <ArrowRight size={13} />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {r.forces.length > 0 && (
        <>
          <SectionTitle>Points forts</SectionTitle>
          <Card className="space-y-2">
            {r.forces.map((f, i) => (
              <div key={i} className="flex gap-2 text-[14.5px] text-ink">
                <ThumbsUp size={16} className="mt-0.5 shrink-0 text-pos" /> {f}
              </div>
            ))}
          </Card>
        </>
      )}

      {r.aCompleter.length > 0 && (
        <>
          <SectionTitle action={<Link href="/plus/a-completer" className="text-sm font-semibold text-series-1">Compléter</Link>}>Pour une analyse plus sûre</SectionTitle>
          <Card className="space-y-2">
            {r.aCompleter.map((f, i) => (
              <div key={i} className="flex gap-2 text-[14px] text-ink-2">
                <CircleAlert size={16} className="mt-0.5 shrink-0 text-warn" /> {f}
              </div>
            ))}
          </Card>
        </>
      )}

      <p className="mt-4 px-1 text-center text-[12px] text-muted">Pistes générées par IA à partir de vos chiffres : à valider avec vos conseillers (expert-comptable, notaire, banque). Aucune donnée n&apos;est modifiée.</p>
    </div>
  );
}

function IdeaCard({ idea, rank }: { idea: AnalysisIdea; rank: number }) {
  const { data, projection, nowMonth, upsert, role } = useStore();
  const router = useRouter();
  const link = targetLink(idea.cible, data);
  const year = yearOf(nowMonth);
  const simulable = !!ideaToAction(idea, data, projection.snapshot, year);
  const test = () => {
    const scenario = ideaToScenario(idea, data, projection.snapshot, year);
    if (!scenario) return;
    upsert("scenarios", scenario);
    router.push(`/simulations/${scenario.id}`);
  };
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-[14px] font-bold text-gold">{rank}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-bold leading-snug text-navy">{idea.titre}</div>
          <div className="mt-0.5 text-[12.5px] font-semibold uppercase tracking-wide text-muted">
            {{ court: "Court terme", moyen: "Moyen terme", long: "Long terme" }[idea.horizon]}
            {link && (
              <>
                {" · "}
                <Link href={link.href} className="normal-case tracking-normal text-series-1">
                  {link.label}
                </Link>
              </>
            )}
          </div>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink">{idea.pourquoi}</p>
          <div className="mt-2 rounded-xl bg-pos/5 px-3 py-2 text-[14px] text-ink">
            <span className="font-semibold text-pos">Impact : </span>
            {idea.impact}
          </div>
          {idea.aValider && <p className="mt-2 text-[12.5px] text-muted">À valider : {idea.aValider}</p>}
          {simulable && role !== "lecture" && (
            <button type="button" onClick={test} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-soft px-3.5 py-2 text-[13.5px] font-semibold text-brand active:bg-black/10">
              <FlaskConical size={15} /> Tester dans une simulation
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
