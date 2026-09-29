"use client";

import Link from "next/link";
import { CircleAlert, CircleCheck } from "lucide-react";
import { unitMissing } from "@/lib/missing";
import { sortedUnits } from "@/lib/lots";
import { useStore } from "@/lib/store";
import { qualityIssues } from "@/lib/engine/quality";
import { Card, Divided, Empty, Page, PageHeader, Row, SectionTitle } from "@/components/ui";

export default function ACompleterPage() {
  const { data, projection } = useStore();
  const issues = qualityIssues(data, projection.snapshot);
  // Dossiers des locataires (même règle que les pastilles rouges de Gestion › Locataires).
  const dossiers = data.buildings.flatMap((b) =>
    sortedUnits(data.units.filter((u) => u.buildingId === b.id))
      .map((u) => ({ unit: u, building: b, missing: unitMissing(data, u) }))
      .filter((x) => x.missing.length > 0),
  );
  const total = issues.length + dossiers.length;
  return (
    <>
      <PageHeader title="À compléter" back subtitle={total ? "Touchez une ligne pour la compléter" : "Tout est renseigné"} />
      <Page>
        {dossiers.length > 0 && (
          <>
            <SectionTitle action={<span className="text-sm font-semibold text-muted">{dossiers.length}</span>}>Dossiers des locataires</SectionTitle>
            <p className="-mt-1 mb-2 px-1 text-[12.5px] text-muted">Bail ou caution signés à joindre, informations du bail manquantes.</p>
            <Card className="py-1">
              <Divided>
                {dossiers.slice(0, 8).map(({ unit, building, missing }) => (
                  <Row
                    key={unit.id}
                    href={`/patrimoine/logement/${unit.id}?depuis=gestion`}
                    icon={<CircleAlert size={18} className="text-neg" />}
                    title={`${unit.name} · ${building.name}`}
                    subtitle={missing.map((m) => m.label).join(", ")}
                  />
                ))}
              </Divided>
              {dossiers.length > 8 && (
                <Link href="/gestion?vue=locataires&filtre=incomplets" className="block py-3 text-center text-[14px] font-semibold text-series-1">
                  Voir les {dossiers.length} dossiers dans Gestion › Locataires
                </Link>
              )}
            </Card>
          </>
        )}
        {issues.length === 0 ? (
          dossiers.length === 0 && <Empty icon={<CircleCheck size={26} />} title="Tout est renseigné" text="Tous les calculs utilisent des données complètes." />
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
