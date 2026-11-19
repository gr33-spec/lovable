"use client";

import { PHRASE_POURQUOI_SIRET } from "../../../../packages/domain/src/inscription/essai";

import { BadgeCheck, ChevronRight, Info, MapPin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui";
import { api, messageErreur } from "@/lib/api";
import { dateCourte, dateLongue, zoneLisible, type AchatV1, type EtatV1 } from "@/lib/ag-v1";

/** Les éléments partagés des écrans d'achats groupés V1 (V5.2) : carte d'achat, volumes, vérification de l'entreprise. */

export const CARTE = "rounded-[20px] bg-surface shadow-card";

/** Un statut, en texte complet, dans une pastille compacte (jamais la couleur seule). */
export function PastilleStatut({ code, libelle }: { code: string; libelle: string }) {
  const ton =
    code === "offre_a_examiner" || code === "preparation" || code === "besoin_indicatif"
      ? "bg-accent text-on-accent"
      : code === "besoin_retire" || code === "achat_annule"
        ? "bg-ground text-muted"
        : code === "renegociation" || code === "offre_verification"
          ? "bg-warn-bg text-warn"
          : "bg-ok-bg text-ok";
  return <span className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[13px] font-bold ${ton}`}>{libelle}</span>;
}

/**
 * Les volumes d'un achat : d'abord le confirmé, puis l'indicatif. Greg, 15 novembre 2026 : visibles dès la première
 * entreprise, avec le badge « Entreprises vérifiées » et la date de la dernière évolution ; jamais un nom.
 */
/** « 2 entreprises · en cours de regroupement » ou « 5 entreprises · 12 480 pièces » : le total seulement, jamais une quantité individuelle. */
export function ligneRegroupement(resume: NonNullable<AchatV1["resume"]>): string {
  return `${resume.entreprises} entreprise${resume.entreprises > 1 ? "s" : ""} · ${resume.volume ?? "en cours de regroupement"}`;
}

/** Qui participe : les noms (ordre alphabétique), puis le nombre d'entreprises qui restent anonymes. Jamais une quantité. */
export function Participants({ resume }: { resume: NonNullable<AchatV1["resume"]> }) {
  const noms = resume.noms ?? [];
  const anonymes = resume.anonymes ?? 0;
  if (noms.length === 0 && anonymes === 0) return null;
  const anonymesDits = anonymes > 0 ? `${anonymes} entreprise${anonymes > 1 ? "s" : ""} anonyme${anonymes > 1 ? "s" : ""}` : null;
  return (
    <p className="text-[14px] leading-relaxed break-words">
      <span className="font-semibold">Avec : </span>
      {[...noms, anonymesDits].filter(Boolean).join(", ")}
    </p>
  );
}

/** La case « Rester anonyme » (Greg, 16 novembre 2026) : une vraie action, expliquée en une phrase. */
export function CaseAnonyme({ coche, onChange, disabled }: { coche: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3">
      <input type="checkbox" checked={coche} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-1 size-5 shrink-0 accent-accent" />
      <span className="text-[15px] leading-relaxed">
        <span className="font-semibold">Rester anonyme</span>
        <span className="block text-[14px] text-muted">Les autres entreprises voient le nom des participants, jamais la quantité de chacun. Coche pour que ton nom n&apos;apparaisse pas.</span>
      </span>
    </label>
  );
}

export function Volumes({ achat, comprendre = false }: { achat: AchatV1; comprendre?: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[16px] font-bold">{achat.volumes.principale}</p>
      {achat.volumes.sous ? <p className="text-[15px] text-muted">{achat.volumes.sous}</p> : null}
      {achat.volumes.indicatif ? <p className="text-[14px] text-muted">{achat.volumes.indicatif}</p> : null}
      {achat.resume ? <Participants resume={achat.resume} /> : null}
      {achat.resume ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-muted">
          {achat.resume.verifiees ? (
            <span className="inline-flex items-center gap-1 font-semibold text-ink">
              <BadgeCheck size={16} aria-hidden="true" /> Entreprises vérifiées
            </span>
          ) : null}
          {achat.resume.derniereEvolution ? <span>Dernière évolution le {dateCourte(achat.resume.derniereEvolution)}</span> : null}
        </p>
      ) : null}
      {achat.urgent ? <p className="text-[14px] font-semibold text-warn">{achat.urgent}</p> : null}
      {comprendre ? (
        <>
          <button type="button" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert} className="min-h-11 self-start text-[15px] font-semibold underline underline-offset-4">
            Comprendre les volumes
          </button>
          {ouvert ? (
            <div className="flex flex-col gap-2 rounded-xl bg-ground p-3 text-[14px] leading-relaxed">
              <p>
                <strong>Indicatif</strong> : des entreprises ont dit leur besoin sans le confirmer, ou ne l&apos;ont pas reconfirmé. Jamais présenté aux négoces.
              </p>
              <p>
                <strong>Besoins confirmés</strong> : chaque entreprise les reconfirme avant la consultation. Seul ce volume reconfirmé est transmis aux négoces.
              </p>
              <p>Tu vois le volume total et le nombre d&apos;entreprises, la tienne comprise. Jamais le nom ni l&apos;adresse d&apos;une autre entreprise : seul Mobiiz les connaît.</p>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Une carte d'achat ouvert, entièrement cliquable. */
export function CarteAchat({ achat, href }: { achat: AchatV1; href: string }) {
  return (
    <Link href={href} className={`${CARTE} pressable flex items-center gap-3 p-4`}>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[17px] leading-snug font-bold break-words">{achat.nom}</span>
        <span className="text-[15px] font-semibold">{achat.volumes.principale}</span>
        <span className="text-[14px] text-muted">
          {achat.volumes.sous ? `${achat.volumes.sous} · ` : ""}ouvert jusqu&apos;au {dateCourte(achat.ouvertJusquau)} · {achat.reception === "retrait" ? "retrait au dépôt" : "livraison sur chantier"}
        </span>
      </span>
      <ChevronRight size={22} aria-hidden="true" className="shrink-0" />
    </Link>
  );
}

/** La zone de regroupement : le département de l'entreprise, non modifiable en V1. */
export function LigneZone({ zone }: { zone: { code: string; nom: string } | null }) {
  return (
    <p className="flex items-center gap-2 text-[15px]">
      <MapPin size={18} aria-hidden="true" className="shrink-0" />
      {zone ? (
        <span>
          Zone de regroupement <strong>{zoneLisible(zone)}</strong>, ton département
        </span>
      ) : (
        <span>
          Indique l&apos;adresse de ton entreprise avec son code postal dans{" "}
          <Link href="/compte/entreprise" className="font-semibold underline underline-offset-4">
            Profil
          </Link>{" "}
          : la zone de regroupement est ton département.
        </span>
      )}
    </p>
  );
}

/**
 * « Ton entreprise » : INSEE et date, e-mail vérifié (lien de 24 heures, une fois), « Je déclare être ». Affiché seulement
 * la première fois ou après un changement important, juste avant la confirmation.
 */
export function VerificationEntreprise({ etat, onChange, sansTitre = false }: { etat: EtatV1; onChange: (e: EtatV1) => void; sansTitre?: boolean }) {
  const v = etat.verification;
  const [role, setRole] = useState<string | null>(v.habilitation);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [lien, setLien] = useState(false);
  async function declarer() {
    if (!role) return;
    setPending(true);
    setErreur(null);
    try {
      const verification = await api<EtatV1["verification"]>("/v1/ag/habilitation", { method: "POST", body: { role } });
      onChange({ ...etat, verification });
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setPending(false);
    }
  }
  async function envoyerLien() {
    if (!v.email) return;
    try {
      await api("/v1/auth/send-verification-email", { method: "POST", body: { email: v.email, callbackURL: window.location.href } });
      setLien(true);
    } catch (e) {
      setErreur(messageErreur(e));
    }
  }
  return (
    <section aria-label="Ton entreprise" className={`${CARTE} flex flex-col gap-4 p-4`}>
      {sansTitre ? null : <h2 className="text-[20px] font-extrabold">Ton entreprise</h2>}
      <p className="flex items-start gap-2 text-[15px]">
        <BadgeCheck size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
        {v.siretVerifie ? (
          <span>
            <strong>{v.entreprise}</strong> · SIRET {v.siret} vérifié auprès de l&apos;INSEE{v.siretVerifieLe ? ` le ${dateLongue(v.siretVerifieLe)}` : ""}.
          </span>
        ) : (
          <span>
            {PHRASE_POURQUOI_SIRET} Ton SIRET n&apos;est pas encore vérifié.{" "}
            <Link href="/compte/entreprise" className="font-semibold underline underline-offset-4">
              Vérifier mon SIRET
            </Link>
          </span>
        )}
      </p>
      <p className="flex items-start gap-2 text-[15px]">
        <BadgeCheck size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
        {v.emailVerifie ? (
          <span>E-mail vérifié : {v.email}</span>
        ) : lien ? (
          <span>Lien envoyé à {v.email}, valable 24 heures. Ouvre-le, puis reviens ici.</span>
        ) : (
          <span>
            Ton e-mail {v.email} n&apos;est pas encore vérifié.{" "}
            <button type="button" onClick={() => void envoyerLien()} className="min-h-11 font-semibold underline underline-offset-4">
              Recevoir le lien
            </button>
          </span>
        )}
      </p>
      {!v.habilitation ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[16px] font-bold">Je déclare être :</legend>
          {etat.habilitations.map((h) => (
            <label key={h.id} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 ${role === h.id ? "border-ink" : "border-line"}`}>
              <input type="radio" name="habilitation" value={h.id} checked={role === h.id} onChange={() => setRole(h.id)} className="size-5 accent-accent" />
              <span className="text-[16px]">{h.libelle}</span>
            </label>
          ))}
          <Button variant="secondary" pending={pending} disabled={!role} onClick={() => void declarer()} className="self-start">
            Enregistrer
          </Button>
        </fieldset>
      ) : (
        <p className="flex items-start gap-2 text-[15px]">
          <BadgeCheck size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>Tu as déclaré être : {etat.habilitations.find((h) => h.id === v.habilitation)?.libelle}.</span>
        </p>
      )}
      {erreur ? (
        <p role="alert" className="text-[15px] font-semibold text-danger">
          {erreur}
        </p>
      ) : null}
    </section>
  );
}

/** Une note discrète (icône + texte). */
export function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-[14px] leading-relaxed text-muted">
      <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
