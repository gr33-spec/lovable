"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, ErrorNotice, Field, PageTitle, SectionTitle, Skeleton } from "@/components/ui";
import { api, ApiError, messageErreur } from "@/lib/api";
import { dateFr, eurosHt, quantite, type PageNegoceAchat } from "@/lib/achat-groupe";

const lireNombre = (s: string) => (s.trim() === "" ? null : Number(s.replace(/\s/g, "").replace(",", ".")));

/**
 * LA RÉPONSE DU NÉGOCE À UN ACHAT GROUPÉ, SANS INSCRIPTION (Greg, 27 octobre 2026, point 3) : la demande (volume total,
 * référence exacte, lieux et dates), les règles (pas le seul consulté, une seule offre, ferme jusqu'à la commande, livraison
 * comprise), les conditions à accepter, puis un prix unitaire HT livré OU le devis PDF. Une seule offre. Vouvoiement.
 */
export default function ReponseAchatGroupePage() {
  const { jeton } = useParams<{ jeton: string }>();
  const chemin = `/v1/public/achat-groupe/${encodeURIComponent(jeton)}`;
  const [page, setPage] = useState<PageNegoceAchat | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [prix, setPrix] = useState("");
  const [delai, setDelai] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [accepte, setAccepte] = useState(false);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    api<PageNegoceAchat>(chemin)
      .then(setPage)
      .catch((e) => setError(e instanceof ApiError ? e : new ApiError("internal_error", 500)));
  }, [chemin]);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!accepte) return setErreur("Acceptez les conditions pour déposer votre offre.");
    const p = lireNombre(prix);
    if (p === null && !pdf) return setErreur("Saisissez un prix ou déposez votre devis PDF.");
    setPending(true);
    setErreur(null);
    try {
      const contenu = pdf ? btoa(Array.from(new Uint8Array(await pdf.arrayBuffer()), (b) => String.fromCharCode(b)).join("")) : null;
      setPage(await api<PageNegoceAchat>(chemin, { method: "POST", body: { accepteConditions: true, prixUnitaireHt: p, delaiJours: lireNombre(delai), pdf: contenu ? { nom: pdf!.name, contenuBase64: contenu } : null } }));
    } catch (err) {
      setErreur(messageErreur(err, {}, { vous: true }));
    } finally {
      setPending(false);
    }
  }

  if (error) return <ErrorNotice error={error} />;
  if (!page) return <Skeleton card="h-64" lines={3} label="Chargement de la demande…" />;
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[15px] font-semibold text-muted">{page.deLaPartDe}</p>
      <PageTitle>Demande de prix groupée</PageTitle>
      <Card className="flex flex-col gap-2 p-4">
        <p className="text-[20px] font-extrabold">
          {quantite(page.quantiteTotale)} {page.unite} · {page.libelle}
        </p>
        <p className="text-[15px] text-muted">Référence exacte : {page.libelle}</p>
        <ul className="flex flex-col gap-1 text-[15px]">
          {page.livraisons.map((l, i) => (
            <li key={i}>
              {quantite(l.quantite)} {page.unite} à {l.commune}, avant le {dateFr(l.dateBesoin)}
            </li>
          ))}
        </ul>
        <p className="text-[15px] font-semibold">Réponse avant le {dateFr(page.reponseAvantLe)}.</p>
      </Card>
      <section aria-label="Conditions" className="flex flex-col gap-2">
        <SectionTitle>À savoir</SectionTitle>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-[15px]">
          {page.conditions.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>
      {page.reponse ? (
        <p role="status" className="rounded-xl bg-ok-bg p-4 text-[16px] font-semibold text-ok">
          Votre offre est enregistrée{page.reponse.prixUnitaireHt !== null ? ` : ${eurosHt(page.reponse.prixUnitaireHt)} par ${page.unite}, livré` : page.reponse.pdf ? ` (devis ${page.reponse.pdf})` : ""}. Une seule offre par achat groupé : le bon de commande vous arrivera directement.
        </p>
      ) : page.close ? (
        <p role="status" className="rounded-xl bg-ground p-4 text-[16px] font-semibold">
          La date de réponse est passée.
        </p>
      ) : (
        <form onSubmit={(e) => void envoyer(e)} aria-label="Votre offre" className="flex flex-col gap-4">
          <Field id="prix" label={`Prix unitaire HT livré (€ par ${page.unite ?? "unité"})`} inputMode="decimal" value={prix} onChange={(e) => setPrix(e.target.value)} />
          <Field id="delai" label="Délai de livraison (jours, facultatif)" inputMode="numeric" value={delai} onChange={(e) => setDelai(e.target.value)} />
          <div className="flex flex-col gap-2">
            <label htmlFor="devis" className="text-[14px] font-semibold">
              Ou votre devis PDF
            </label>
            <input id="devis" type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} className="text-[15px]" />
          </div>
          <label className="flex items-start gap-3 rounded-xl bg-ground p-3 text-[15px]">
            <input type="checkbox" checked={accepte} onChange={(e) => setAccepte(e.target.checked)} className="mt-1 size-5 accent-accent" />
            <span>
              J&apos;accepte les conditions ci-dessus et les <a href="/conditions-negoce" className="underline">conditions négoces</a>
              {page.commissionPct > 0 ? `, dont la commission de ${String(page.commissionPct).replace(".", ",")} % HT sur les commandes passées` : ""}.
            </span>
          </label>
          {erreur ? (
            <p role="alert" className="text-[15px] font-semibold text-danger">
              {erreur}
            </p>
          ) : null}
          <Button type="submit" pending={pending}>
            Déposer mon offre
          </Button>
        </form>
      )}
    </div>
  );
}
