"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LiensLegaux } from "@/components/legal";
import { Button, ErrorNotice, PageTitle, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

/** L'espace fine de fr-FR (U+202F) ne se voit pas dans la police ; une espace insécable, si. */
const lisible = (texte: string) => texte.replace(/ /g, " ");
const nombre = (q: number) => lisible(q.toLocaleString("fr-FR", { maximumFractionDigits: 3 }));
const euros = (n: number) => lisible(`${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 3 })} €`);
const unite = (u: string) => (u === "ml" ? "m" : u);

/** Ce que l'API rend pour un lien de grille (`GET /v1/grille/:jeton`). */
interface PageGrille {
  negoce: string;
  mois: string;
  departement: string;
  ouverte: boolean;
  echeance: string | null;
  reponseAvant: string;
  lignes: { designation: string; quantite: number; unite: string; prixUnitaire: number | null }[];
  depose: null | {
    le: string;
    fichiers: string[];
    statut: string;
    manquantes: number;
    livraison: { depart: string | null; francoKm: number | null; prixAuDela: number | null } | null;
  };
  rang: string | null;
  phrases: { regles: string; fermes: string };
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const moisEnLettres = (m: string) => `${MOIS[Number(m.slice(5, 7)) - 1] ?? m} ${m.slice(0, 4)}`;

/**
 * LA COMMANDE COMMUNE DU MOIS, CÔTÉ NÉGOCE (Greg, 22 octobre 2026) : par son lien unique, sans compte. UNE grille (toutes
 * les lignes du mois, quantités additionnées), un prix par article, le même pour tous, ferme pour tout le cycle ; la
 * livraison en deux chiffres ; le chrono. Après dépôt : premier ou non, jamais les prix des autres. Aucune facturation.
 * Vouvoiement ; aucun nom d'artisan.
 */
export default function GrilleNegocePage() {
  const { jeton } = useParams<{ jeton: string }>();
  const [page, setPage] = useState<PageGrille | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [envoi, setEnvoi] = useState<ApiError | null>(null);
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [depart, setDepart] = useState("");
  const [francoKm, setFrancoKm] = useState("");
  const [prixAuDela, setPrixAuDela] = useState("");

  useEffect(() => {
    api<PageGrille>(`/v1/grille/${encodeURIComponent(jeton)}`)
      .then(setPage)
      .catch((e) => setError(e instanceof ApiError ? e : new ApiError("internal_error", 500)));
  }, [jeton]);

  async function deposer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData();
    form.set("depart", depart.trim());
    form.set("francoKm", francoKm.trim());
    form.set("prixAuDela", prixAuDela.trim());
    for (const f of fichiers) form.append("file", f, f.name);
    setPending(true);
    setEnvoi(null);
    try {
      setPage(await api<PageGrille>(`/v1/grille/${encodeURIComponent(jeton)}`, { method: "POST", body: form }));
      setFichiers([]);
    } catch (e) {
      setEnvoi(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
    }
  }

  if (error) {
    return (
      <>
        <PageTitle>Commande commune</PageTitle>
        <p role="status" className="rounded-3xl bg-warn-bg p-4 font-semibold text-warn">
          {error.status === 404 ? "Ce lien n'est plus valable." : "Cette page n'a pas pu se charger. Réessayez dans un instant."}
        </p>
      </>
    );
  }
  if (!page) return <Spinner label="Chargement de la commande…" />;
  const estNombre = (v: string) => /^\d+([.,]\d{1,2})?$/.test(v.replace(/[\s€]/g, ""));
  const livraisonOk = depart.trim().length >= 5 && estNombre(francoKm) && estNombre(prixAuDela);
  const pret = fichiers.length >= 1 && fichiers.length <= 2 && livraisonOk;
  return (
    <>
      <PageTitle>{`Commande commune de ${moisEnLettres(page.mois)}`}</PageTitle>
      <p className="text-sm text-muted">
        Couvreurs du département {page.departement}. Pour {page.negoce}.
      </p>
      {page.echeance ? <p className="text-[17px] font-extrabold text-accent-text">{lisible(page.echeance)}</p> : null}
      <p className="rounded-[20px] bg-ground p-4 text-[15px] leading-snug font-semibold">{page.phrases.regles}</p>
      <p className="text-sm font-bold">{page.phrases.fermes}</p>

      <section aria-label="La grille" className="flex flex-col gap-2 rounded-[20px] border border-line bg-surface p-4">
        <h2 className="text-base font-extrabold">Les articles à chiffrer, tous</h2>
        <ul className="flex flex-col divide-y divide-line text-sm">
          {page.lignes.map((l, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 py-2">
              <span className="min-w-0 font-semibold">{l.designation}</span>
              <span className="shrink-0 text-right">
                <span className="font-extrabold">{`${nombre(l.quantite)} ${unite(l.unite)}`}</span>
                {page.depose ? <span className={`block text-xs ${l.prixUnitaire === null ? "font-bold text-warn" : "text-muted"}`}>{l.prixUnitaire === null ? "Pas de prix lu" : `${euros(l.prixUnitaire)} HT l'unité`}</span> : null}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted">Une grille incomplète passe derrière les grilles complètes.</p>
      </section>

      {page.depose ? (
        <section role="status" aria-label="Votre dépôt" className="flex flex-col gap-1 rounded-3xl bg-ok-bg p-4 font-semibold text-ok">
          <p>{`Devis reçu : ${page.depose.fichiers.join(", ")}.`}</p>
          {page.rang ? <p className="text-[17px] font-extrabold">{page.rang}</p> : null}
          {page.depose.statut !== "lue" ? <p>Nous relisons votre devis.</p> : page.depose.manquantes > 0 ? <p className="text-warn">{`${page.depose.manquantes} article${page.depose.manquantes > 1 ? "s" : ""} sans prix : déposez un devis complet pour passer devant.`}</p> : <p>Toutes les lignes sont chiffrées.</p>}
        </section>
      ) : null}

      {!page.ouverte ? (
        <p role="status" className="rounded-3xl bg-warn-bg p-4 font-semibold text-warn">
          Cette commande n&apos;attend plus de réponse : les prix sont figés.
        </p>
      ) : (
        <form onSubmit={deposer} aria-label="Déposer mon devis" className="flex flex-col gap-4" noValidate>
          {envoi ? <ErrorNotice error={envoi} /> : null}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="grille-pdf" className="text-sm font-bold">
              Votre devis en PDF (un ou deux fichiers)
            </label>
            <p className="text-sm text-muted">Un prix unitaire HT par article de la grille, le même pour tous les artisans.</p>
            <input id="grille-pdf" type="file" accept="application/pdf" multiple onChange={(e) => setFichiers(Array.from(e.currentTarget.files ?? []).slice(0, 2))} className="sr-only" />
            <label htmlFor="grille-pdf" className="inline-flex min-h-12 cursor-pointer items-center justify-center self-start rounded-2xl border border-line bg-surface px-4 text-sm font-bold">
              {fichiers.length === 0 ? "Choisir le PDF" : "Changer de PDF"}
            </label>
            {fichiers.length > 0 ? <p className="text-sm font-semibold">{fichiers.map((f) => f.name).join(", ")}</p> : null}
          </div>
          <fieldset className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-4">
            <legend className="px-1 text-sm font-bold">Votre livraison (obligatoire)</legend>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Adresse d&apos;où partent vos livraisons
              <input value={depart} onChange={(e) => setDepart(e.currentTarget.value)} autoComplete="street-address" className="min-h-11 rounded-xl border border-line bg-surface px-3 text-sm font-normal" />
            </label>
            <label className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              Livraison gratuite jusqu&apos;à
              <input inputMode="numeric" aria-label="Livraison gratuite jusqu'à, en km" value={francoKm} onChange={(e) => setFrancoKm(e.currentTarget.value)} className="min-h-11 w-20 rounded-xl border border-line bg-surface px-3 text-right font-bold" />
              km
            </label>
            <label className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              Au-delà,
              <input inputMode="decimal" aria-label="Prix d'une livraison au-delà, en euros HT" value={prixAuDela} onChange={(e) => setPrixAuDela(e.currentTarget.value)} className="min-h-11 w-24 rounded-xl border border-line bg-surface px-3 text-right font-bold" />
              € HT par livraison
            </label>
            <p className="text-xs text-muted">Nous calculons la distance de votre dépôt à chaque chantier ; chaque artisan voit son prix livré.</p>
          </fieldset>
          <Button type="submit" pending={pending} disabled={!pret}>
            {page.depose ? "Déposer un nouveau devis" : "Déposer mon devis"}
          </Button>
          {!livraisonOk ? <p className="text-center text-xs text-muted">Indiquez votre adresse de départ, la distance gratuite et le prix au-delà.</p> : null}
        </form>
      )}
      <footer className="mt-4 flex flex-col gap-2 text-sm text-muted">
        <p>Aucun frais pour vous. Une question : répondez simplement à l&apos;e-mail reçu.</p>
        <LiensLegaux />
      </footer>
    </>
  );
}
