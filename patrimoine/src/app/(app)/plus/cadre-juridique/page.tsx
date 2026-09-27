"use client";

import { ShieldCheck, ShieldAlert } from "lucide-react";
import { INSPECTION_VERSION, LEASE_VERSIONS, RECEIPT_VERSION } from "@/lib/legal/versions";
import { dateFr } from "@/lib/format";
import { Card, Page, PageHeader, SectionTitle } from "@/components/ui";

export default function CadreJuridique() {
  const all = [...LEASE_VERSIONS, INSPECTION_VERSION, RECEIPT_VERSION];
  return (
    <>
      <PageHeader title="Cadre juridique" back="/plus" subtitle="Modèles utilisés pour les documents" />
      <Page>
        <p className="px-1 text-[14px] text-ink-2">
          Le modèle de bail est choisi automatiquement selon la date de conclusion (signature) du bail. Un bail déjà signé est toujours régénéré avec son modèle d&apos;origine.
        </p>
        {all.map((v) => (
          <div key={v.id}>
            <SectionTitle>{v.label}</SectionTitle>
            <Card>
              <div className={`mb-3 flex items-start gap-2 rounded-2xl px-3 py-2.5 text-[13px] ${v.verified ? "bg-pos/10 text-pos" : "bg-warn/10 text-warn"}`}>
                {v.verified ? <ShieldCheck size={16} className="mt-0.5 shrink-0" /> : <ShieldAlert size={16} className="mt-0.5 shrink-0" />}
                <span>{v.verified ? "Règles appliquées vérifiées." : v.verifyNote}</span>
              </div>
              <div className="text-[13px] text-ink-2">
                Application : {v.to ? `du ${dateFr(v.from)} au ${dateFr(v.to)}` : `à compter du ${dateFr(v.from)}`} · référence <b>{v.id}</b>
              </div>
              <ul className="mt-2 space-y-1 text-[13px] text-muted">
                {v.sources.map((s) => (
                  <li key={s}>• {s}</li>
                ))}
              </ul>
            </Card>
          </div>
        ))}
        <p className="mt-6 px-1 text-[12px] text-muted">
          Les documents générés ne remplacent pas le conseil d&apos;un professionnel du droit. Pour aligner mot à mot un modèle sur le Journal officiel, transmettez le PDF du texte publié (Légifrance) : la version sera mise à jour sans modifier les baux déjà signés.
        </p>
      </Page>
    </>
  );
}
