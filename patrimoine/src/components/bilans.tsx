"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, FileUp, LoaderCircle, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { uploadFile } from "@/lib/upload";
import { newId } from "@/lib/ops";
import type { Statement, StatementFigures } from "@/lib/types";
import { eur } from "@/lib/format";
import { useCompanyOptions } from "./forms";
import { Button, Details, Grid2, NumberField, SelectField, Stack, cx } from "./ui";

// ——— Libellés des postes ———

export const INCOME_FIELDS: { key: keyof StatementFigures; label: string }[] = [
  { key: "revenue", label: "Chiffre d'affaires / loyers" },
  { key: "otherIncome", label: "Autres produits" },
  { key: "externalCharges", label: "Charges externes" },
  { key: "taxes", label: "Impôts et taxes" },
  { key: "depreciation", label: "Dotations aux amortissements" },
  { key: "operatingResult", label: "Résultat d'exploitation" },
  { key: "financialCharges", label: "Charges financières (intérêts)" },
  { key: "exceptionalResult", label: "Résultat exceptionnel" },
  { key: "corporateTax", label: "Impôt sur les bénéfices" },
  { key: "netResult", label: "Résultat net" },
];

export const BALANCE_FIELDS: { key: keyof StatementFigures; label: string }[] = [
  { key: "fixedAssetsGross", label: "Immobilisations brutes" },
  { key: "fixedAssetsNet", label: "Immobilisations nettes" },
  { key: "cash", label: "Disponibilités (trésorerie)" },
  { key: "totalAssets", label: "Total du bilan" },
  { key: "equity", label: "Capitaux propres" },
  { key: "shareCapital", label: "Capital social" },
  { key: "bankDebt", label: "Emprunts bancaires" },
  { key: "partnerAccounts", label: "Comptes courants d'associés" },
  { key: "otherDebts", label: "Autres dettes" },
];

