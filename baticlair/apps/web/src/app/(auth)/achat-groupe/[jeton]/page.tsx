"use client";

import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Card, ErrorNotice, Field, INPUT, PageTitle, Skeleton } from "@/components/ui";
import { api, ApiError, messageErreur } from "@/lib/api";
import { phraseCompteARebours } from "../../../../../../../packages/domain/src/groupe/ton";
import { dateFr, eurosHt, quantite, type LectureExcel, type PageNegoceAchat, type RecapOffreNegoce } from "@/lib/achat-groupe";

const lireNombre = (s: string) => (s.trim() === "" ? null : Number(s.replace(/\s/g, "").replace(",", ".")));
const RESUME = "flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-[16px] font-extrabold";
const SECONDAIRE = "pressable inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-surface px-4 text-[15px] font-semibold text-ink active:bg-ground";
type Etape = "accueil" | "choix" | "saisie" | "excel" | "pdf" | "recap";
type Facon = "saisie" | "excel" | "pdf";

const base64 = async (f: File) => btoa(Array.from(new Uint8Array(await f.arrayBuffer()), (b) => String.fromCharCode(b)).join(""));

/**
 * LA PAGE DU NÉGOCE (Greg, 28 octobre 2026, point 3) : une question par écran, un seul bouton principal.
 * 1. L'accueil : le titre, la date limite et « Déposer mon offre » visibles sans défiler ; sous le titre, « Télécharger en
 *    PDF » et « Exporter en Excel » (secondaires).
 * 2. « Comment voulez-vous répondre ? » : saisir mes prix ici, déposer l'Excel rempli (lu par le code, lignes à confirmer,
 *    une ligne vide ou illisible en rouge, corrigeable sur place), déposer mon devis PDF (lu par l'IA, vérifié par l'admin).
 * 3. Le récapitulatif : total HT, lignes manquantes, conditions, ouverture de compte, puis « Envoyer mon offre ».
 * 4. Une seule offre : ensuite « Offre envoyée le … » et le récapitulatif, plus de bouton. Vouvoiement.
 */
