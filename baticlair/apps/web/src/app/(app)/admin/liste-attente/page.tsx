"use client";

import { useCallback } from "react";
import { PorteAdmin } from "@/components/admin-achat-groupe";
import { BackButton, Card, ErrorNotice, PageTitle, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

interface ListeAttente {
  total: number;
  parMetier: { metier: string; libelle: string; nombre: number }[];
  parDepartement: { code: string | null; nom: string; nombre: number }[];
  inscrits: { id: string; email: string; metier: string; libelle: string; departement: string | null; nomDepartement: string | null; source: string | null; le: string }[];
}
const quand = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

/**
 * LA LISTE D'ATTENTE DES MÉTIERS (Greg, 19 novembre 2026) : les artisans d'un métier pas encore ouvert qui ont laissé
 * leur e-mail à l'inscription. Le décompte par métier et par département d'abord, puis les inscrits. Lecture seule ;
 * chaque consultation est au journal de l'admin.
 */
export default function AdminListeAttente() {
  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/admin" />
      <PageTitle>Liste d&apos;attente des métiers</PageTitle>
      <PorteAdmin>
        <Liste />
      </PorteAdmin>
    </div>
  );
}

function Decompte({ titre, lignes, id }: { titre: string; lignes: { cle: string; libelle: string; nombre: number }[]; id: string }) {
  return (
    <section className="flex flex-col gap-2" aria-labelledby={id}>
      <h2 id={id} className="text-[20px] font-extrabold">
        {titre}
      </h2>
      <Card className="p-0">
        <ul className="divide-y divide-line">
          {lignes.map((l) => (
            <li key={l.cle} className="flex min-h-12 items-center justify-between gap-3 px-4 text-[15px]">
              <span className="font-semibold">{l.libelle}</span>
              <span className="tabular-nums font-extrabold">{l.nombre}</span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

function Liste() {
  const charger = useCallback((signal: AbortSignal) => api<ListeAttente>("/v1/admin/liste-attente", { signal }), []);
  const { data, error, reload } = useResource(charger);
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  if (data.total === 0) return <Card className="p-4 text-[15px]">Personne en liste d&apos;attente pour l&apos;instant.</Card>;
  return (
    <>
      <p className="text-[16px]">
        <strong className="text-[22px] tabular-nums">{data.total}</strong> artisan{data.total > 1 ? "s" : ""} en attente d&apos;un métier.
      </p>
      <Decompte id="t-metiers" titre="Par métier" lignes={data.parMetier.map((m) => ({ cle: m.metier, libelle: m.libelle, nombre: m.nombre }))} />
      <Decompte id="t-departements" titre="Par département" lignes={data.parDepartement.map((d) => ({ cle: d.code ?? "aucun", libelle: d.code ? `${d.code} · ${d.nom}` : d.nom, nombre: d.nombre }))} />
      <section className="flex flex-col gap-2" aria-labelledby="t-inscrits">
        <h2 id="t-inscrits" className="text-[20px] font-extrabold">
          Les inscrits
        </h2>
        <ul className="flex flex-col gap-2">
          {data.inscrits.map((i) => (
            <li key={i.id}>
              <Card className="flex flex-col gap-0.5 p-4 text-[15px]">
                <span className="font-semibold break-all">{i.email}</span>
                <span className="text-muted">
                  {i.libelle} · {i.nomDepartement ?? "Département non indiqué"} · {quand(i.le)}
                  {i.source && i.source !== "inscription" ? ` · depuis /${i.source}` : ""}
                </span>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
