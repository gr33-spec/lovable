"use client";

import Link from "next/link";
import { useState } from "react";
import { FileSpreadsheet, Gauge, CalendarClock, CircleAlert, FileText, Flag, Hammer, HandCoins, History, LogOut, Percent, Smartphone, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { demoData, hasDemo, withoutDemo } from "@/lib/demo";
import { qualityIssues } from "@/lib/engine/quality";
import { Button, Card, Divided, Page, PageHeader, Row, SectionTitle, Sheet } from "@/components/ui";

export default function PlusPage() {
  const { data, projection, replaceAll } = useStore();
  const [demoSheet, setDemoSheet] = useState(false);
  const [homeSheet, setHomeSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const issues = qualityIssues(data, projection.snapshot);
  const demo = hasDemo(data);
  const worksPlanned = data.works.filter((w) => w.status !== "termine").length;

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/connexion";
  };

  const removeDemo = async (keepStructure: boolean) => {
    setBusy(true);
    await replaceAll(withoutDemo(data, keepStructure), "avant suppression démo");
    setBusy(false);
    setDemoSheet(false);
  };

  return (
    <>
      <PageHeader title="Plus" />
      <Page>
        <Link
          href="/plus/dossier-banque"
          className="hero-card flex items-center gap-4 rounded-[28px] p-5 text-white"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-gold">
            <FileText size={24} />
          </span>
          <span className="flex-1">
            <span className="block text-[17px] font-semibold">Générer dossier banque</span>
            <span className="block text-sm text-white/60">PDF professionnel en quelques secondes</span>
          </span>
        </Link>

        <SectionTitle>Pilotage</SectionTitle>
        <Card className="py-1">
          <Divided>
            <Row href="/plus/bilans" icon={<FileSpreadsheet size={18} />} title="Bilans et comptes annuels" subtitle={`${data.statements.length} bilan(s) · import PDF intelligent`} />
            <Row href="/plus/indicateurs" icon={<Gauge size={18} />} title="Indicateurs financiers" subtitle="DSCR, rendement, LTV, CAF…" />
            <Row href="/plus/travaux" icon={<Hammer size={18} />} title="Travaux" subtitle={`${worksPlanned} à venir`} />
            <Row href="/plus/remuneration" icon={<HandCoins size={18} />} title="Rémunération et comptes courants" subtitle="Sorties d'argent personnelles" />
            <Row href="/plus/evenements" icon={<Flag size={18} />} title="Événements importants" subtitle="Repères dans la chronologie" />
            <Row href="/plus/hypotheses" icon={<Percent size={18} />} title="Hypothèses de projection" subtitle="Revalorisation, indexation des loyers" />
            <Row
              href="/plus/a-completer"
              icon={<CircleAlert size={18} />}
              title="Données à compléter"
              subtitle={issues.length ? `${issues.length} élément(s)` : "Tout est renseigné"}
            />
          </Divided>
        </Card>

        <SectionTitle>Données</SectionTitle>
        <Card className="py-1">
          <Divided>
            <Row href="/plus/sauvegardes" icon={<History size={18} />} title="Sauvegardes" subtitle="Exporter, importer, restaurer" />
            <Row href="/bienvenue?etape=1" icon={<Wand2 size={18} />} title="Assistant de démarrage" subtitle="Structure, immeubles, crédits, revenus" />
            {demo ? (
              <Row onClick={() => setDemoSheet(true)} icon={<Trash2 size={18} />} title="Supprimer la démonstration" subtitle="Effacer les données d'exemple" />
            ) : (
              data.companies.length === 0 && (
                <Row
                  onClick={async () => { setBusy(true); await replaceAll(demoData(), "chargement démo"); setBusy(false); }}
                  icon={<Sparkles size={18} />}
                  title="Charger la démonstration"
                  subtitle="Jeu de données d'exemple"
                />
              )
            )}
          </Divided>
        </Card>

        <SectionTitle>Application</SectionTitle>
        <Card className="py-1">
          <Divided>
            <Row onClick={() => setHomeSheet(true)} icon={<Smartphone size={18} />} title="Ajouter à l'écran d'accueil" subtitle="Comme une application iPhone" />
            <Row onClick={logout} icon={<LogOut size={18} />} title="Se déconnecter" />
          </Divided>
        </Card>
        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <CalendarClock size={13} /> Enregistrement automatique · sauvegarde quotidienne
        </p>
      </Page>

      <Sheet open={demoSheet} onClose={() => setDemoSheet(false)} title="Supprimer la démonstration">
        <div className="space-y-3 pb-2">
          <p className="text-[15px] text-ink-2">
            Les chiffres d&apos;exemple (immeubles, logements, crédits, travaux) seront effacés. Vos propres saisies sont conservées. Une sauvegarde est faite avant.
          </p>
          <Button full disabled={busy} onClick={() => removeDemo(true)}>
            Garder les noms des sociétés
          </Button>
          <Button full variant="danger" disabled={busy} onClick={() => removeDemo(false)}>
            Tout supprimer
          </Button>
        </div>
      </Sheet>
      <Sheet open={homeSheet} onClose={() => setHomeSheet(false)} title="Écran d'accueil">
        <ol className="list-decimal space-y-3 pb-4 pl-5 text-[15px] text-ink">
          <li>Ouvrez l&apos;application dans <b>Safari</b>.</li>
          <li>Touchez le bouton <b>Partager</b> (carré avec une flèche vers le haut).</li>
          <li>Choisissez <b>« Sur l&apos;écran d&apos;accueil »</b>.</li>
          <li>Touchez <b>Ajouter</b>. L&apos;icône « Patrimoine » apparaît avec vos autres apps.</li>
        </ol>
      </Sheet>
    </>
  );
}
