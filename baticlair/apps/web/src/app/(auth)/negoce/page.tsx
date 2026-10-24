"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DepartementsForm, DepotsForm, PaliersForm, depuisPaliers, versPaliers, type PaliersSaisis } from "@/components/negoce/paliers-form";
import { Button, ErrorNotice, Field, PageTitle, SectionTitle, Skeleton } from "@/components/ui";
import { api, ApiError, messageErreur } from "@/lib/api";
import { chrono } from "@/lib/cycle";
import { NOM } from "@/lib/nom";
import { dateFr, euros, type CompteNegoce } from "@/lib/negoce";

/**
 * LE COMPTE DU NÉGOCE (Greg, 23 octobre 2026, points 1 à 4) : son espace, par lien magique, session de 30 jours. Pendant
 * les dépôts des artisans, il ne voit que « Prochaine clôture dans X jours » ; après la clôture, ses grilles à chiffrer ;
 * ses commandes reçues (là seulement il voit l'artisan). Dépôts, paliers et départements modifiables ; désabonnement d'un
 * département ou de tout ; suppression du compte. Vouvoiement.
 */
const CARTE = "flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card";

const ERREURS: Record<string, string> = {
  paliers_invalides: "Vos paliers ne vont pas : des distances croissantes, deux paliers payants au plus, des nombres positifs.",
  depot_requis: "Indiquez l'adresse d'au moins un dépôt.",
  departement_requis: "Indiquez au moins un département desservi.",
  enseigne_requise: "Indiquez le nom de votre enseigne.",
};

function useClotureDans(clotureLe: string | null, initial: string | null): string | null {
  const [texte, setTexte] = useState(initial);
  useEffect(() => {
    if (!clotureLe) return;
    const calcule = () => setTexte(chrono(new Date(), new Date(clotureLe)));
    calcule();
    const t = setInterval(calcule, 30_000);
    return () => clearInterval(t);
  }, [clotureLe]);
  return texte;
}

