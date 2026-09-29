"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, KeyRound, CalendarRange, FlaskConical, Scale, ScanFace, Share2, LineChart as LineIcon, FileSpreadsheet, Gauge, CalendarClock, CircleAlert, FileText, HandCoins, History, LogOut, Percent, Smartphone, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { demoData, hasDemo, withoutDemo } from "@/lib/demo";
import { qualityIssues } from "@/lib/engine/quality";
import { unitMissing } from "@/lib/missing";
import { Button, Card, Divided, Page, PageHeader, Row, SectionTitle, Sheet } from "@/components/ui";

export default function PlusPage() {
  const { data, projection, replaceAll } = useStore();
  const [demoSheet, setDemoSheet] = useState(false);
  const [homeSheet, setHomeSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const issues = qualityIssues(data, projection.snapshot);
  const dossiers = data.units.filter((u) => unitMissing(data, u).length > 0).length;
  const toComplete = issues.length + dossiers;
  const demo = hasDemo(data);

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

        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6">
        <div className="min-w-0">
        {toComplete > 0 && (
          <>
            <SectionTitle>À traiter</SectionTitle>
            <Card className="py-1">
              <Row href="/plus/a-completer" icon={<CircleAlert size={18} />} title="Données à compléter" subtitle={[dossiers ? `${dossiers} dossier${dossiers > 1 ? "s" : ""} de locataire` : "", issues.length ? `${issues.length} chiffre${issues.length > 1 ? "s" : ""} manquant${issues.length > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ")} />
            </Card>
          </>
        )}

        <SectionTitle>Analyser</SectionTitle>
        <Card className="py-1">
          <Divided>
            <Row href="/plus/analyse" icon={<Sparkles size={18} />} title="Analyse IA" subtitle="Diagnostic et pistes de réinvestissement" />
            <Row href="/plus/indicateurs" icon={<Gauge size={18} />} title="Indicateurs financiers" subtitle="DSCR, rendement, LTV, CAF…" />
            <Row href="/plus/historique" icon={<LineIcon size={18} />} title="Historique et plus-values" subtitle="Valeurs passées, plus-values latentes" />
            <Row href="/chronologie" icon={<CalendarRange size={18} />} title="Chronologie" subtitle="30 ans d'échéances · vos événements" />
            <Row href="/simulations" icon={<FlaskConical size={18} />} title="Simulations" subtitle={`${data.scenarios.length} scénario(s) · vente, refinancement…`} />
          </Divided>
        </Card>

        <SectionTitle>Sociétés</SectionTitle>
        <Card className="py-1">
          <Divided>
            <Row href="/plus/societes" icon={<Building2 size={18} />} title="Informations des sociétés" subtitle="Siège, SIREN, gérant · durée des baux" />
            <Row href="/plus/bilans" icon={<FileSpreadsheet size={18} />} title="Bilans et comptes annuels" subtitle={`${data.statements.length} bilan(s) · import PDF intelligent`} />
            <Row href="/plus/remuneration" icon={<HandCoins size={18} />} title="Rémunération" subtitle="Salaires, dividendes, comptes courants · calcul 2026" />
          </Divided>
        </Card>

        </div>
        <div className="min-w-0">
        <SectionTitle>Réglages</SectionTitle>
        <Card className="py-1">
          <Divided>
            <Row href="/plus/hypotheses" icon={<Percent size={18} />} title="Hypothèses de projection" subtitle="Revalorisation, indexation des loyers" />
            <Row href="/plus/cadre-juridique" icon={<Scale size={18} />} title="Cadre juridique des baux" subtitle="Modèles 2015 / 2026, états des lieux, quittances" />
            <Row href="/plus/acces-gestion" icon={<KeyRound size={18} />} title="Accès d'Enora" subtitle="Mot de passe, aperçu de son espace" />
            <Row href="/plus/securite" icon={<ScanFace size={18} />} title="Connexion Face ID" subtitle="Se connecter sans mot de passe" />
          </Divided>
        </Card>

        <SectionTitle>Données</SectionTitle>
        <Card className="py-1">
          <Divided>
            <Row href="/plus/sauvegardes" icon={<History size={18} />} title="Sauvegardes" subtitle="Exporter, importer, restaurer" />
            <Row href="/plus/partage" icon={<Share2 size={18} />} title="Partager en lecture seule" subtitle="Toute l'application, sans rien pouvoir modifier" />
            <Row href="/api/export-excel" icon={<FileSpreadsheet size={18} />} title="Exporter en Excel" subtitle="Toutes les données, un onglet par thème" />
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
        </div>
        </div>
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
