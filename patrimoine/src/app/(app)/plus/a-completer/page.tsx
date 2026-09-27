"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { qualityIssues } from "@/lib/engine/quality";
import { Card, Divided, Empty, Page, PageHeader, Row } from "@/components/ui";

export default function ACompleterPage() {
  const { data, projection } = useStore();
  const issues = qualityIssues(data, projection.snapshot);
  return (
    <>
      <PageHeader title="À compléter" back="/plus" subtitle="Pour des calculs plus précis" />
      <Page>
        {issues.length === 0 ? (
          <Empty icon={<CircleCheck size={26} />} title="Tout est renseigné" text="Tous les calculs utilisent des données complètes." />
        ) : (
          <Card className="py-1">
            <Divided>
              {issues.map((i) => (
                <Row key={i.id} href={i.href} icon={<CircleAlert size={18} />} title={i.label} subtitle={i.detail} />
              ))}
            </Divided>
          </Card>
        )}
      </Page>
    </>
  );
}
