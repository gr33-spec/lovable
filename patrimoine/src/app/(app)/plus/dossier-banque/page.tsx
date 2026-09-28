"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleAlert, CircleCheck, FileDown, Loader2, Rocket, Share } from "lucide-react";
import { useStore } from "@/lib/store";
import { computeSnapshot, companyTree } from "@/lib/engine/snapshot";
import { qualityIssues } from "@/lib/engine/quality";
import { companySubset } from "@/lib/engine/subset";
import { sharePdf } from "@/components/tenancy/common";
import { Button, Card, Page, PageHeader, SectionTitle, SelectField } from "@/components/ui";

export default function DossierBanquePage() {
  const { data, nowMonth } = useStore();
  const [scope, setScope] = useState<string | undefined>();
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = scope ? `/api/dossier-banque?societe=${scope}` : "/api/dossier-banque";
  const scopeName = scope ? data.companies.find((c) => c.id === scope)?.name : data.settings.groupName || "Tout le groupe";

  // Vérification avant envoi : ce qui manque apparaîtra « — » dans le dossier.
  const issues = useMemo(() => {
    const scoped = scope ? companySubset(data, scope) : data;
    const list = qualityIssues(scoped, computeSnapshot(scoped, nowMonth));
    const holding = data.companies.find((c) => c.kind === "holding") ?? data.companies[0];
    if (holding && !holding.email && !holding.phone) list.push({ id: "contact", label: "Coordonnées de contact", detail: "E-mail et téléphone affichés en couverture", href: "/plus/societes" });
    return list;
  }, [data, nowMonth, scope]);

  const companies = companyTree(data.companies).map(({ company, depth }) => ({ value: company.id, label: `${"  ".repeat(depth)}${company.name}` }));

  return (
    <>
      <PageHeader title="Dossier banque" back="/plus" subtitle="Présentation de votre patrimoine" />
      <Page>
        <Card>
          <SelectField label="Périmètre" value={scope} options={companies} onChange={setScope} emptyLabel="Tout le groupe" hint="Choisissez une société pour un dossier limité à elle (et ses filiales)." />
          <p className="mt-3 text-[13px] text-ink-2">
            Environ 6 pages : synthèse et points forts, état du patrimoine, crédits, capacité de remboursement et trajectoire, comptes annuels s&apos;ils sont renseignés. Seuls les chiffres connus apparaissent.
          </p>
        </Card>

        <SectionTitle>Avant d&apos;envoyer</SectionTitle>
        {issues.length === 0 ? (
          <Card>
            <div className="flex items-center gap-2 text-[14px] font-semibold text-pos">
              <CircleCheck size={18} /> Tout est renseigné
            </div>
          </Card>
        ) : (
          <Card className="py-1">
            <div className="flex items-center gap-2 pb-1 pt-3 text-[13.5px] font-semibold text-warn">
              <CircleAlert size={17} /> {issues.length} information(s) à compléter pour un dossier plus convaincant
            </div>
            <div className="divide-y divide-line">
              {issues.slice(0, 8).map((i) => (
                <Link key={i.id} href={i.href} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
                  <span className="min-w-0 flex-1 truncate text-ink">{i.label}</span>
                  <span className="max-w-[55%] shrink-0 truncate text-muted">{i.detail}</span>
                </Link>
              ))}
            </div>
            {issues.length > 8 && (
              <Link href="/plus/a-completer" className="block py-2.5 text-[13.5px] font-medium text-series-1">
                Voir les {issues.length} éléments
              </Link>
            )}
          </Card>
        )}

        <div className="mt-6 grid grid-cols-2 gap-2">
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
        {error && <p className="mt-2 text-center text-xs text-neg">{error}</p>}

        <Link href="/patrimoine?vue=projets" className="mt-6 flex items-center gap-3 rounded-2xl bg-card px-4 py-4 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-soft text-navy">
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
