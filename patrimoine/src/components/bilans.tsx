"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, FileUp, LoaderCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { uploadFile } from "@/lib/upload";
import { newId } from "@/lib/ops";
import type { Statement, StatementFigures } from "@/lib/types";
import { eur } from "@/lib/format";
import { useCompanyOptions } from "./forms";
import { Button, Details, Grid2, NumberField, SelectField, Stack } from "./ui";

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

/**
 * Nouveau bilan : société, exercice, PDF joint (facultatif, simplement
 * conservé) et montants saisis. Aucune lecture automatique du document :
 * les chiffres se saisissent ici ou s'importent en JSON (Plus › Sauvegardes).
 */
export function BilanImport({ companyId: initialCompany, onDone }: { companyId?: string; onDone: (statementId?: string) => void }) {
  const { data, upsert } = useStore();
  const router = useRouter();
  const companies = useCompanyOptions();
  const [companyId, setCompanyId] = useState<string | undefined>(initialCompany);
  const [year, setYear] = useState<number | undefined>(new Date().getFullYear() - 1);
  const [figures, setFigures] = useState<StatementFigures>({});
  const [fileId, setFileId] = useState<string | undefined>();
  const [fileName, setFileName] = useState<string | undefined>();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applyCash, setApplyCash] = useState(true);
  const [applyCca, setApplyCca] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const company = data.companies.find((c) => c.id === companyId);

  const attach = async (file: File) => {
    setError(null);
    if (file.type && file.type !== "application/pdf") {
      setError("Choisissez un fichier PDF.");
      return;
    }
    setProgress(0);
    try {
      setFileId(await uploadFile(file, setProgress));
      setFileName(file.name);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProgress(null);
    }
  };

  const save = () => {
    if (!companyId || !year) return;
    const sameYear = data.statements.find((s) => s.companyId === companyId && s.year === year);
    const st: Statement = {
      ...(sameYear ?? {}),
      id: sameYear?.id ?? newId(),
      companyId,
      year,
      figures: { ...(sameYear?.figures ?? {}), ...figures },
      source: "manuel",
      fileId: fileId ?? sameYear?.fileId,
      fileName: fileName ?? sameYear?.fileName,
      createdAt: sameYear?.createdAt ?? new Date().toISOString(),
    };
    upsert("statements", st);
    if (company) {
      const patch: Record<string, number> = {};
      if (applyCash && figures.cash !== undefined) patch.cash = figures.cash;
      if (applyCca && figures.partnerAccounts !== undefined) patch.partnerAccounts = figures.partnerAccounts;
      if (Object.keys(patch).length) upsert("companies", { ...company, ...patch });
    }
    onDone(st.id);
    router.push(`/plus/bilans/${st.id}`);
  };

  return (
    <Stack>
      <Grid2>
        <SelectField label="Société" value={companyId} options={companies} onChange={setCompanyId} emptyLabel="Choisir…" />
        <NumberField label="Exercice clos en" suffix="" integer value={year} onChange={(v) => setYear(v ? Math.round(v) : undefined)} />
      </Grid2>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void attach(f);
          e.target.value = "";
        }}
      />
      {fileName ? (
        <div className="flex items-center gap-2 rounded-2xl bg-soft px-4 py-3 text-[14px] text-ink">
          <FileText size={16} className="shrink-0 text-brand" />
          <span className="min-w-0 flex-1 truncate">{fileName}</span>
          <button type="button" onClick={() => inputRef.current?.click()} className="text-[13px] font-semibold text-brand">
            Changer
          </button>
        </div>
      ) : (
        <Button full variant="secondary" disabled={progress !== null} icon={progress !== null ? <LoaderCircle size={18} className="animate-spin" /> : <FileUp size={18} />} onClick={() => inputRef.current?.click()}>
          {progress !== null ? `Envoi du PDF… ${progress} %` : "Joindre le PDF du bilan (facultatif)"}
        </Button>
      )}
      {error && <div className="rounded-2xl bg-neg/10 px-4 py-3 text-sm text-neg">{error}</div>}

      <FiguresForm figures={figures} onChange={setFigures} />

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
      <Button full disabled={!companyId || !year || progress !== null} onClick={save}>
        Enregistrer le bilan
      </Button>
      <p className="px-1 text-xs text-muted">Chiffres déjà préparés en JSON ? Importez-les dans Plus › Sauvegardes : plusieurs bilans sont remplis d&apos;un coup.</p>
    </Stack>
  );
}
