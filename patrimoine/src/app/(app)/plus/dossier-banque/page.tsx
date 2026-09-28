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
    if (holding && !holding.email && !holding.phone) list.push({ id: "contact", label: "Coordonnées de contact", detail: "E-mail et téléphone affichés en couverture", href: "/plus/societes", severity: "advice" });
    return list;
  }, [data, nowMonth, scope]);

  const critical = issues.filter((i) => i.severity === "critical");
  const advice = issues.filter((i) => i.severity !== "critical");
  const companies = companyTree(data.companies).map(({ company, depth }) => ({ value: company.id, label: `${"  ".repeat(depth)}${company.name}` }));

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
                  <span className="min-w-0 flex-1 truncate text-ink">{i.label}</span>
                  <span className="max-w-[60%] shrink-0 truncate text-[12.5px] font-medium text-series-1">{i.id.startsWith("c-") ? "Saisir les charges" : "Saisir la mensualité"}</span>
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
        <div className="mt-6 grid grid-cols-2 gap-2 lg:mx-auto lg:max-w-xl">
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
