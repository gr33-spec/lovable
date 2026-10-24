"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DepartementsForm, DepotsForm, PaliersForm, depuisPaliers, versPaliers, type PaliersSaisis } from "@/components/negoce/paliers-form";
import { Button, Field, PageTitle, Skeleton } from "@/components/ui";
import { api, ApiError, messageErreur } from "@/lib/api";
import { NOM } from "@/lib/nom";
import type { Invitation } from "@/lib/negoce";

/**
 * L'INSCRIPTION DU NÉGOCE EN UNE PAGE (Greg, 23 octobre 2026, point 2) : depuis son lien d'invitation (un artisan l'a
 * ajouté, sans le nommer). E-mail, SIRET, enseigne, téléphone ; dépôts ; paliers de livraison ; départements ; la case
 * des conditions. Après validation : « Vous recevrez la prochaine grille de votre secteur à la clôture du … », rien d'autre.
 * Vouvoiement. Une fois le compte créé, le lien renvoie vers la connexion.
 */
const ERREURS: Record<string, string> = {
  conditions_requises: "Cochez les conditions pour créer votre accès.",
  paliers_invalides: "Vos paliers ne vont pas : des distances croissantes, deux paliers payants au plus, des nombres positifs.",
  depot_requis: "Indiquez l'adresse d'au moins un dépôt.",
  departement_requis: "Indiquez au moins un département desservi.",
  siret_invalide: "Ce SIRET n'est pas valide (14 chiffres, entreprise active).",
  enseigne_requise: "Indiquez le nom de votre enseigne.",
  compte_existant: "Un accès existe déjà avec cet e-mail ou ce SIRET : connectez-vous.",
  deja_inscrit: "Votre accès existe déjà : connectez-vous.",
};

