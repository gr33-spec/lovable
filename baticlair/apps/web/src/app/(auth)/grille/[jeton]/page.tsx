"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Chrono, ErrorNotice, PageTitle, Skeleton } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { deMois } from "@/lib/cycle";

/** L'espace fine de fr-FR (U+202F) ne se voit pas dans la police ; une espace insécable, si. */
const lisible = (texte: string) => texte.replace(/ /g, " ");
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
  /** « 10 négoces consultés, résultats le 08/11 à 18 h » : combien, jamais lesquels (absent d'une ancienne API). */
  consultation?: string;
  reponseAvant: string;
  /** Les zones de livraison en communes, jamais une adresse ni un nom (confidentialité, point 4). */
  zones: string[];
  lignes: { cle: string; designation: string; quantite: number; unite: string; prixUnitaire: number | null; nonGaranti: boolean }[];
  depose: null | { le: string; fichiers: string[]; statut: string; manquantes: number; livraison: string | null };
  rang: string | null;
  /** Le dépôt demande un compte inscrit (dépôts, paliers) : sans lui, le lien pour le créer. */
  inscription: { lien: string } | null;
  /** Les paliers du compte, en une phrase. */
  livraison: string | null;
  /** Une nouvelle version majeure des conditions à accepter avant ce dépôt (sa date), ou null. */
  conditionsAAccepter?: string | null;
  phrases: { regles: string; fermes: string; volume: string };
}

/** « du 15 octobre 2026 », « du 1er novembre 2026 » : la clé d'une commande est le jour de sa clôture. */
const deMoisEnLettres = (m: string) => `${deMois(m)} ${m.slice(0, 4)}`;

/**
 * LA COMMANDE COMMUNE, CÔTÉ NÉGOCE (Greg, 22 et 23 octobre 2026) : par son lien unique. UNE grille (toutes les lignes de
 * la commande, quantités additionnées), un prix par article, le même pour tous, FERME QUEL QUE SOIT LE VOLUME FINAL (case
 * obligatoire, point 5) ; par article, « Prix non garanti » pour une matière cotée (indicatif, hors total) ; la livraison
 * vient des dépôts et paliers du compte (point 2). Les zones de livraison en communes seulement (point 4). Après dépôt :
 * premier ou non, jamais les prix des autres. Aucune facturation. Vouvoiement ; aucun nom d'artisan.
 */