export default function CompteNegocePage() {
  const router = useRouter();
  const [compte, setCompte] = useState<CompteNegoce | null>(null);
  const [erreur, setErreur] = useState<ApiError | null>(null);
  const charger = useCallback(() => {
    api<CompteNegoce>("/v1/negoce/compte")
      .then(setCompte)
      .catch((e) => {
        const a = e instanceof ApiError ? e : new ApiError("internal_error", 500);
        if (a.status === 401) router.replace("/negoce/connexion");
        else setErreur(a);
      });
  }, [router]);
  useEffect(charger, [charger]);
  const clotureDans = useClotureDans(compte?.prochaine?.clotureLe ?? null, compte?.prochaine?.clotureDans ?? null);

  async function deconnecter() {
    try {
      await api("/v1/negoce/deconnexion", { method: "POST" });
    } finally {
      router.replace("/negoce/connexion");
    }
  }

  if (erreur) {
    return (
      <>
        <PageTitle>Espace négoce</PageTitle>
        <ErrorNotice error={erreur} onRetry={charger} />
      </>
    );
  }
  if (!compte) return <Skeleton card="h-40" lines={3} label="Chargement de votre espace…" />;
  return (
    <>
      <PageTitle>{compte.enseigne}</PageTitle>
      <p className="text-[15px] text-muted">{`Votre espace ${NOM} · ${compte.email}`}</p>

      <section aria-label="Prochaine clôture" className={CARTE}>
        {compte.prochaine && clotureDans ? (
          <>
            <p className="text-[13px] font-semibold tracking-[0.06em] text-muted uppercase">Prochaine clôture dans</p>
            <p className="text-[32px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">{clotureDans.replace(/ /g, " ")}</p>
            <p className="text-[15px] text-muted">{`Les artisans déposent leurs listes. À la clôture, vous recevez la grille ${compte.prochaine.de} de vos départements (${compte.departements.join(", ")}) par e-mail.`}</p>
          </>
        ) : (
          <p className="text-[15px] font-semibold">Vous n&apos;êtes abonné à aucun département : vous ne recevez plus de grille.</p>
        )}
      </section>

      {compte.grilles.length > 0 ? (
        <section aria-label="Grilles à chiffrer" className={CARTE}>
          <SectionTitle>Grilles à chiffrer</SectionTitle>
          <ul className="flex flex-col divide-y divide-line">
            {compte.grilles.map((g) => (
              <li key={`${g.mois}-${g.departement}`} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="flex min-w-0 flex-col">
                  <span className="text-[16px] font-extrabold">{`Grille ${g.de} (${g.departement})`}</span>
                  <span className="text-[13px] font-semibold text-muted">{g.deposee ? "Devis déposé." : `Réponse attendue dans ${g.reponseDans}.`}</span>
                  {g.consultation ? <span className="text-[13px] text-muted">{g.consultation}</span> : null}
                </span>
                <Link href={g.lien} className="pressable inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-[15px] font-semibold text-on-accent">
                  {g.deposee ? "Voir ma grille" : "Chiffrer"}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-label="Commandes reçues" className={CARTE}>
        <SectionTitle>Commandes reçues</SectionTitle>
        {compte.commandes.length === 0 ? (
          <p className="text-[15px] text-muted">Aucune commande pour l&apos;instant. Quand un artisan commande chez vous, son bon arrive par e-mail et il apparaît ici.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {compte.commandes.map((c, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 py-3 text-[15px]">
                <span className="min-w-0">
                  <span className="font-extrabold">{c.artisan}</span>
                  <span className="block text-[13px] font-semibold text-muted">{`${c.type === "garantie" ? "Commande sur grille garantie" : "Commande"} ${c.de} · ${dateFr(c.le)}`}</span>
                </span>
                <span className="shrink-0 font-extrabold tabular-nums">{`${euros(c.totalHt)} HT`}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Reglages compte={compte} onChange={charger} />
      <Abonnements compte={compte} onChange={charger} />

      {/* Mes données (RGPD, 24 octobre 2026) : tout ce que BatiClair garde du négoce, en JSON ou en PDF lisible. */}
      <section aria-label="Mes données" className="flex flex-col gap-2">
        <h2 className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Mes données</h2>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <a href="/v1/negoce/export" download className="inline-flex min-h-11 items-center text-[15px] font-semibold text-accent-text">
            Télécharger mes données
          </a>
          <a href="/v1/negoce/export.pdf" download className="inline-flex min-h-11 items-center text-[15px] font-semibold text-accent-text">
            En PDF
          </a>
        </div>
        <p className="text-[14px] text-muted">Chaque information se corrige ci-dessus. Pour le reste, la page Confidentialité dit tout.</p>
      </section>

      <section aria-label="Mon accès" className="flex flex-col gap-3">
        <Button variant="secondary" onClick={deconnecter}>
          Me déconnecter
        </Button>
        <SupprimerCompte />
      </section>
      <footer className="mt-4 flex flex-col gap-2 text-[14px] text-muted">
        <p>
          <Link href="/negoce/conditions" className="font-semibold text-accent-text underline">
            Les conditions de la {NOM}
          </Link>
          {compte.conditionsVersion ? ` · acceptées (version ${compte.conditionsVersion})` : ""}
        </p>
      </footer>
    </>
  );
}

/** Dépôts, paliers, départements, enseigne, téléphone : un formulaire, « Enregistrer ». */
function Reglages({ compte, onChange }: { compte: CompteNegoce; onChange: () => void }) {
  const [enseigne, setEnseigne] = useState(compte.enseigne);
  const [telephone, setTelephone] = useState(compte.telephone ?? "");
  const [depots, setDepots] = useState<string[]>(compte.depots.length ? compte.depots.map((d) => d.adresse) : [""]);
  const [paliers, setPaliers] = useState<PaliersSaisis>(depuisPaliers(compte.livraison));
  const [departements, setDepartements] = useState<string[]>(compte.departements);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);
  async function enregistrer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErreur(null);
    setFait(false);
    try {
      await api("/v1/negoce/compte", {
        method: "PUT",
        body: { enseigne: enseigne.trim(), telephone: telephone.trim() || null, depots: depots.filter((d) => d.trim()).map((adresse) => ({ adresse })), livraison: versPaliers(paliers), departements },
      });
      setFait(true);
      onChange();
    } catch (err) {
      setErreur(messageErreur(err, ERREURS, { vous: true }));
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={enregistrer} aria-label="Mes dépôts et ma livraison" className={`${CARTE} gap-5`} noValidate>
      <SectionTitle>Mes dépôts et ma livraison</SectionTitle>
      <Field id="compte-enseigne" label="Nom de l'enseigne" required maxLength={120} value={enseigne} onChange={(e) => setEnseigne(e.target.value)} />
      <Field id="compte-telephone" label="Téléphone" type="tel" inputMode="tel" maxLength={30} value={telephone} onChange={(e) => setTelephone(e.target.value)} />
      <DepotsForm valeur={depots} onChange={setDepots} />
      {compte.depots.some((d) => !d.geocode) ? <p className="text-[13px] font-semibold text-warn">Un dépôt n&apos;a pas pu être situé sur la carte : vérifiez son adresse (rue, code postal, ville).</p> : null}
      <PaliersForm valeur={paliers} onChange={setPaliers} />
      <DepartementsForm valeur={departements} onChange={setDepartements} />
      {erreur ? (
        <p role="alert" className="rounded-xl bg-danger-bg p-4 text-[14px] font-semibold text-danger">
          {erreur}
        </p>
      ) : null}
      {fait ? (
        <p role="status" className="rounded-xl bg-ok-bg p-4 text-[14px] font-semibold text-ok">
          C&apos;est enregistré. Vos prochaines grilles en tiennent compte.
        </p>
      ) : null}
      <Button type="submit" pending={pending} disabled={!enseigne.trim() || !depots.some((d) => d.trim())}>
        Enregistrer
      </Button>
    </form>
  );
}

/** Se désabonner d'un département, ou de tout : plus aucune grille ; le compte reste. */
function Abonnements({ compte, onChange }: { compte: CompteNegoce; onChange: () => void }) {
  const [pending, setPending] = useState<string | null>(null);
  const [erreur, setErreur] = useState<ApiError | null>(null);
  const desabonner = async (departement: string | null) => {
    setPending(departement ?? "tout");
    setErreur(null);
    try {
      await api("/v1/negoce/desabonner", { method: "POST", body: { departement } });
      onChange();
    } catch (e) {
      setErreur(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(null);
    }
  };
  if (compte.departements.length === 0) return null;
  return (
    <section aria-label="Mes abonnements" className={CARTE}>
      <SectionTitle>Mes abonnements</SectionTitle>
      <p className="text-[14px] text-muted">Vous recevez la grille de chaque département coché. Se désabonner est libre, à tout moment.</p>
      <ul className="flex flex-col divide-y divide-line">
        {compte.departements.map((d) => (
          <li key={d} className="flex items-center justify-between gap-3 py-2 text-[15px]">
            <span className="font-semibold">{`Département ${d}`}</span>
            <Button variant="secondary" className="min-h-10 px-4 text-[14px]" pending={pending === d} onClick={() => desabonner(d)}>
              {`Me désabonner du ${d}`}
            </Button>
          </li>
        ))}
      </ul>
      <Button variant="secondary" pending={pending === "tout"} onClick={() => desabonner(null)}>
        Me désabonner de tout
      </Button>
      {erreur ? <ErrorNotice error={erreur} /> : null}
    </section>
  );
}

function SupprimerCompte() {
  const router = useRouter();
  const [confirmer, setConfirmer] = useState(false);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<ApiError | null>(null);
  async function supprimer() {
    setPending(true);
    try {
      await api("/v1/negoce/compte", { method: "DELETE" });
      router.replace("/negoce/connexion");
    } catch (e) {
      setErreur(e instanceof ApiError ? e : new ApiError("internal_error", 500));
      setPending(false);
    }
  }
  if (!confirmer) {
    return (
      <button type="button" onClick={() => setConfirmer(true)} className="self-center text-[14px] font-semibold text-muted underline">
        Supprimer mon compte
      </button>
    );
  }
  return (
    <div role="group" aria-label="Supprimer mon compte" className="flex flex-col gap-3 rounded-xl bg-warn-bg p-4">
      <p className="text-[14px] font-semibold text-warn">Votre accès, vos dépôts et vos paliers seront effacés ; vous ne recevrez plus aucune grille. Les commandes déjà passées restent dans nos livres.</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="ink" pending={pending} onClick={supprimer}>
          Oui, supprimer mon compte
        </Button>
        <Button variant="secondary" onClick={() => setConfirmer(false)}>
          Annuler
        </Button>
      </div>
      {erreur ? <ErrorNotice error={erreur} /> : null}
    </div>
  );
}