export default function RejoindrePage() {
  const { jeton } = useParams<{ jeton: string }>();
  const router = useRouter();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [erreurLien, setErreurLien] = useState<ApiError | null>(null);
  const [email, setEmail] = useState("");
  const [siret, setSiret] = useState("");
  const [enseigne, setEnseigne] = useState("");
  const [telephone, setTelephone] = useState("");
  const [depots, setDepots] = useState<string[]>([""]);
  const [paliers, setPaliers] = useState<PaliersSaisis>({ gratuiteJusquaKm: "30", paliers: [{ jusquaKm: "60", prixHt: "80" }], maxKm: "100" });
  // Les départements : ceux des dépôts (code postal) plus ceux de l'invitation, tant que le négoce n'y a pas touché.
  const [departementsChoisis, setDepartementsChoisis] = useState<string[] | null>(null);
  const [conditions, setConditions] = useState(false);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  useEffect(() => {
    api<Invitation>(`/v1/negoce/invitation/${encodeURIComponent(jeton)}`)
      .then((i) => {
        setInvitation(i);
        setEmail(i.email);
        setSiret(i.siret ?? "");
        setEnseigne(i.enseigne);
        setPaliers(depuisPaliers(i.paliersDefaut));
        if (i.inscrit) router.replace("/negoce/connexion");
      })
      .catch((e) => setErreurLien(e instanceof ApiError ? e : new ApiError("internal_error", 500)));
  }, [jeton, router]);

  const desDepots = depots.map((d) => /\b(\d{5})\b/.exec(d)?.[1]).filter((cp): cp is string => !!cp).map((cp) => (cp.startsWith("20") ? (Number(cp) < 20200 ? "2A" : "2B") : cp.startsWith("97") || cp.startsWith("98") ? cp.slice(0, 3) : cp.slice(0, 2)));
  const departements = departementsChoisis ?? [...new Set([...(invitation?.departements ?? []), ...desDepots])].sort();

  async function creer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErreur(null);
    try {
      const r = await api<{ phrase: string; departements: string[] }>("/v1/negoce/inscription", {
        method: "POST",
        body: { jeton, email: email.trim(), siret: siret.replace(/\s+/g, "") || null, enseigne: enseigne.trim(), telephone: telephone.trim() || null, depots: depots.filter((d) => d.trim()).map((adresse) => ({ adresse })), livraison: versPaliers(paliers), departements, conditions },
      });
      setFait(r.phrase);
    } catch (err) {
      setErreur(messageErreur(err, ERREURS, { vous: true }));
    } finally {
      setPending(false);
    }
  }

  if (erreurLien) {
    return (
      <>
        <PageTitle>{NOM}</PageTitle>
        <p role="status" className="rounded-xl bg-warn-bg p-4 font-semibold text-warn">
          {erreurLien.status === 404 || erreurLien.status === 400 ? "Ce lien n'est plus valable. Demandez à un artisan de vous ajouter à nouveau, ou connectez-vous si votre accès existe déjà." : messageErreur(erreurLien, {}, { vous: true })}
        </p>
        <Link href="/negoce/connexion" className="font-semibold text-accent-text underline">
          Me connecter
        </Link>
      </>
    );
  }
  if (!invitation) return <Skeleton card="h-40" lines={3} label="Chargement de votre invitation…" />;
  if (fait) {
    return (
      <>
        <PageTitle>Votre accès est créé</PageTitle>
        <p role="status" className="rounded-xl bg-ok-bg p-4 text-[16px] font-semibold text-ok">
          {fait}
        </p>
        <Link href="/negoce" className="font-semibold text-accent-text underline">
          Voir mon espace
        </Link>
      </>
    );
  }
  return (
    <>
      <PageTitle>Créez votre accès</PageTitle>
      <p className="text-[16px] leading-relaxed text-muted">
        Un artisan de votre secteur vous a ajouté à la {NOM}. Une minute suffit : vos coordonnées, vos dépôts, vos conditions de livraison. Vous recevrez ensuite chaque grille de votre secteur à sa clôture.
      </p>
      <form onSubmit={creer} aria-label="Créer mon accès" className="flex flex-col gap-5" noValidate>
        <Field id="negoce-email" label="E-mail" type="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field id="negoce-siret" label="SIRET" inputMode="numeric" maxLength={17} value={siret} hint="Prérempli quand il est connu ; vérifié dans la base Sirene." onChange={(e) => setSiret(e.target.value)} />
        <Field id="negoce-enseigne" label="Nom de l'enseigne" required maxLength={120} value={enseigne} onChange={(e) => setEnseigne(e.target.value)} />
        <Field id="negoce-telephone" label="Téléphone" type="tel" inputMode="tel" maxLength={30} value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        <DepotsForm valeur={depots} onChange={setDepots} />
        <PaliersForm valeur={paliers} onChange={setPaliers} />
        <DepartementsForm
          valeur={departements}
          onChange={setDepartementsChoisis}
        />
        <label className="flex items-start gap-3 text-[15px] font-semibold">
          <input type="checkbox" required checked={conditions} onChange={(e) => setConditions(e.currentTarget.checked)} className="mt-1 size-5 shrink-0 accent-accent" />
          <span>
            J&apos;accepte les{" "}
            <Link href="/negoce/conditions" target="_blank" className="text-accent-text underline">
              conditions de la {NOM}
            </Link>
            .
          </span>
        </label>
        {erreur ? (
          <p role="alert" className="rounded-xl bg-danger-bg p-4 text-[14px] font-semibold text-danger">
            {erreur}
          </p>
        ) : null}
        <Button type="submit" pending={pending} disabled={!conditions || !email.trim() || !enseigne.trim() || !depots.some((d) => d.trim())}>
          Créer mon accès
        </Button>
      </form>
      <footer className="mt-4 flex flex-col gap-2 text-[14px] text-muted">
        <p>Aucun frais pour vous. Déjà un accès ? <Link href="/negoce/connexion" className="font-semibold text-accent-text underline">Me connecter</Link></p>
      </footer>
    </>
  );
}
