"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ButtonLink, Card, ErrorNotice, Field, PageTitle, SectionTitle, Skeleton } from "@/components/ui";
import { api, ApiError, messageErreur } from "@/lib/api";
import { euros, jourFr, type PageChiffrage } from "@/lib/recentrage";

const unite = (u: string) => (u === "ml" ? "m" : u);
const lireNombre = (s: string) => (s.trim() === "" ? null : Number(s.replace(/\s/g, "").replace(",", ".")));

/**
 * LE CHIFFRAGE EN LIGNE, SANS COMPTE (Greg, 25 octobre 2026) : le négoce reçoit un e-mail au nom de l'artisan avec un lien
 * sécurisé ; ici, un prix par ligne, la livraison, le délai et la validité (7 jours au moins). Une grille partielle passe.
 * Trois gestes (6 novembre 2026) : « Je vais répondre », « J'ai besoin d'une précision », « Je ne peux pas chiffrer ». Après la première réponse, l'invitation à créer son compte. Une commande reçue se
 * confirme ici. Vouvoiement ; jamais le prix d'un autre négoce.
 */
export default function ChiffrerPage() {
  const { jeton } = useParams<{ jeton: string }>();
  const [page, setPage] = useState<PageChiffrage | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [prix, setPrix] = useState<Record<string, string>>({});
  const [livraison, setLivraison] = useState("0");
  const [delai, setDelai] = useState("");
  const [validite, setValidite] = useState("30");
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [compte, setCompte] = useState<{ phrase: string; lien: string } | null>(null);
  const [modifier, setModifier] = useState(false);
  // Le parcours du négoce (6 novembre 2026, point 13) : trois gestes avant (ou au lieu) du chiffrage.
  const [geste, setGeste] = useState<"precision" | "refus" | null>(null);
  const [texte, setTexte] = useState("");
  const chemin = `/v1/public/chiffrer/${encodeURIComponent(jeton)}`;

  function charger() {
    api<PageChiffrage>(chemin)
      .then((p) => {
        setPage(p);
        if (p.reponse) {
          setPrix(Object.fromEntries(Object.entries(p.reponse.prix).map(([k, v]) => [k, String(v).replace(".", ",")])));
          setLivraison(String(p.reponse.livraisonHt).replace(".", ","));
          setDelai(p.reponse.delaiJours == null ? "" : String(p.reponse.delaiJours));
          setValidite(String(p.reponse.validiteJours ?? 30));
        }
      })
      .catch((e) => setError(e instanceof ApiError ? e : new ApiError("internal_error", 500)));
  }
  useEffect(charger, [chemin]);

  async function envoyer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!page) return;
    const v = lireNombre(validite) ?? 0;
    if (v < page.validiteMin) return setErreur(`Validité de ${page.validiteMin} jours au moins.`);
    const corps = Object.fromEntries(Object.entries(prix).map(([k, s]) => [k, lireNombre(s)]).filter(([, n]) => n != null && Number.isFinite(n)));
    if (Object.keys(corps).length === 0) return setErreur("Indiquez au moins un prix.");
    setPending(true);
    setErreur(null);
    try {
      const r = await api<{ fait: boolean; compte: { phrase: string; lien: string } | null }>(chemin, {
        method: "POST",
        body: { prix: corps, livraisonHt: lireNombre(livraison) ?? 0, delaiJours: lireNombre(delai), validiteJours: v },
      });
      if (r.compte) setCompte(r.compte);
      setModifier(false);
      charger();
    } catch (e) {
      setErreur(messageErreur(e, { demande_close: "La demande est close : la date de besoin est passée.", deja_commande: "La commande est déjà passée.", validite_trop_courte: `Validité de ${page.validiteMin} jours au moins.`, aucun_prix: "Indiquez au moins un prix." }));
    } finally {
      setPending(false);
    }
  }

  async function action(quoi: "refuser" | "confirmer" | "intention" | "precision", corps?: Record<string, string | null>) {
    setPending(true);
    setErreur(null);
    try {
      await api(`${chemin}/${quoi}`, { method: "POST", ...(corps ? { body: corps } : {}) });
      setGeste(null);
      setTexte("");
      charger();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setPending(false);
    }
  }

  if (error) return <ErrorNotice error={error} />;
  if (!page) return <Skeleton card="h-72" lines={4} label="Chargement de la demande…" />;

  const total = page.lignes.reduce((s, l) => s + (lireNombre(prix[l.cle] ?? "") ?? 0) * l.quantite, 0) + (lireNombre(livraison) ?? 0);
  const formulaire = (page.etat === "a_chiffrer" || page.etat === "refuse" || modifier) && !page.close;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <PageTitle>{page.but === "commander" ? "Demande de prix avant commande" : "Demande de prix"}</PageTitle>
        <p className="text-[16px] leading-relaxed text-muted">
          {page.artisan} vous demande un prix{page.ville ? `, livraison à ${page.ville}` : ""}
          {page.dateBesoin ? `, pour le ${jourFr(page.dateBesoin)}` : ""}. Aucun compte nécessaire.
        </p>
      </div>

      {compte ? (
        <Card className="flex flex-col gap-3 p-4">
          <p className="text-[15px] font-semibold">{compte.phrase}</p>
          <ButtonLink href={compte.lien}>Créer mon compte négoce</ButtonLink>
        </Card>
      ) : null}

      {page.commande ? (
        <Card className="flex flex-col gap-3 p-4" aria-label="Commande">
          <SectionTitle>Commande reçue le {jourFr(page.commande.le)}</SectionTitle>
          <p className="text-[15px] text-muted">{page.artisan} a retenu votre offre. Le bon de commande est dans votre e-mail.</p>
          {page.commande.suivi === "recue" ? (
            <Button onClick={() => void action("confirmer")} pending={pending}>
              Confirmer la commande
            </Button>
          ) : (
            <p className="text-[15px] font-semibold text-ok">{page.commande.suivi === "livree" ? "Livrée." : "Confirmée. Merci."}</p>
          )}
        </Card>
      ) : null}

      {page.precision ? (
        <section aria-label="Votre question">
        <Card className="flex flex-col gap-1.5 p-4">
          <p className="text-[14px] font-semibold text-muted">Votre question</p>
          <p className="text-[15px]">« {page.precision.question} »</p>
          {page.precision.reponse ? (
            <p className="text-[15px] font-semibold">
              Réponse de {page.artisan} : « {page.precision.reponse} »
            </p>
          ) : (
            <p className="text-[14px] text-muted">{page.artisan} a reçu votre question ; sa réponse s&apos;affichera ici et vous arrivera par e-mail.</p>
          )}
        </Card>
        </section>
      ) : null}

      {page.etat === "a_chiffrer" && !page.close && !page.commande ? (
        <section aria-label="Votre réponse">
        <Card className="flex flex-col gap-3 p-4">
          <SectionTitle>Votre réponse</SectionTitle>
          {page.vaRepondre ? <p className="text-[15px] font-semibold text-ok">{page.artisan} sait que vous allez répondre.</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {!page.vaRepondre ? (
              <Button variant="secondary" onClick={() => void action("intention")} pending={pending && geste === null}>
                Je vais répondre
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => (setGeste(geste === "precision" ? null : "precision"), setTexte(""))} disabled={pending}>
              J&apos;ai besoin d&apos;une précision
            </Button>
            <Button variant="secondary" onClick={() => (setGeste(geste === "refus" ? null : "refus"), setTexte(""))} disabled={pending}>
              Je ne peux pas chiffrer
            </Button>
          </div>
          {geste ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (geste === "precision") {
                  if (texte.trim().length < 3) return setErreur("Écrivez votre question.");
                  void action("precision", { question: texte.trim() });
                } else void action("refuser", { motif: texte.trim() || null });
              }}
              className="flex flex-col gap-2"
            >
              <label htmlFor="geste-texte" className="text-[14px] font-semibold">
                {geste === "precision" ? "Votre question" : "Pourquoi ? (facultatif)"}
              </label>
              <textarea
                id="geste-texte"
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                maxLength={geste === "precision" ? 1000 : 300}
                rows={3}
                placeholder={geste === "precision" ? "Ex. : les liteaux, traités classe 2 ou classe 4 ?" : "Ex. : article pas en stock, hors de notre secteur…"}
                className="rounded-xl border border-line bg-surface p-3 text-[16px] outline-none focus-visible:border-accent"
              />
              <Button type="submit" pending={pending}>
                {geste === "precision" ? "Envoyer ma question" : "Confirmer : je ne chiffre pas"}
              </Button>
            </form>
          ) : null}
          {erreur && geste ? (
            <p role="alert" className="text-[15px] font-semibold text-danger">
              {erreur}
            </p>
          ) : null}
        </Card>
        </section>
      ) : null}

      {page.close && page.etat === "a_chiffrer" ? <p className="rounded-xl bg-ground p-4 text-[15px]">Cette demande est close : la date de besoin est passée.</p> : null}
      {page.etat === "refuse" ? (
        <p className="rounded-xl bg-ground p-4 text-[15px]">
          Vous avez indiqué ne pas chiffrer cette demande{page.refusMotif ? ` (« ${page.refusMotif} »)` : ""}. Vous pouvez encore envoyer une offre ci-dessous.
        </p>
      ) : null}

      {page.reponse && !formulaire && !page.commande ? (
        <Card className="flex flex-col gap-2 p-4">
          <p className="text-[15px] font-semibold text-ok">Votre offre est envoyée, valable jusqu&apos;au {jourFr(page.reponse.valideJusquau)}.</p>
          {!page.close ? (
            <Button variant="secondary" onClick={() => setModifier(true)}>
              Modifier mon offre
            </Button>
          ) : null}
        </Card>
      ) : null}

      <form onSubmit={(e) => void envoyer(e)} className="flex flex-col gap-4">
        <section aria-label="Les articles" className="flex flex-col gap-2">
          <SectionTitle>Les articles (prix unitaire HT)</SectionTitle>
          <Card className="divide-y divide-line">
            {page.lignes.map((l) => (
              <div key={l.cle} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex min-w-0 flex-col">
                  <span className="text-[15px] font-semibold">{l.designation}</span>
                  <span className="text-[13px] text-muted">
                    {l.quantite.toLocaleString("fr-FR")} {unite(l.unite)}
                  </span>
                </span>
                {formulaire ? (
                  <label className="flex shrink-0 items-center gap-1">
                    <span className="sr-only">Prix unitaire HT de {l.designation}</span>
                    <input inputMode="decimal" value={prix[l.cle] ?? ""} onChange={(e) => setPrix((p) => ({ ...p, [l.cle]: e.target.value }))} placeholder="—" className="min-h-11 w-24 rounded-xl border border-line bg-surface px-3 text-right text-[16px] outline-none focus-visible:border-accent" />
                    <span className="text-[14px] text-muted">€</span>
                  </label>
                ) : (
                  <span className="shrink-0 text-[15px] font-semibold">{page.reponse?.prix[l.cle] != null ? euros(page.reponse.prix[l.cle]!) : "Non chiffré"}</span>
                )}
              </div>
            ))}
          </Card>
          {formulaire ? <p className="text-[13px] text-muted">Laissez vide un article que vous ne fournissez pas.</p> : null}
        </section>

        {formulaire ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field id="livraison" label="Livraison HT (€)" inputMode="decimal" value={livraison} onChange={(e) => setLivraison(e.target.value)} />
              <Field id="delai" label="Délai (jours)" inputMode="numeric" value={delai} onChange={(e) => setDelai(e.target.value)} />
              <Field id="validite" label={`Validité (jours, ${page.validiteMin} au moins)`} inputMode="numeric" value={validite} onChange={(e) => setValidite(e.target.value)} />
            </div>
            <p className="text-[16px] font-extrabold">Total livré : {euros(total)} HT</p>
            {erreur ? (
              <p role="alert" className="text-[15px] font-semibold text-danger">
                {erreur}
              </p>
            ) : null}
            <Button type="submit" pending={pending} className="w-full">
              Envoyer mon offre
            </Button>

          </>
        ) : null}
      </form>
      <p className="text-[13px] text-muted">Votre prix n&apos;est vu que par {page.artisan}. Aucun autre négoce ne le voit, et rien ne vous est facturé.</p>
    </div>
  );
}