export default function GrilleNegocePage() {
  const { jeton } = useParams<{ jeton: string }>();
  const [page, setPage] = useState<PageGrille | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [envoi, setEnvoi] = useState<ApiError | null>(null);
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [fermes, setFermes] = useState(false);
  const [conditions, setConditions] = useState(false);
  const [nonGarantis, setNonGarantis] = useState<string[]>([]);

  useEffect(() => {
    api<PageGrille>(`/v1/grille/${encodeURIComponent(jeton)}`)
      .then((p) => {
        setPage(p);
        setNonGarantis(p.lignes.filter((l) => l.nonGaranti).map((l) => l.cle));
      })
      .catch((e) => setError(e instanceof ApiError ? e : new ApiError("internal_error", 500)));
  }, [jeton]);

  async function deposer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData();
    form.set("fermes", fermes ? "oui" : "non");
    if (page?.conditionsAAccepter) form.set("conditions", conditions ? "oui" : "non");
    for (const cle of nonGarantis) form.append("nonGarantis", cle);
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
        <p role="status" className="rounded-xl bg-warn-bg p-4 font-semibold text-warn">
          {error.status === 404 ? "Ce lien n'est plus valable." : "Cette page n'a pas pu se charger. Réessayez dans un instant."}
        </p>
      </>
    );
  }
  if (!page) return <Skeleton card="h-40" lines={3} label="Chargement de la commande…" />;
  const pret = fichiers.length >= 1 && fichiers.length <= 2 && fermes && (!page?.conditionsAAccepter || conditions);
  const basculer = (cle: string, coche: boolean) => setNonGarantis((prev) => (coche ? [...new Set([...prev, cle])] : prev.filter((c) => c !== cle)));
  return (
    <>
      <PageTitle>{`Commande commune ${deMoisEnLettres(page.mois)}`}</PageTitle>
      <p className="text-[16px] text-muted">
        Artisans du département {page.departement}. Pour {page.negoce}.
      </p>
      {page.echeance ? <Chrono>{lisible(page.echeance)}</Chrono> : null}
      {page.consultation ? <p className="text-[15px] font-semibold text-muted">{page.consultation}</p> : null}
      <p className="text-[16px] leading-relaxed">{page.phrases.regles}</p>
      <p className="text-[15px] font-semibold">{page.phrases.fermes}</p>
      {page.zones.length > 0 ? <p className="text-[14px] text-muted">{`Livraisons à : ${page.zones.join(", ")}. L'adresse exacte et les coordonnées de l'artisan vous parviennent avec sa commande, pas avant.`}</p> : null}
      {page.livraison ? <p className="text-[14px] text-muted">{`Votre livraison : ${page.livraison}`}</p> : null}

      <section aria-label="La grille" className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
        <h2 className="text-[18px] font-extrabold tracking-[-0.01em]">Les articles à chiffrer, tous</h2>
        <ul className="flex flex-col divide-y divide-line text-[15px]">
          {page.lignes.map((l) => (
            <li key={l.cle} className="flex flex-col gap-1 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0">{l.designation}</span>
                <span className="shrink-0 text-right tabular-nums">
                  <span className="font-semibold">{`${nombre(l.quantite)} ${unite(l.unite)}`}</span>
                  {page.depose ? <span className={`block text-xs ${l.prixUnitaire === null ? "font-bold text-warn" : "text-muted"}`}>{l.prixUnitaire === null ? "Pas de prix lu" : `${euros(l.prixUnitaire)} HT l'unité${l.nonGaranti ? ", indicatif" : ""}`}</span> : null}
                </span>
              </div>
              {page.ouverte && !page.inscription ? (
                <label className="flex items-center gap-2 text-[13px] font-semibold text-muted">
                  <input type="checkbox" checked={nonGarantis.includes(l.cle)} onChange={(e) => basculer(l.cle, e.currentTarget.checked)} className="size-4 accent-accent" />
                  Prix non garanti (matière cotée, ex. zinc)
                </label>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-muted">Une grille incomplète passe derrière les grilles complètes. Un prix non garanti est montré à part, hors total et hors garantie.</p>
      </section>

      {page.depose ? (
        <section role="status" aria-label="Votre dépôt" className="flex flex-col gap-1 rounded-xl bg-ok-bg p-4 font-semibold text-ok">
          <p>{`Devis reçu : ${page.depose.fichiers.join(", ")}.`}</p>
          {page.rang ? <p className="text-[17px] font-extrabold">{page.rang}</p> : null}
          {page.depose.statut !== "lue" ? <p>Nous relisons votre devis.</p> : page.depose.manquantes > 0 ? <p className="text-warn">{`${page.depose.manquantes} article${page.depose.manquantes > 1 ? "s" : ""} sans prix : déposez un devis complet pour passer devant.`}</p> : <p>Toutes les lignes sont chiffrées.</p>}
          {page.depose.livraison ? <p className="text-[14px] font-normal">{`Livraison : ${page.depose.livraison}`}</p> : null}
        </section>
      ) : null}

      {!page.ouverte ? (
        <p role="status" className="rounded-xl bg-warn-bg p-4 font-semibold text-warn">
          Cette commande n&apos;attend plus de réponse : les prix sont figés.
        </p>
      ) : page.inscription ? (
        <section aria-label="Créez votre accès" className="flex flex-col gap-3 rounded-xl bg-ground p-4">
          <p className="text-[16px] font-extrabold">Créez votre accès pour chiffrer cette grille</p>
          <p className="text-[14px] text-muted">Une minute : vos dépôts et vos paliers de livraison, pour que chaque artisan voie son prix livré. Ensuite, vous recevez chaque grille de votre secteur.</p>
          <Link href={page.inscription.lien} className="pressable inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-5 text-[15px] font-semibold text-on-accent">
            Créer mon accès
          </Link>
        </section>
      ) : (
        <form onSubmit={deposer} aria-label="Déposer mon devis" className="flex flex-col gap-4" noValidate>
          {envoi ? <ErrorNotice error={envoi} /> : null}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="grille-pdf" className="text-[14px] font-semibold">
              Votre devis en PDF (un ou deux fichiers)
            </label>
            <p className="text-[14px] text-muted">Un prix unitaire HT par article de la grille, le même pour tous les artisans.</p>
            <input id="grille-pdf" type="file" accept="application/pdf" multiple onChange={(e) => setFichiers(Array.from(e.currentTarget.files ?? []).slice(0, 2))} className="sr-only" />
            <label htmlFor="grille-pdf" className="pressable inline-flex min-h-12 cursor-pointer items-center justify-center self-start rounded-full border border-line bg-surface px-5 text-[15px] font-semibold active:bg-ground">
              {fichiers.length === 0 ? "Choisir le PDF" : "Changer de PDF"}
            </label>
            {fichiers.length > 0 ? <p className="text-[14px] font-semibold">{fichiers.map((f) => f.name).join(", ")}</p> : null}
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-[15px] font-semibold">
            <input type="checkbox" required checked={fermes} onChange={(e) => setFermes(e.currentTarget.checked)} className="mt-0.5 size-5 shrink-0 accent-accent" />
            <span>{page.phrases.volume}</span>
          </label>
          {page.conditionsAAccepter ? (
            <label className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-[15px] font-semibold">
              <input type="checkbox" checked={conditions} onChange={(e) => setConditions(e.currentTarget.checked)} className="mt-0.5 size-5 shrink-0 accent-accent" />
              <span>
                {`Nos conditions ont changé (version du ${page.conditionsAAccepter.split("-").reverse().join("/")}). J'accepte les `}
                <a href="/negoce/conditions" target="_blank" rel="noreferrer" className="underline">
                  conditions de la Commande commune
                </a>
                .
              </span>
            </label>
          ) : null}
          <p className="text-[13px] text-muted">Les quantités de la grille peuvent bouger (un artisan ajoute, un autre commande ailleurs) ; vos prix unitaires, non.</p>
          <Button type="submit" pending={pending} disabled={!pret}>
            {page.depose ? "Déposer un nouveau devis" : "Déposer mon devis"}
          </Button>
          {!fermes ? <p className="text-center text-[13px] text-muted">Cochez « Prix fermes, quel que soit le volume final » pour déposer.</p> : null}
        </form>
      )}
      <footer className="mt-8 flex flex-col gap-2 text-[14px] text-muted">
        <p>
          Aucun frais pour vous.{" "}
          <Link href="/negoce" className="font-semibold text-accent-text underline">
            Mon espace
          </Link>{" "}
          ·{" "}
          <Link href="/negoce/conditions" className="font-semibold text-accent-text underline">
            Les conditions
          </Link>
        </p>
      </footer>
    </>
  );
}
