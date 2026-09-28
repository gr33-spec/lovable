"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { qualityIssues } from "@/lib/engine/quality";
import { Card, Divided, Empty, Page, PageHeader, Row, SectionTitle } from "@/components/ui";

export default function ACompleterPage() {
  const { data, projection } = useStore();
  const issues = qualityIssues(data, projection.snapshot);
  return (
    <>
      <PageHeader title="À compléter" back subtitle={issues.length ? `${issues.length} élément${issues.length > 1 ? "s" : ""} · touchez pour saisir` : "Pour des calculs plus précis"} />
      <Page>
        {issues.length === 0 ? (
          <Empty icon={<CircleCheck size={26} />} title="Tout est renseigné" text="Tous les calculs utilisent des données complètes." />
        ) : (
          <>
            {[
              { title: "Faussent les calculs", hint: "Mensualités ou charges manquantes : cash-flow et dossier banque sont inexacts tant qu'elles ne sont pas saisies.", list: issues.filter((i) => i.severity === "critical") },
              { title: "Pour affiner", hint: "Valeurs et informations qui complètent les indicateurs.", list: issues.filter((i) => i.severity !== "critical") },
            ]
              .filter((g) => g.list.length > 0)
              .map((g) => (
                <div key={g.title}>
                  <SectionTitle action={<span className="text-sm font-semibold text-muted">{g.list.length}</span>}>{g.title}</SectionTitle>
                  <p className="-mt-1 mb-2 px-1 text-[12.5px] text-muted">{g.hint}</p>
                  <Card className="py-1">
                    <Divided>
                      {g.list.map((i) => (
                        <Row key={i.id} href={i.href} icon={<CircleAlert size={18} className={i.severity === "critical" ? "text-neg" : "text-warn"} />} title={i.label} subtitle={i.detail} />
                      ))}
                    </Divided>
                  </Card>
                </div>
              ))}
          </>
        )}
      </Page>
    </>
  );
}
