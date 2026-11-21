"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { PorteAdmin } from "@/components/admin-achat-groupe";
import { formule, Info, jour, jourEtHeure, metier } from "@/components/admin-vue";
import { BackButton, Card, ErrorNotice, PageTitle, SectionTitle, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

interface Fiche {
  infos: { entreprise: string; metiers: string[]; departement: string | null; adresse: string | null; siret: string | null; verifie: boolean; telephone: string | null; email: string | null; prenom: string | null; inscritLe: string; comptes: { nom: string; email: string; role: string }[] };
  abonnement: { formule: string; periodicite: string | null; statut: string; periodeFin: string | null; paiementRefuseLe: string | null; resiliationDemandeeLe: string | null; codePromo: string | null; factures: { numero: string; emiseLe: string; ht: number; formule: string }[] };
  activite: { listes: number; demandes: number; demandesEnvoyees: number; besoinsGroupes: number; negoces: number };
  connexions: { debut: string; derniereActivite: string }[];
}

/** LA FICHE D'UN ARTISAN (Greg, 14 novembre 2026) : tout sur une page. L'activité est en nombres : jamais le détail d'un chantier. */
export default function AdminFicheArtisanPage() {
  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/admin/artisans" />
      <PorteAdmin>
        <Fiche />
      </PorteAdmin>
    </div>
  );
}

function Fiche() {
  const { id } = useParams<{ id: string }>();
  const charger = useCallback((signal: AbortSignal) => api<Fiche>(`/v1/admin/vue/artisans/${encodeURIComponent(id)}`, { signal }), [id]);
  const { data, error, reload } = useResource(charger);
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  const { infos, abonnement: abo, activite, connexions } = data;
  return (
    <>
      <PageTitle>{infos.entreprise}</PageTitle>
      <Card className="p-4">
        <SectionTitle>Infos</SectionTitle>
        <dl>
          <Info titre="Métier">{infos.metiers.map(metier).join(", ") || "Non dit"}</Info>
          <Info titre="Département">{infos.departement ?? "Non dit"}</Info>
          <Info titre="Adresse">{infos.adresse ?? "Non dite"}</Info>
          <Info titre="SIRET">{infos.siret ? `${infos.siret}${infos.verifie ? " · vérifié" : " · non vérifié"}` : "Non dit"}</Info>
          <Info titre="Contact">{[infos.prenom, infos.email, infos.telephone].filter(Boolean).join(" · ") || "Non dit"}</Info>
          <Info titre="Inscrit le">{jour(infos.inscritLe)}</Info>
          <Info titre="Comptes">{infos.comptes.map((c) => c.nom || c.email).join(", ")}</Info>
        </dl>
      </Card>
      <Card className="p-4">
        <SectionTitle>Abonnement</SectionTitle>
        <dl>
          <Info titre="Formule">
            {formule(abo.formule)}
            {abo.periodicite ? ` · ${abo.periodicite === "annuel" ? "à l'année" : "au mois"}` : ""}
          </Info>
          {abo.paiementRefuseLe ? (
            <Info titre="Paiement">
              <span className="text-danger">Refusé le {jour(abo.paiementRefuseLe)}</span>
            </Info>
          ) : null}
          {abo.periodeFin ? <Info titre="Période payée jusqu'au">{jour(abo.periodeFin)}</Info> : null}
          {abo.resiliationDemandeeLe ? <Info titre="Résiliation demandée le">{jour(abo.resiliationDemandeeLe)}</Info> : null}
          <Info titre="Code promo">{abo.codePromo ?? "Aucun"}</Info>
          <Info titre="Factures">{abo.factures.length === 0 ? "Aucune" : abo.factures.map((f) => `${jour(f.emiseLe)} : ${f.ht.toLocaleString("fr-FR")} € HT`).join(" ; ")}</Info>
        </dl>
      </Card>
      <Card className="p-4">
        <SectionTitle>Activité</SectionTitle>
        <dl>
          <Info titre="Listes">{activite.listes}</Info>
          <Info titre="Demandes de prix">
            {activite.demandes} ({activite.demandesEnvoyees} envoi{activite.demandesEnvoyees > 1 ? "s" : ""} à un négoce)
          </Info>
          <Info titre="Besoins en achat groupé">{activite.besoinsGroupes}</Info>
          <Info titre="Négoces dans son carnet">{activite.negoces}</Info>
        </dl>
        <p className="pt-2 text-[14px] text-muted">Le contenu des chantiers ne s&apos;affiche pas ici.</p>
      </Card>
      <Card className="p-4">
        <SectionTitle>Historique de connexions</SectionTitle>
        {connexions.length === 0 ? (
          <p className="text-[16px]">Aucune connexion en cours.</p>
        ) : (
          <ul aria-label="Connexions" className="flex flex-col">
            {connexions.map((c, i) => (
              <li key={i} className="border-b border-line py-2 text-[15px] last:border-b-0">
                Connecté le {jourEtHeure(c.debut)} · dernière activité {jourEtHeure(c.derniereActivite)}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
