"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { useStore } from "@/lib/store";
import { SECTION_OPTIONS } from "@/lib/pdf/sections";
import { Card, Page, PageHeader, SectionTitle, cx } from "@/components/ui";

export default function DossierBanquePage() {
  const { data } = useStore();
  const [sections, setSections] = useState<string[]>(SECTION_OPTIONS.map((s) => s.id));
  const [scenarios, setScenarios] = useState<string[]>(data.scenarios.filter((s) => s.includeInExport).map((s) => s.id));
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const href = `/api/dossier-banque?sections=${sections.join(",")}&scenarios=${scenarios.join(",")}`;

  return (
    <>
      <PageHeader title="Dossier banque" back="/plus" subtitle="Choisissez le contenu" />
      <Page>
        <Card className="py-1">
          <div className="divide-y divide-line">
            <Check label="Page de couverture" checked disabled onChange={() => undefined} />
            {SECTION_OPTIONS.filter((s) => s.id !== "scenarios").map((s) => (
              <Check key={s.id} label={s.label} checked={sections.includes(s.id)} onChange={() => setSections(toggle(sections, s.id))} />
            ))}
          </div>
        </Card>
        <SectionTitle>Scénarios futurs</SectionTitle>
        <Card className="py-1">
          {data.scenarios.length === 0 ? (
            <div className="py-3 text-sm text-muted">Aucun scénario. Créez-en depuis l&apos;onglet Simulations.</div>
          ) : (
            <div className="divide-y divide-line">
              {data.scenarios.map((s) => (
                <Check
                  key={s.id}
                  label={s.name}
                  checked={scenarios.includes(s.id)}
                  onChange={() => {
                    const next = toggle(scenarios, s.id);
                    setScenarios(next);
                    setSections(next.length ? [...new Set([...sections, "scenarios"])] : sections.filter((x) => x !== "scenarios"));
                  }}
                />
              ))}
            </div>
          )}
        </Card>
        <a
          href={scenarios.length && !sections.includes("scenarios") ? `${href},scenarios` : href}
          target="_blank"
          rel="noopener"
          className="mt-6 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-navy text-[17px] font-semibold text-white shadow-md active:scale-[0.98]"
        >
          <FileText size={20} /> Générer le PDF
        </a>
        <p className="mt-3 px-2 text-center text-xs text-muted">
          Le document s&apos;ouvre dans un nouvel onglet. Sur iPhone : bouton Partager → Enregistrer dans Fichiers ou envoyer par e-mail.
        </p>
      </Page>
    </>
  );
}

function Check({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <label className={cx("flex items-center gap-3 py-3.5", disabled && "opacity-60")}>
      <input type="checkbox" className="h-5 w-5 shrink-0 accent-[#0b2545]" checked={checked} disabled={disabled} onChange={onChange} />
      <span className="text-[15px] text-ink">{label}</span>
    </label>
  );
}
