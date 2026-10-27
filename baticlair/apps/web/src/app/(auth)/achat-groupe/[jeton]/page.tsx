"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, ErrorNotice, Field, INPUT, PageTitle, SectionTitle, Skeleton } from "@/components/ui";
import { api, ApiError, messageErreur } from "@/lib/api";
import { dateFr, eurosHt, quantite, type PageNegoceAchat } from "@/lib/achat-groupe";

const lireNombre = (s: string) => (s.trim() === "" ? null : Number(s.replace(/\s/g, "").replace(",", ".")));

/**
 * LA RÉPONSE DU NÉGOCE À UN ACHAT GROUPÉ, SANS INSCRIPTION (Greg, 27 octobre 2026, 2e message, points 11 et 12) : SA
 * liste (chaque référence, la quantité cumulée), les livraisons, les règles ; LIGNE PAR LIGNE un prix unitaire HT livré
 * ou « Je ne fournis pas » (le devis PDF reste un repli) ; ses conditions d'ouverture de compte, cochées une fois. Une
 * seule offre. Vouvoiement.
 */
export default function ReponseAchatGroupePage() {
  const { jeton } = useParams<{ jeton: string }>();
  const chemin = `/v1/public/achat-groupe/${encodeURIComponent(jeton)}`;
  const [page, setPage] = useState<PageNegoceAchat | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [prix, setPrix] = useState<Record<string, string>>({});
  const [nonFourni, setNonFourni] = useState<string[]>([]);
  const [delai, setDelai] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [pieces, setPieces] = useState<string[] | null>(null);
  const [paiement, setPaiement] = useState<string | null | undefined>(undefined);
  const [autre, setAutre] = useState<string | null>(null);
  const [accepte, setAccepte] = useState(false);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    api<PageNegoceAchat>(chemin)
      .then(setPage)
      .catch((e) => setError(e instanceof ApiError ? e : new ApiError("internal_error", 500)));
  }, [chemin]);

  if (error) return <ErrorNotice error={error} />;
  if (!page) return <Skeleton card="h-64" lines={3} label="Chargement de la demande…" />;
  // Les conditions d'ouverture déjà cochées sont reprises (une fois pour toutes).
  const mesPieces = pieces ?? page.conditionsOuverture?.pieces ?? [];
  const monPaiement = paiement === undefined ? (page.conditionsOuverture?.paiement ?? null) : paiement;
  const monAutre = autre ?? page.conditionsOuverture?.autre ?? "";
  const repondues = page.lignes.filter((l) => nonFourni.includes(l.cle) || (lireNombre(prix[l.cle] ?? "") ?? 0) > 0).length;

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!page) return;
    if (!accepte) return setErreur("Acceptez les conditions pour déposer votre offre.");
    if (!pdf && repondues < page.lignes.length) return setErreur("Répondez à chaque ligne : un prix, ou « Je ne fournis pas ».");
    setPending(true);
    setErreur(null);
    try {
      const contenu = pdf ? btoa(Array.from(new Uint8Array(await pdf.arrayBuffer()), (b) => String.fromCharCode(b)).join("")) : null;
      const lignes = Object.fromEntries(page.lignes.filter((l) => nonFourni.includes(l.cle) || prix[l.cle]?.trim()).map((l) => [l.cle, nonFourni.includes(l.cle) ? null : lireNombre(prix[l.cle]!)]));
      setPage(
        await api<PageNegoceAchat>(chemin, {
          method: "POST",
          body: { accepteConditions: true, prix: pdf && Object.keys(lignes).length === 0 ? null : lignes, delaiJours: lireNombre(delai), pdf: contenu ? { nom: pdf!.name, contenuBase64: contenu } : null, conditionsOuverture: { pieces: mesPieces, paiement: monPaiement, autre: monAutre.trim() || null } },
        }),
      );
    } catch (err) {
      setErreur(messageErreur(err, {}, { vous: true }));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[15px] font-semibold text-muted">{page.deLaPartDe}</p>
      <PageTitle>Demande de prix groupée</PageTitle>
      <Card className="flex flex-col gap-2 p-4">
        <p className="text-[18px] font-extrabold">{page.titre}</p>
        <ul className="flex flex-col gap-1 text-[15px]">
          {page.livraisons.map((l, i) => (
            <li key={i}>
              Livraison à {l.commune}, avant le {dateFr(l.dateBesoin)}
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
        <div role="status" className="flex flex-col gap-2 rounded-xl bg-ok-bg p-4 text-[16px] text-ok">
          <p className="font-semibold">Votre offre est enregistrée{page.reponse.pdf ? ` (devis ${page.reponse.pdf})` : ""}. Une seule offre par achat groupé : le bon de commande vous arrivera directement.</p>
          <ul className="flex flex-col gap-1 text-[15px]">
            {page.lignes
              .filter((l) => l.cle in page.reponse!.prix)
              .map((l) => (
                <li key={l.cle}>
                  {l.libelle} : {page.reponse!.prix[l.cle] === null ? "je ne fournis pas" : `${eurosHt(page.reponse!.prix[l.cle]!)} / ${l.unite}`}
                </li>
              ))}
          </ul>
        </div>
      ) : page.close ? (
        <p role="status" className="rounded-xl bg-ground p-4 text-[16px] font-semibold">
          La date de réponse est passée.
        </p>
      ) : (
        <form onSubmit={(e) => void envoyer(e)} aria-label="Votre offre" className="flex flex-col gap-5">
          <section aria-label="Votre prix ligne par ligne" className="flex flex-col gap-2">
            <SectionTitle>Votre prix, ligne par ligne</SectionTitle>
            <p className="text-[14px] text-muted">Prix unitaire HT, livraison comprise. {repondues} ligne{repondues > 1 ? "s" : ""} sur {page.lignes.length}.</p>
            <ul className="flex flex-col gap-2">
              {page.lignes.map((l) => {
                const non = nonFourni.includes(l.cle);
                return (
                  <li key={l.cle} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
                    <span className="text-[15px] font-semibold">
                      {l.libelle} · {quantite(l.quantite)} {l.unite}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-2 text-[14px] text-muted">
                        <span className="sr-only">Prix de {l.libelle}</span>
                        <input inputMode="decimal" disabled={non} value={prix[l.cle] ?? ""} placeholder="€ HT" onChange={(e) => setPrix({ ...prix, [l.cle]: e.target.value })} className={`${INPUT} max-w-32`} />
                        par {l.unite}
                      </label>
                      <label className="flex min-h-11 items-center gap-2 text-[14px] font-semibold">
                        <input type="checkbox" checked={non} onChange={(e) => setNonFourni((n) => (e.target.checked ? [...n, l.cle] : n.filter((k) => k !== l.cle)))} className="size-5 accent-accent" />
                        Je ne fournis pas
                      </label>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
          <Field id="delai" label="Délai de livraison (jours, facultatif)" inputMode="numeric" value={delai} onChange={(e) => setDelai(e.target.value)} />
          <div className="flex flex-col gap-2">
            <label htmlFor="devis" className="text-[14px] font-semibold">
              Ou votre devis PDF (les prix seront rattachés à chaque ligne)
            </label>
            <input id="devis" type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} className="text-[15px]" />
          </div>
          <fieldset className="flex flex-col gap-2 rounded-xl border border-line p-3">
            <legend className="px-1 text-[15px] font-semibold">Pour ouvrir un compte chez vous (coché une fois)</legend>
            {page.choixOuverture.pieces.map((p) => (
              <label key={p.valeur} className="flex min-h-11 items-center gap-3 text-[15px]">
                <input type="checkbox" checked={mesPieces.includes(p.valeur)} onChange={(e) => setPieces(e.target.checked ? [...mesPieces, p.valeur] : mesPieces.filter((x) => x !== p.valeur))} className="size-5 accent-accent" />
                {p.libelle}
              </label>
            ))}
            <p className="pt-1 text-[14px] font-semibold">Paiement au départ</p>
            {page.choixOuverture.paiements.map((p) => (
              <label key={p.valeur} className="flex min-h-11 items-center gap-3 text-[15px]">
                <input type="radio" name="paiement" checked={monPaiement === p.valeur} onChange={() => setPaiement(p.valeur)} className="size-5 accent-accent" />
                {p.libelle}
              </label>
            ))}
            <Field id="autre-condition" label="Autre (facultatif)" value={monAutre} onChange={(e) => setAutre(e.target.value)} />
          </fieldset>
          <label className="flex items-start gap-3 rounded-xl bg-ground p-3 text-[15px]">
            <input type="checkbox" checked={accepte} onChange={(e) => setAccepte(e.target.checked)} className="mt-1 size-5 accent-accent" />
            <span>
              J&apos;accepte les conditions ci-dessus et les <a href="/conditions-negoce" className="underline">conditions négoces</a>.
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