export default function ReponseAchatGroupePage() {
  const { jeton } = useParams<{ jeton: string }>();
  const chemin = `/v1/public/achat-groupe/${encodeURIComponent(jeton)}`;
  const [page, setPage] = useState<PageNegoceAchat | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [etape, setEtape] = useState<Etape>("accueil");
  const [facon, setFacon] = useState<Facon>("saisie");
  const [prix, setPrix] = useState<Record<string, string>>({});
  const [nonFourni, setNonFourni] = useState<string[]>([]);
  const [lecture, setLecture] = useState<LectureExcel | null>(null);
  const [delai, setDelai] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [pieces, setPieces] = useState<string[] | null>(null);
  const [paiement, setPaiement] = useState<string | null | undefined>(undefined);
  const [autre, setAutre] = useState<string | null>(null);
  const [accepte, setAccepte] = useState(false);
  // Lot final, point 7 : « Plus que 2 jours pour répondre », calculé à l'ouverture de la page.
  const [ouvertLe] = useState(() => new Date());
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const haut = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<PageNegoceAchat>(chemin)
      .then(setPage)
      .catch((e) => setError(e instanceof ApiError ? e : new ApiError("internal_error", 500)));
  }, [chemin]);
  useEffect(() => {
    haut.current?.scrollIntoView({ block: "start" });
  }, [etape]);

  if (error) return <ErrorNotice error={error} />;
  if (!page) return <Skeleton card="h-64" lines={3} label="Chargement de la demande…" />;
  const mesPieces = pieces ?? page.conditionsOuverture?.pieces ?? [];
  const monPaiement = paiement === undefined ? (page.conditionsOuverture?.paiement ?? null) : paiement;
  const monAutre = autre ?? page.conditionsOuverture?.autre ?? "";
  const conditionsCochees = mesPieces.length + (monPaiement ? 1 : 0);
  const prixDe = (cle: string) => (nonFourni.includes(cle) ? null : lireNombre(prix[cle] ?? ""));
  const repondue = (cle: string) => nonFourni.includes(cle) || (prixDe(cle) ?? 0) > 0;
  const repondues = page.lignes.filter((l) => repondue(l.cle)).length;
  const lignesPrix = Object.fromEntries(page.lignes.filter((l) => repondue(l.cle)).map((l) => [l.cle, prixDe(l.cle)]));
  const totalHt = page.lignes.reduce((s, l) => s + (prixDe(l.cle) ?? 0) * l.quantite, 0);
  const manquantes = page.lignes.filter((l) => !((prixDe(l.cle) ?? 0) > 0));

  function aller(e: Etape) {
    setErreur(null);
    setEtape(e);
  }
  function choisir(f: Facon) {
    setFacon(f);
    aller(f);
  }
  function continuer() {
    if (facon === "pdf" && !pdf) return setErreur("Choisissez votre devis PDF.");
    if (facon !== "pdf" && repondues < page!.lignes.length) return setErreur("Répondez à chaque ligne : un prix, ou « Je ne fournis pas ».");
    if (facon !== "pdf" && Object.values(lignesPrix).every((p) => p === null)) return setErreur("Indiquez au moins un prix, ou déposez votre devis PDF.");
    aller("recap");
  }
  async function lireExcel(f: File) {
    setPending(true);
    setErreur(null);
    try {
      const lu = await api<LectureExcel>(`${chemin}/excel`, { method: "POST", body: { contenuBase64: await base64(f) } });
      setLecture(lu);
      setPrix(Object.fromEntries(lu.lignes.filter((l) => l.prixHt !== null).map((l) => [l.cle, String(l.prixHt).replace(".", ",")])));
      setNonFourni(lu.lignes.filter((l) => l.etat === "non_fourni").map((l) => l.cle));
    } catch (err) {
      setLecture(null);
      setErreur(messageErreur(err, {}, { vous: true }));
    } finally {
      setPending(false);
    }
  }
  async function envoyer() {
    if (!page) return;
    if (!accepte) return setErreur("Acceptez les conditions pour envoyer votre offre.");
    setPending(true);
    setErreur(null);
    try {
      const contenu = facon === "pdf" && pdf ? await base64(pdf) : null;
      setPage(
        await api<PageNegoceAchat>(chemin, {
          method: "POST",
          body: { accepteConditions: true, prix: contenu ? null : lignesPrix, delaiJours: lireNombre(delai), pdf: contenu ? { nom: pdf!.name, contenuBase64: contenu } : null, conditionsOuverture: { pieces: mesPieces, paiement: monPaiement, autre: monAutre.trim() || null } },
        }),
      );
      setEtape("accueil");
    } catch (err) {
      setErreur(messageErreur(err, {}, { vous: true }));
    } finally {
      setPending(false);
    }
  }

  const retour = (vers: Etape) => (
    <button type="button" onClick={() => aller(vers)} className="pressable flex min-h-11 w-fit items-center gap-1 text-[15px] font-semibold text-accent-text">
      <ChevronLeft size={18} aria-hidden="true" />
      Retour
    </button>
  );
  const alerte = erreur ? (
    <p role="alert" className="text-[15px] font-semibold text-danger">
      {erreur}
    </p>
  ) : null;

  const rebours = phraseCompteARebours(new Date(page.reponseAvantLe), ouvertLe);
  return (
    <div ref={haut} className="flex flex-col gap-5">
      {etape === "accueil" ? (
        <>
          <p className="text-[15px] font-semibold text-muted">{page.deLaPartDe}</p>
          <PageTitle>Demande de prix groupée</PageTitle>
          <p className="text-[18px] font-extrabold">{page.titre}</p>
          <p className="text-[16px] font-semibold">
            Réponse avant le {dateFr(page.reponseAvantLe)}.
            {!page.reponse && !page.close && rebours ? <span className="ml-2 inline-block rounded-full bg-accent-soft px-2.5 py-0.5 text-[14px] font-bold">{rebours}</span> : null}
          </p>
          {page.reponse ? (
            <div role="status" className="flex flex-col gap-3 rounded-xl bg-ok-bg p-4 text-ok">
              <p className="text-[17px] font-extrabold">Offre envoyée le {dateFr(page.reponse.le)}.</p>
              <p className="text-[15px]">Une seule offre par achat groupé : elle est ferme jusqu&apos;à la date de commande. La confirmation et le récapitulatif en PDF vous ont été envoyés par e-mail.</p>
              <Recap r={page.reponse.recap} />
            </div>
          ) : page.close ? (
            <p role="status" className="rounded-xl bg-ground p-4 text-[16px] font-semibold">
              La date de réponse est passée.
            </p>
          ) : (
            <Button onClick={() => aller("choix")}>Déposer mon offre</Button>
          )}
          <div className="flex flex-wrap gap-2">
            <a href={`${chemin}/demande.pdf`} download="demande-mobiiz.pdf" className={SECONDAIRE}>
              Télécharger en PDF
            </a>
            <a href={`${chemin}/demande.xlsx`} download="demande-mobiiz.xlsx" className={SECONDAIRE}>
              Exporter en Excel
            </a>
          </div>
          <Card className="flex flex-col gap-2 p-4">
            <h2 className="text-[16px] font-extrabold">{page.lignes.length} références, quantités cumulées</h2>
            <ul aria-label="La demande" className="flex flex-col gap-1 text-[15px]">
              {page.lignes.map((l) => (
                <li key={l.cle} className="flex justify-between gap-3">
                  <span>{l.libelle}</span>
                  <span className="shrink-0 font-semibold">
                    {quantite(l.quantite)} {l.unite}
                  </span>
                </li>
              ))}
            </ul>
            <ul className="flex flex-col gap-1 pt-2 text-[15px] text-muted">
              {page.livraisons.map((l, i) => (
                <li key={i}>
                  Livraison à {l.commune}, avant le {dateFr(l.dateBesoin)}
                </li>
              ))}
            </ul>
            <details className="pt-1">
              <summary className="min-h-11 cursor-pointer list-none text-[15px] font-semibold text-accent-text underline">Les règles de cette demande</summary>
              <ul aria-label="Conditions" className="flex list-disc flex-col gap-1 pt-2 pl-5 text-[15px]">
                {page.conditions.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </details>
          </Card>
        </>
      ) : null}

      {etape === "choix" ? (
        <section aria-label="Comment voulez-vous répondre ?" className="flex flex-col gap-4">
          {retour("accueil")}
          <PageTitle>Comment voulez-vous répondre ?</PageTitle>
          <ul className="flex flex-col gap-3">
            {(
              [
                ["saisie", "Saisir mes prix ici", "Un prix par ligne, directement sur cette page."],
                ["excel", "Déposer l'Excel rempli", "Le fichier exporté, avec vos prix dans la colonne « Prix unitaire HT »."],
                ["pdf", "Déposer mon devis PDF", "Votre devis habituel : il sera lu et vérifié avant la comparaison."],
              ] as const
            ).map(([f, titre, detail]) => (
              <li key={f}>
                <button type="button" onClick={() => choisir(f)} className="pressable flex min-h-16 w-full items-center justify-between gap-3 rounded-xl bg-surface p-4 text-left shadow-card active:bg-ground">
                  <span>
                    <span className="block text-[17px] font-extrabold">{titre}</span>
                    <span className="block text-[14px] text-muted">{detail}</span>
                  </span>
                  <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {etape === "saisie" ? (
        <section aria-label="Votre prix ligne par ligne" className="flex flex-col gap-4">
          {retour("choix")}
          <div className="flex items-baseline justify-between gap-3">
            <PageTitle>Votre prix, ligne par ligne</PageTitle>
            <span className="shrink-0 text-[14px] font-semibold text-muted">
              {repondues} / {page.lignes.length}
            </span>
          </div>
          <p className="text-[14px] text-muted">Prix unitaire HT, livraison comprise.</p>
          <ul className="flex flex-col gap-2">
            {page.lignes.map((l) => (
              <LignePrix key={l.cle} l={l} valeur={prix[l.cle] ?? ""} non={nonFourni.includes(l.cle)} onPrix={(v) => setPrix({ ...prix, [l.cle]: v })} onNon={(v) => setNonFourni((n) => (v ? [...n, l.cle] : n.filter((k) => k !== l.cle)))} />
            ))}
          </ul>
          {alerte}
          <Button onClick={continuer}>Continuer</Button>
        </section>
      ) : null}

      {etape === "excel" ? (
        <section aria-label="Déposer l'Excel rempli" className="flex flex-col gap-4">
          {retour("choix")}
          <PageTitle>Déposer l&apos;Excel rempli</PageTitle>
          {!lecture ? (
            <>
              <p className="text-[15px] text-muted">
                Le fichier « Exporter en Excel » de cette page, avec vos prix dans la colonne « Prix unitaire HT » et « non » dans « Disponible » pour ce que vous ne fournissez pas.
              </p>
              <label htmlFor="excel" className="text-[15px] font-semibold">
                Votre fichier Excel
              </label>
              <input id="excel" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={pending} onChange={(e) => e.target.files?.[0] && void lireExcel(e.target.files[0])} className="text-[15px]" />
              {pending ? <p className="text-[14px] text-muted">Lecture du fichier…</p> : null}
              {alerte}
              <a href={`${chemin}/demande.xlsx`} download="demande-mobiiz.xlsx" className={`${SECONDAIRE} w-fit`}>
                Exporter en Excel
              </a>
            </>
          ) : (
            <>
              <p className="text-[15px] font-semibold">
                {lecture.aCorriger === 0 ? "Tout est lu. Vérifiez, puis continuez." : `${lecture.aCorriger} ligne${lecture.aCorriger > 1 ? "s" : ""} à compléter, en rouge.`}
              </p>
              <ul className="flex flex-col gap-2">
                {page.lignes.map((l) => {
                  const lu = lecture.lignes.find((x) => x.cle === l.cle);
                  const rouge = !repondue(l.cle);
                  return <LignePrix key={l.cle} l={l} valeur={prix[l.cle] ?? ""} non={nonFourni.includes(l.cle)} rouge={rouge} sousTitre={rouge ? (lu?.etat === "illisible" ? `Lu : « ${lu.lu} », prix illisible` : "Prix vide dans le fichier") : null} onPrix={(v) => setPrix({ ...prix, [l.cle]: v })} onNon={(v) => setNonFourni((n) => (v ? [...n, l.cle] : n.filter((k) => k !== l.cle)))} />;
                })}
              </ul>
              {alerte}
              <Button onClick={continuer}>Continuer</Button>
              <button type="button" onClick={() => setLecture(null)} className="pressable min-h-11 text-[15px] font-semibold text-accent-text underline">
                Déposer un autre fichier
              </button>
            </>
          )}
        </section>
      ) : null}

      {etape === "pdf" ? (
        <section aria-label="Déposer mon devis PDF" className="flex flex-col gap-4">
          {retour("choix")}
          <PageTitle>Déposer mon devis PDF</PageTitle>
          <p className="text-[15px] text-muted">Vos prix seront rattachés à chaque ligne, puis vérifiés avant la comparaison.</p>
          <label htmlFor="devis" className="text-[15px] font-semibold">
            Votre devis PDF
          </label>
          <input id="devis" type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} className="text-[15px]" />
          <Field id="delai" label="Délai de livraison (jours, facultatif)" inputMode="numeric" value={delai} onChange={(e) => setDelai(e.target.value)} />
          {alerte}
          <Button onClick={continuer}>Continuer</Button>
        </section>
      ) : null}

      {etape === "recap" ? (
        <section aria-label="Récapitulatif de votre offre" className="flex flex-col gap-4">
          {retour(facon)}
          <PageTitle>Votre offre</PageTitle>
          <Card className="flex flex-col gap-2 p-4">
            {facon === "pdf" ? (
              <p className="text-[15px] font-semibold">Devis PDF : {pdf?.name}</p>
            ) : (
              <>
                <ul aria-label="Vos prix" className="flex flex-col gap-1 text-[15px]">
                  {page.lignes.map((l) => {
                    const p = prixDe(l.cle);
                    return (
                      <li key={l.cle} className={`flex justify-between gap-3 ${p ? "" : "text-warn"}`}>
                        <span>{l.libelle}</span>
                        <span className="shrink-0 font-semibold">{p ? `${eurosHt(p)} / ${l.unite}` : "non fourni"}</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="flex justify-between gap-3 border-t border-line pt-2 text-[17px] font-extrabold">
                  <span>Total HT livré</span>
                  <span>{eurosHt(totalHt)}</span>
                </p>
                {manquantes.length ? <p className="text-[14px] font-semibold text-warn">{manquantes.length === 1 ? "1 ligne non fournie" : `${manquantes.length} lignes non fournies`} : l&apos;offre est incomplète, les offres complètes passent devant.</p> : null}
              </>
            )}
            {facon !== "pdf" ? <Field id="delai" label="Délai de livraison (jours, facultatif)" inputMode="numeric" value={delai} onChange={(e) => setDelai(e.target.value)} /> : null}
          </Card>
          <details className="rounded-xl bg-surface p-4 shadow-card">
            <summary className={RESUME}>
              <span>
                Pour ouvrir un compte chez vous
                <span className="block text-[14px] font-normal text-muted">{conditionsCochees ? `${conditionsCochees} condition${conditionsCochees > 1 ? "s" : ""} cochée${conditionsCochees > 1 ? "s" : ""}, une fois pour toutes` : "Facultatif, coché une fois pour toutes"}</span>
              </span>
              <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden="true" />
            </summary>
            <fieldset aria-label="Conditions d'ouverture de compte" className="flex flex-col gap-2 pt-3">
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
          </details>
          <label className="flex items-start gap-3 rounded-xl bg-ground p-3 text-[15px]">
            <input type="checkbox" checked={accepte} onChange={(e) => setAccepte(e.target.checked)} className="mt-1 size-5 accent-accent" />
            <span>
              J&apos;accepte les conditions de cette demande et les <a href="/conditions-negoce" className="underline">conditions négoces</a>.
            </span>
          </label>
          {alerte}
          <Button onClick={() => void envoyer()} pending={pending}>
            Envoyer mon offre
          </Button>
        </section>
      ) : null}
    </div>
  );
}

function LignePrix({ l, valeur, non, rouge = false, sousTitre = null, onPrix, onNon }: { l: { cle: string; libelle: string; quantite: number; unite: string }; valeur: string; non: boolean; rouge?: boolean; sousTitre?: string | null; onPrix: (v: string) => void; onNon: (v: boolean) => void }) {
  const ok = non || (lireNombre(valeur) ?? 0) > 0;
  return (
    <li className={`flex flex-col gap-2 rounded-xl border bg-surface p-3 ${rouge ? "border-l-4 border-danger" : ok ? "border-ok" : "border-line"}`}>
      <span className="text-[15px] font-semibold">
        {l.libelle} · {quantite(l.quantite)} {l.unite}
      </span>
      {sousTitre ? <span className="text-[14px] font-semibold text-danger">{sousTitre}</span> : null}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-[14px] text-muted">
          <span className="sr-only">Prix de {l.libelle}</span>
          <input inputMode="decimal" disabled={non} value={valeur} placeholder="€ HT" onChange={(e) => onPrix(e.target.value)} className={`${INPUT} max-w-32`} />
          par {l.unite}
        </label>
        <label className="flex min-h-11 items-center gap-2 text-[14px] font-semibold">
          <input type="checkbox" checked={non} onChange={(e) => onNon(e.target.checked)} className="size-5 accent-accent" />
          Je ne fournis pas
        </label>
      </div>
    </li>
  );
}

function Recap({ r }: { r: RecapOffreNegoce }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-surface p-3 text-[15px] text-ink">
      {r.pdf ? <p className="font-semibold">Devis PDF : {r.pdf}</p> : null}
      {r.lignes.some((l) => l.prixHt !== null) ? (
        <>
          <ul aria-label="Votre offre" className="flex flex-col gap-1">
            {r.lignes.map((l) => (
              <li key={l.cle} className="flex justify-between gap-3">
                <span>{l.libelle}</span>
                <span className="shrink-0 font-semibold">{l.prixHt === null ? "non fourni" : `${eurosHt(l.prixHt)} / ${l.unite}`}</span>
              </li>
            ))}
          </ul>
          <p className="flex justify-between gap-3 border-t border-line pt-2 font-extrabold">
            <span>Total HT livré</span>
            <span>{eurosHt(r.totalHt)}</span>
          </p>
        </>
      ) : null}
      {r.delaiJours !== null ? <p className="text-muted">Délai de livraison : {r.delaiJours} jour{r.delaiJours > 1 ? "s" : ""}.</p> : null}
    </div>
  );
}
