"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { PorteAdmin } from "@/components/admin-achat-groupe";
import { famille, Info, jour, jourEtHeure } from "@/components/admin-vue";
import { BackButton, Card, ErrorNotice, PageTitle, SectionTitle, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

interface Fiche {
  infos: { nom: string; raisonSociale: string | null; email: string; telephone: string | null; siret: string | null; familles: string[]; zone: string[]; verifie: boolean; inscritLe: string | null; inviteLe: string | null; conditions: { le: string; version: string | null } | null; desabonneLe: string | null };
  activite: { demandesRecues: number; reponses: number; tauxReponse: number | null; artisansQuiLOnt: number };
  connexions: { debut: string }[];
}

/** LA FICHE D'UN NÉGOCE (Greg, 14 novembre 2026) : tout sur une page. Rien n'est facturé aux négoces. */
export default function AdminFicheNegocePage() {
  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/admin/negoces" />
      <PorteAdmin>
        <Fiche />
      </PorteAdmin>
    </div>
  );
}

function Fiche() {
  const { id } = useParams<{ id: string }>();
  const charger = useCallback((signal: AbortSignal) => api<Fiche>(`/v1/admin/vue/negoces/${encodeURIComponent(id)}`, { signal }), [id]);
  const { data, error, reload } = useResource(charger);
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  const { infos, activite, connexions } = data;
  return (
    <>
      <PageTitle>{infos.nom}</PageTitle>
      <Card className="p-4">
        <SectionTitle>Infos</SectionTitle>
        <dl>
          <Info titre="Vérification">
            <span className={infos.verifie ? "text-ok" : "text-warn"}>{infos.verifie ? "Vérifié" : "À vérifier"}</span>
          </Info>
          <Info titre="Familles cochées">{infos.familles.map(famille).join(", ") || "Aucune"}</Info>
          <Info titre="Zone">{infos.zone.join(", ") || "Non dite"}</Info>
          <Info titre="Contact">{[infos.email, infos.telephone].filter(Boolean).join(" · ")}</Info>
          <Info titre="SIRET">{infos.siret ?? "Non dit"}</Info>
          {infos.raisonSociale ? <Info titre="Raison sociale">{infos.raisonSociale}</Info> : null}
          <Info titre="Inscrit le">{jour(infos.inscritLe)}</Info>
          <Info titre="Conditions acceptées">{infos.conditions ? `${jour(infos.conditions.le)}${infos.conditions.version ? ` (version ${infos.conditions.version})` : ""}` : "Pas encore"}</Info>
          {infos.desabonneLe ? <Info titre="Ne veut plus d'e-mails depuis le">{jour(infos.desabonneLe)}</Info> : null}
        </dl>
      </Card>
      <Card className="p-4">
        <SectionTitle>Abonnement</SectionTitle>
        <p className="text-[16px]">Gratuit : rien n&apos;est facturé aux négoces.</p>
      </Card>
      <Card className="p-4">
        <SectionTitle>Activité</SectionTitle>
        <dl>
          <Info titre="Demandes reçues">{activite.demandesRecues}</Info>
          <Info titre="Réponses">{activite.reponses}</Info>
          <Info titre="Taux de réponse">{activite.tauxReponse === null ? "Pas encore" : `${activite.tauxReponse} %`}</Info>
          <Info titre="Artisans qui l'ont dans leur carnet">{activite.artisansQuiLOnt}</Info>
        </dl>
      </Card>
      <Card className="p-4">
        <SectionTitle>Historique de connexions</SectionTitle>
        <p className="text-[16px]">{connexions.length ? `Dernière connexion : ${jourEtHeure(connexions[0]!.debut)}` : "Jamais connecté."}</p>
      </Card>
    </>
  );
}