export function FiguresForm({ figures, onChange }: { figures: StatementFigures; onChange: (f: StatementFigures) => void }) {
  const set = (k: keyof StatementFigures, v: number | undefined) => onChange({ ...figures, [k]: v });
  return (
    <Stack>
      <Details title="Compte de résultat" defaultOpen>
        <Grid2>
          {INCOME_FIELDS.map((f) => (
            <NumberField key={f.key} label={f.label} value={figures[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
        </Grid2>
      </Details>
      <Details title="Bilan" defaultOpen>
        <Grid2>
          {BALANCE_FIELDS.map((f) => (
            <NumberField key={f.key} label={f.label} value={figures[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
        </Grid2>
      </Details>
    </Stack>
  );
}

interface Extraction {
  companyName: string | null;
  siren: string | null;
  closingDate: string | null;
  durationMonths: number | null;
  currentYear: Record<string, number | null>;
  previousYear: Record<string, number | null> | null;
  notes: string[];
  confidence: "haute" | "moyenne" | "faible";
}

function toFigures(raw: Record<string, number | null> | null | undefined): StatementFigures {
  const out: StatementFigures = {};
  if (!raw) return out;
  for (const [k, v] of Object.entries(raw)) if (typeof v === "number" && Number.isFinite(v)) (out as Record<string, number>)[k] = v;
  return out;
}

function countFigures(f: StatementFigures): number {
  return Object.values(f).filter((v) => v !== undefined).length;
}

type Step = "choose" | "upload" | "analyze" | "review" | "manual";

/** Parcours complet : choix de la société → PDF → analyse → vérification → enregistrement. */
export function BilanImport({
  companyId: initialCompany,
  existing,
  onDone,
}: {
  companyId?: string;
  /** Bilan déjà enregistré avec son PDF : on relance seulement l'analyse. */
  existing?: Statement;
  onDone: (statementId?: string) => void;
}) {
  const { data, upsert } = useStore();
  const router = useRouter();
  const companies = useCompanyOptions();
  const [companyId, setCompanyId] = useState<string | undefined>(existing?.companyId ?? initialCompany);
  const [step, setStep] = useState<Step>(existing ? "analyze" : "choose");
  const [aiOn, setAiOn] = useState<boolean | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | undefined>(existing?.fileId);
  const [fileName, setFileName] = useState<string | undefined>(existing?.fileName);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [year, setYear] = useState<number | undefined>(existing?.year ?? new Date().getFullYear() - 1);
  const [figures, setFigures] = useState<StatementFigures>(existing?.figures ?? {});
  const [prevFigures, setPrevFigures] = useState<StatementFigures>({});
  const [savePrev, setSavePrev] = useState(true);
  const [applyCash, setApplyCash] = useState(true);
  const [applyCca, setApplyCca] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const company = data.companies.find((c) => c.id === companyId);

  useEffect(() => {
    let alive = true;
    fetch("/api/bilans/status")
      .then((r) => (r.ok ? r.json() : { ai: false }))
      .then((j) => alive && setAiOn(Boolean(j.ai)))
      .catch(() => alive && setAiOn(false));
    return () => {
      alive = false;
    };
  }, []);

  const analyze = async (id: string) => {
    setStep("analyze");
    const res = await fetch("/api/bilans/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId: id, companyName: company?.name }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "Analyse impossible");
    const ex = json.extraction as Extraction;
    setExtraction(ex);
    setFigures(toFigures(ex.currentYear));
    setPrevFigures(toFigures(ex.previousYear));
    const y = ex.closingDate ? Number(ex.closingDate.slice(0, 4)) : undefined;
    if (y) setYear(y);
    setStep("review");
  };

  // Relance de l'analyse sur un PDF déjà déposé.
  const started = useRef(false);
  useEffect(() => {
    if (!existing?.fileId || aiOn === null || started.current) return;
    started.current = true;
    if (!aiOn) {
      queueMicrotask(() => {
        setError("La lecture automatique n'est pas encore activée (clé ANTHROPIC_API_KEY).");
        setStep("manual");
      });
      return;
    }
    const id = existing.fileId;
    queueMicrotask(() => {
      analyze(id).catch((err) => {
        setError((err as Error).message);
        setStep("manual");
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiOn, existing]);

  const start = async (file: File) => {
    setError(null);
    if (file.type && file.type !== "application/pdf") {
      setError("Choisissez un fichier PDF.");
      return;
    }
    setFileName(file.name);
    setStep("upload");
    let uploaded: string | undefined;
    try {
      const id = await uploadFile(file, setProgress);
      uploaded = id;
      setFileId(id);
      if (!aiOn) {
        setStep("manual");
        return;
      }
      await analyze(id);
    } catch (err) {
      setError((err as Error).message);
      setStep(uploaded ? "manual" : "choose");
    }
  };

  const save = () => {
    if (!companyId || !year) return;
    const sameYear = data.statements.find((s) => s.companyId === companyId && s.year === year);
    const st: Statement = {
      id: existing?.id ?? sameYear?.id ?? newId(),
      companyId,
      year,
      closingDate: extraction?.closingDate ?? undefined,
      durationMonths: extraction?.durationMonths ?? undefined,
      figures,
      source: extraction ? "ia" : "manuel",
      fileId,
      fileName,
      aiNotes: extraction?.notes,
      confidence: extraction?.confidence,
      createdAt: new Date().toISOString(),
    };
    upsert("statements", st);
    if (extraction && savePrev && countFigures(prevFigures) > 0) {
      const prevYear = year - 1;
      const exists = data.statements.find((s) => s.companyId === companyId && s.year === prevYear);
      if (!exists) {
        upsert("statements", { id: newId(), companyId, year: prevYear, figures: prevFigures, source: "ia", fileId, fileName, createdAt: new Date().toISOString() } satisfies Statement);
      }
    }
    if (company) {
      const patch: Record<string, number> = {};
      if (applyCash && figures.cash !== undefined) patch.cash = figures.cash;
      if (applyCca && figures.partnerAccounts !== undefined) patch.partnerAccounts = figures.partnerAccounts;
      if (Object.keys(patch).length) upsert("companies", { ...company, ...patch });
    }
    onDone(st.id);
    router.push(`/plus/bilans/${st.id}`);
  };

  if (step === "choose") {
    return (
      <Stack>
        <SelectField label="Société" value={companyId} options={companies} onChange={setCompanyId} emptyLabel="Choisir…" />
        {aiOn === false && (
          <div className="rounded-2xl bg-warn/10 px-4 py-3 text-sm text-warn">
            Lecture automatique non activée : le PDF sera conservé et vous saisirez les chiffres. (Voir « Activer l&apos;analyse IA » dans Plus → Bilans.)
          </div>
        )}
        {error && <div className="rounded-2xl bg-neg/10 px-4 py-3 text-sm text-neg">{error}</div>}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void start(f);
            e.target.value = "";
          }}
        />
        <Button full disabled={!companyId} icon={<FileUp size={18} />} onClick={() => inputRef.current?.click()}>
          Choisir le PDF du bilan
        </Button>
        <Button full variant="secondary" disabled={!companyId} onClick={() => setStep("manual")}>
          Saisir les chiffres sans PDF
        </Button>
        <p className="px-1 text-xs text-muted">Liasse fiscale, plaquette de l&apos;expert-comptable ou comptes annuels. PDF de 24 Mo maximum.</p>
      </Stack>
    );
  }

  if (step === "upload" || step === "analyze") {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-navy text-[#e8d3ad]">
          {step === "analyze" ? <Sparkles size={26} /> : <FileUp size={26} />}
          <LoaderCircle size={64} className="absolute animate-spin text-series-1/40" strokeWidth={1.2} />
        </div>
        <div className="mt-5 text-[17px] font-semibold text-navy">{step === "upload" ? `Envoi du PDF… ${progress} %` : "Lecture du bilan par l'IA…"}</div>
        <div className="mt-1 max-w-xs text-sm text-muted">
          {step === "upload" ? fileName : "Compte de résultat, bilan, exercice précédent. Cela prend en général 30 secondes à 2 minutes."}
        </div>
      </div>
    );
  }

  const mismatch =
    extraction?.companyName && company && !extraction.companyName.toLowerCase().includes(company.name.toLowerCase().replace(/^(sci|sc|sarl|sas)\s+/i, ""));

  return (
    <Stack>
      {extraction ? (
        <div className={cx("rounded-2xl px-4 py-3 text-sm", extraction.confidence === "haute" ? "bg-pos/10 text-pos" : "bg-warn/10 text-warn")}>
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles size={15} /> Lecture terminée — confiance {extraction.confidence}
          </div>
          <div className="mt-1 text-ink-2">
            {countFigures(figures)} montants trouvés{extraction.companyName ? ` pour « ${extraction.companyName} »` : ""}. Vérifiez-les avant d&apos;enregistrer : les cases vides n&apos;étaient pas dans le document.
          </div>
        </div>
      ) : (
        error && <div className="rounded-2xl bg-warn/10 px-4 py-3 text-sm text-warn">{error} — vous pouvez saisir les chiffres ci-dessous.</div>
      )}
      {mismatch && (
        <div className="flex gap-2 rounded-2xl bg-neg/10 px-4 py-3 text-sm text-neg">
          <CircleAlert size={16} className="mt-0.5 shrink-0" />
          Le document semble concerner « {extraction?.companyName} » et non {company?.name}. Vérifiez la société choisie.
        </div>
      )}
      <Grid2>
        <SelectField label="Société" value={companyId} options={companies} onChange={setCompanyId} allowEmpty={false} />
        <NumberField label="Exercice clos en" suffix="" integer value={year} onChange={(v) => setYear(v ? Math.round(v) : undefined)} />
      </Grid2>
      <FiguresForm figures={figures} onChange={setFigures} />
      {extraction && countFigures(prevFigures) > 0 && (
        <label className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-sm">
          <input type="checkbox" className="h-5 w-5 accent-brand" checked={savePrev} onChange={(e) => setSavePrev(e.target.checked)} />
          <span className="text-[15px]">
            Enregistrer aussi l&apos;exercice {year ? year - 1 : "précédent"} ({countFigures(prevFigures)} montants trouvés)
          </span>
        </label>
      )}
      {company && (figures.cash !== undefined || figures.partnerAccounts !== undefined) && (
        <div className="space-y-2 rounded-2xl bg-soft px-4 py-3">
          <div className="text-[13px] font-semibold text-navy">Mettre à jour la fiche {company.name}</div>
          {figures.cash !== undefined && (
            <label className="flex items-center gap-3 text-[14px]">
              <input type="checkbox" className="h-5 w-5 accent-brand" checked={applyCash} onChange={(e) => setApplyCash(e.target.checked)} />
              Trésorerie : {eur(company.cash)} → <b>{eur(figures.cash)}</b>
            </label>
          )}
          {figures.partnerAccounts !== undefined && (
            <label className="flex items-center gap-3 text-[14px]">
              <input type="checkbox" className="h-5 w-5 accent-brand" checked={applyCca} onChange={(e) => setApplyCca(e.target.checked)} />
              Comptes courants : {eur(company.partnerAccounts)} → <b>{eur(figures.partnerAccounts)}</b>
            </label>
          )}
        </div>
      )}
      {extraction && extraction.notes.length > 0 && (
        <div className="rounded-2xl bg-card px-4 py-3 text-sm shadow-sm">
          <div className="mb-1 font-semibold text-navy">Points relevés</div>
          <ul className="list-disc space-y-1 pl-5 text-ink-2">
            {extraction.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      <Button full disabled={!companyId || !year} onClick={save}>
        Valider et enregistrer
      </Button>
    </Stack>
  );
}
