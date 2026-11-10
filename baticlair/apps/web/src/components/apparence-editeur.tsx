"use client";

import { Check, Expand, ImageUp, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { COULEURS_PDF, MODELES_PDF, MODELES_PDF_INFO, type CouleurPdf, type ModelePdf } from "../../../../packages/domain/src/documents/modele-pdf";
import { useRouter } from "next/navigation";
import { api, ApiError, getActiveCompanyId } from "@/lib/api";
import { openFile } from "@/lib/open-document";
import { useResource } from "@/lib/use-resource";
import { CarteApparence } from "./apparence";
import { EnTeteRubrique } from "./en-tete-rubrique";
import { Fenetre } from "./mes-listes";
import { PdfPages } from "./pdf-pages";
import { Button, Card } from "./ui";

/**
 * APPARENCE (Greg, 1er novembre 2026) : deux onglets, « Application » (Clair / Sombre, sur cet appareil) et « Demande de
 * prix » (le PDF que reçoivent les négoces).
 *
 * L'aperçu est LE VRAI document : `GET /v1/price-requests/settings/apercu.pdf` passe par le même générateur (`packetPdf`)
 * et les mêmes données que le PDF téléchargé et envoyé (la dernière demande, sinon un exemple marqué « Exemple »).
 * Le modèle et la couleur s'essaient dans l'aperçu sans rien changer, puis s'enregistrent d'un seul bouton
 * (« Enregistrer ») : un seul mécanisme, l'ancien enregistrement à chaque appui est remplacé. Le logo, un fichier,
 * s'enregistre dès qu'il est choisi (dit à l'écran). Un changement non enregistré est gardé en quittant l'onglet ou
 * l'écran plein écran, gardé sur l'appareil s'il faut revenir, et le retour demande confirmation.
 */

type Reglages = { attachQuoteDetail: boolean; modelePdf: ModelePdf; couleurPdf: CouleurPdf };
type Choix = { modele: ModelePdf; couleur: CouleurPdf };
type Onglet = "application" | "demande";

const CLE_BROUILLON = (companyId: string | null) => `mobiiz-apparence-brouillon:${companyId ?? ""}`;

function lireBrouillon(companyId: string | null): Choix | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(CLE_BROUILLON(companyId)) ?? "null") as Choix | null;
    return v && MODELES_PDF.includes(v.modele) && COULEURS_PDF.some((c) => c.id === v.couleur) ? v : null;
  } catch {
    return null;
  }
}
function ecrireBrouillon(companyId: string | null, v: Choix | null) {
  try {
    if (v) sessionStorage.setItem(CLE_BROUILLON(companyId), JSON.stringify(v));
    else sessionStorage.removeItem(CLE_BROUILLON(companyId));
  } catch {
    /* stockage indisponible : le brouillon reste à l'écran */
  }
}

export function EditeurApparence() {
  const companyId = getActiveCompanyId();
  const router = useRouter();
  const back = () => router.push("/compte");
  // Capture 20 (Greg, 10 novembre 2026) : l'affichage de l'application d'abord ; les documents et demandes dans l'onglet voisin.
  const [onglet, setOnglet] = useState<Onglet>("application");
  const charger = useCallback((signal: AbortSignal) => api<Reglages>("/v1/price-requests/settings", { signal }), []);
  const reglages = useResource(charger);
  const enregistre: Choix | null = reglages.data ? { modele: reglages.data.modelePdf, couleur: reglages.data.couleurPdf } : null;
  // Le brouillon gardé sur l'appareil (un retour sans enregistrer) ; il ne s'affiche qu'une fois les réglages chargés.
  const [brouillon, setBrouillon] = useState<Choix | null>(() => (typeof window === "undefined" ? null : lireBrouillon(companyId)));
  const [repris, setRepris] = useState(() => brouillon !== null);
  const [statut, setStatut] = useState<"" | "enregistre" | "erreur">("");
  const [pending, setPending] = useState(false);
  const [quitter, setQuitter] = useState(false);
  const [logoVersion, setLogoVersion] = useState(0);

  const choix = enregistre ? (brouillon ?? enregistre) : null;
  const modifie = !!(choix && enregistre && (choix.modele !== enregistre.modele || choix.couleur !== enregistre.couleur));

  // Fermer l'onglet ou recharger la page avec un changement : le navigateur demande confirmation.
  useEffect(() => {
    if (!modifie) return;
    const avant = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avant);
    return () => window.removeEventListener("beforeunload", avant);
  }, [modifie]);

  function changer(patch: Partial<Choix>) {
    if (!choix) return;
    const suivant = { ...choix, ...patch };
    setBrouillon(suivant);
    setStatut("");
    setRepris(false);
    const differe = !!enregistre && (suivant.modele !== enregistre.modele || suivant.couleur !== enregistre.couleur);
    ecrireBrouillon(companyId, differe ? suivant : null);
  }

  async function enregistrer(): Promise<boolean> {
    if (!choix || pending) return false;
    setPending(true);
    setStatut("");
    try {
      const r = await api<Reglages>("/v1/price-requests/settings", { method: "PATCH", body: { modelePdf: choix.modele, couleurPdf: choix.couleur } });
      reglages.setData(() => r);
      setBrouillon(null);
      ecrireBrouillon(companyId, null);
      setStatut("enregistre");
      setRepris(false);
      return true;
    } catch {
      setStatut("erreur");
      return false;
    } finally {
      setPending(false);
    }
  }

  function annulerChangements() {
    ecrireBrouillon(companyId, null);
    setBrouillon(null);
    setRepris(false);
  }

  const retour = () => (modifie ? setQuitter(true) : back());

  return (
    <div className="flex flex-col gap-4">
      <EnTeteRubrique titre="Apparence" onRetour={retour} />
      <div role="tablist" aria-label="Apparence" className="grid grid-cols-2 gap-1 rounded-full bg-ground p-1 lg:max-w-md">
        {(
          [
            ["application", "Application"],
            ["demande", "Demande de prix"],
          ] as const
        ).map(([id, libelle]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`onglet-${id}`}
            aria-selected={onglet === id}
            aria-controls={`panneau-${id}`}
            onClick={() => setOnglet(id)}
            className={`min-h-11 rounded-full px-3 text-[15px] font-semibold whitespace-nowrap transition-[background-color,color] duration-150 ${onglet === id ? "bg-ink text-white" : "text-muted"}`}
          >
            {libelle}
          </button>
        ))}
      </div>

      {onglet === "application" ? (
        <div role="tabpanel" id="panneau-application" aria-labelledby="onglet-application" className="flex flex-col gap-3 lg:max-w-md">
          <CarteApparence />
          <p className="px-1 text-[13px] text-muted">L&apos;apparence de l&apos;application ne change pas le PDF envoyé à tes négoces.</p>
        </div>
      ) : (
        <div role="tabpanel" id="panneau-demande" aria-labelledby="onglet-demande" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-[20px] leading-tight font-extrabold">Ta demande de prix</h2>
            <p className="text-[14px] text-muted">Personnalise l&apos;apparence du PDF que reçoivent tes négoces.</p>
          </div>
          {repris && modifie ? (
            <p role="status" className="rounded-xl bg-accent-soft px-3 py-2 text-[14px] font-semibold">
              Tes changements non enregistrés sont repris.{" "}
              <button type="button" onClick={annulerChangements} className="font-bold text-accent-text underline underline-offset-4">
                Revenir aux réglages enregistrés
              </button>
            </p>
          ) : null}
          {/* Téléphone : l'aperçu d'abord, puis les réglages. Ordinateur : les réglages à gauche, l'aperçu à droite, plus grand. */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
            <div className="lg:sticky lg:top-6 lg:order-2">
              <Apercu choix={choix} logoVersion={logoVersion} />
            </div>
            <div className="flex flex-col gap-4 lg:order-1">
              <ChoixModele choix={choix} onChange={(modele) => changer({ modele })} />
              <ChoixCouleur choix={choix} onChange={(couleur) => changer({ couleur })} />
              <Logo onChange={() => setLogoVersion((v) => v + 1)} />
              <p className="px-1 text-[13px] leading-snug text-muted">Les changements s&apos;appliquent aux prochaines demandes. Les documents déjà envoyés ne changent pas.</p>
              <div className="hidden lg:block lg:sticky lg:bottom-4">
                <BarreEnregistrer modifie={modifie} pending={pending} statut={statut} onEnregistrer={() => void enregistrer()} />
              </div>
            </div>
          </div>
          {/* Téléphone : collée en bas de l'écran tout le long du panneau, aperçu compris. */}
          <div className="sticky bottom-0 z-20 -mx-4 lg:hidden">
            <BarreEnregistrer modifie={modifie} pending={pending} statut={statut} onEnregistrer={() => void enregistrer()} />
          </div>
        </div>
      )}

      {quitter ? (
        <Fenetre titre="Quitter sans enregistrer ?" onFermer={() => setQuitter(false)}>
          <p className="text-[15px] leading-snug">Le modèle ou la couleur de ta demande de prix a changé, et ce n&apos;est pas encore enregistré.</p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() =>
                void enregistrer().then((ok) => {
                  if (ok) {
                    setQuitter(false);
                    back();
                  }
                })
              }
              pending={pending}
            >
              Enregistrer et quitter
            </Button>
            <button
              type="button"
              onClick={() => {
                annulerChangements();
                setQuitter(false);
                back();
              }}
              className="pressable min-h-12 rounded-full border border-line px-4 text-[15px] font-semibold"
            >
              Quitter sans enregistrer
            </button>
            <button type="button" onClick={() => setQuitter(false)} className="min-h-11 text-[15px] font-semibold text-muted">
              Rester
            </button>
          </div>
        </Fenetre>
      ) : null}
    </div>
  );
}

const urlApercu = (c: Choix) => `/v1/price-requests/settings/apercu.pdf?modele=${encodeURIComponent(c.modele)}&couleur=${encodeURIComponent(c.couleur)}`;

/** L'aperçu : le vrai PDF, rechargé à chaque choix (après un court délai si on enchaîne les appuis). */
function Apercu({ choix, logoVersion }: { choix: Choix | null; logoVersion: number }) {
  // Le dernier aperçu reçu, avec la clé des réglages qui l'ont produit : « Mise à jour… » tant qu'elle diffère.
  const [recu, setRecu] = useState<{ cle: string; fichier: Blob | null; exemple: boolean | null; erreur: boolean } | null>(null);
  const modele = choix?.modele;
  const couleur = choix?.couleur;
  const cle = `${modele}|${couleur}|${logoVersion}`;
  const fichier = recu?.fichier ?? null;
  const exemple = recu?.exemple ?? null;
  const erreur = recu?.cle === cle && recu.erreur;
  const chargement = recu?.cle !== cle;
  useEffect(() => {
    if (!modele || !couleur) return;
    let annule = false;
    const cleDemandee = `${modele}|${couleur}|${logoVersion}`;
    const minuteur = setTimeout(() => {
      const headers: Record<string, string> = {};
      const companyId = getActiveCompanyId();
      if (companyId) headers["x-company-id"] = companyId;
      fetch(`${urlApercu({ modele, couleur })}&v=${logoVersion}`, { headers, credentials: "same-origin" })
        .then(async (res) => {
          if (!res.ok) throw new Error(String(res.status));
          const est = res.headers.get("x-apercu-exemple") === "1";
          const blob = await res.blob();
          if (!annule) setRecu({ cle: cleDemandee, fichier: blob, exemple: est, erreur: false });
        })
        .catch(() => {
          if (!annule) setRecu((r) => ({ cle: cleDemandee, fichier: r?.fichier ?? null, exemple: r?.exemple ?? null, erreur: true }));
        });
    }, 200);
    return () => {
      annule = true;
      clearTimeout(minuteur);
    };
  }, [modele, couleur, logoVersion]);
  const surErreur = useCallback(() => setRecu((r) => (r ? { ...r, erreur: true } : r)), []);

  return (
    <section aria-label="Aperçu de ta demande de prix" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Aperçu</span>
        {exemple === true ? (
          <span className="rounded-full bg-accent-soft px-3 py-1 text-[12px] font-bold">Exemple : aucune demande envoyée</span>
        ) : exemple === false ? (
          <span className="rounded-full bg-ground px-3 py-1 text-[12px] font-semibold text-muted">Ta dernière demande</span>
        ) : null}
      </div>
      <div aria-busy={chargement} className="relative h-[min(64dvh,34rem)] overflow-hidden rounded-xl bg-[#3a3631] lg:h-[calc(100dvh-14rem)] lg:min-h-[32rem]">
        {erreur ? (
          <p className="p-6 text-[15px] text-white">L&apos;aperçu ne s&apos;affiche pas pour l&apos;instant. Tes réglages, eux, restent modifiables.</p>
        ) : fichier ? (
          <PdfPages file={fichier} title="Aperçu du PDF de la demande de prix" onError={surErreur} largeur />
        ) : null}
        {chargement && !erreur ? (
          <span role="status" className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1 text-[12px] font-semibold text-white">
            Mise à jour…
          </span>
        ) : null}
      </div>
      {exemple ? (
        <p className="text-[13px] text-muted">Tes coordonnées sont les vraies ; les lignes sont un exemple. Tes négoces recevront ta liste.</p>
      ) : null}
      <button
        type="button"
        disabled={!choix}
        onClick={() => choix && openFile({ url: urlApercu(choix), title: "Ta demande de prix", fileName: "demande-de-prix.pdf" })}
        className="pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 text-[15px] font-semibold"
      >
        <Expand size={18} aria-hidden="true" />
        Voir le PDF en plein écran
      </button>
    </section>
  );
}

function ChoixModele({ choix, onChange }: { choix: Choix | null; onChange: (m: ModelePdf) => void }) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <h3 className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Modèle</h3>
      <div role="radiogroup" aria-label="Modèle du PDF" className="grid grid-cols-3 gap-1.5">
        {MODELES_PDF.map((m) => {
          const actif = choix?.modele === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={actif}
              aria-label={`${MODELES_PDF_INFO[m].nom}${m === "classique" ? " (par défaut)" : ""}`}
              disabled={!choix}
              onClick={() => onChange(m)}
              className={`pressable flex min-h-12 items-center justify-center gap-1 rounded-xl border px-2 text-[14px] font-semibold ${actif ? "border-ink bg-ink text-white" : "border-line"}`}
            >
              {actif ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : null}
              {MODELES_PDF_INFO[m].nom}
            </button>
          );
        })}
      </div>
      <p className="min-h-[2.5em] text-[13px] leading-snug text-muted">
        {choix ? MODELES_PDF_INFO[choix.modele].texte : " "}
        {choix?.modele === "classique" ? " Par défaut." : ""}
      </p>
    </Card>
  );
}

function ChoixCouleur({ choix, onChange }: { choix: Choix | null; onChange: (c: CouleurPdf) => void }) {
  const nom = COULEURS_PDF.find((c) => c.id === choix?.couleur)?.nom;
  return (
    <Card className="flex flex-col gap-2 p-4">
      <h3 className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">
        Couleur principale{nom ? <span className="font-normal tracking-normal normal-case"> · {nom}</span> : null}
      </h3>
      <div role="radiogroup" aria-label="Couleur du PDF" className="flex flex-wrap gap-2.5">
        {COULEURS_PDF.map((c) => {
          const actif = choix?.couleur === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={actif}
              aria-label={c.nom}
              title={c.nom}
              disabled={!choix}
              onClick={() => onChange(c.id)}
              className={`pressable flex size-11 items-center justify-center rounded-full ring-offset-2 ring-offset-surface ${actif ? "ring-2 ring-ink" : "ring-1 ring-line"}`}
              style={{ backgroundColor: c.hex }}
            >
              {actif ? <Check size={18} strokeWidth={3} color={c.id === "mobiiz" ? "#130901" : "#ffffff"} aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/** Le logo du compte (les mêmes routes que l'ancienne carte) : Remplacer, Retirer (avec confirmation). */
function Logo({ onChange }: { onChange: () => void }) {
  const id = useId();
  const [hasLogo, setHasLogo] = useState<boolean | null>(null);
  const [version, setVersion] = useState(0);
  const [pending, setPending] = useState(false);
  const [retirer, setRetirer] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  useEffect(() => {
    void api<{ hasLogo: boolean }>("/v1/company/profile")
      .then((p) => setHasLogo(p.hasLogo))
      .catch(() => setHasLogo(false));
  }, []);

  async function envoyer(file: File | undefined) {
    if (!file) return;
    setPending(true);
    setMessage(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const p = await api<{ hasLogo: boolean }>("/v1/company/logo", { method: "PUT", body: form });
      setHasLogo(p.hasLogo);
      setVersion((v) => v + 1);
      setMessage({ ok: true, texte: "Logo enregistré." });
      onChange();
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof ApiError && e.phrase ? e.phrase : "Le logo n'est pas passé : PNG ou JPEG, 500 Ko au plus." });
    } finally {
      setPending(false);
    }
  }

  async function supprimer() {
    setPending(true);
    setMessage(null);
    try {
      const p = await api<{ hasLogo: boolean }>("/v1/company/logo", { method: "DELETE" });
      setHasLogo(p.hasLogo);
      setMessage({ ok: true, texte: "Logo retiré." });
      setRetirer(false);
      onChange();
    } catch {
      setMessage({ ok: false, texte: "Le logo n'a pas été retiré. Réessaie dans un instant." });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4" aria-busy={hasLogo === null || pending}>
      <h3 className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Logo</h3>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-line">
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/v1/company/logo?v=${version}`} alt="Logo de l'entreprise" className="max-h-14 max-w-26 object-contain" />
          ) : (
            <span className="px-2 text-center text-xs font-bold text-[#6b645c]">Pas de logo</span>
          )}
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <label
            htmlFor={id}
            className={`pressable inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-[14px] font-semibold ${hasLogo === null || pending ? "pointer-events-none opacity-50" : ""}`}
          >
            <ImageUp size={16} aria-hidden="true" />
            {hasLogo ? "Remplacer" : "Ajouter un logo"}
          </label>
          <input
            id={id}
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            disabled={hasLogo === null || pending}
            onChange={(e) => {
              void envoyer(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {hasLogo ? (
            <button type="button" disabled={pending} onClick={() => setRetirer(true)} className="pressable inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-danger">
              <Trash2 size={16} aria-hidden="true" />
              Retirer
            </button>
          ) : null}
        </div>
      </div>
      <p className="text-[13px] text-muted">PNG ou JPEG, 500 Ko au plus. Le logo s&apos;enregistre dès qu&apos;il est choisi.</p>
      {message ? (
        <p role={message.ok ? "status" : "alert"} className={`text-[14px] font-semibold ${message.ok ? "text-ok" : "text-danger"}`}>
          {message.texte}
        </p>
      ) : null}
      {retirer ? (
        <Fenetre titre="Retirer le logo ?" onFermer={() => !pending && setRetirer(false)}>
          <p className="text-[15px] leading-snug">Tes prochaines demandes de prix partiront sans logo. Les documents déjà envoyés ne changent pas.</p>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <button type="button" disabled={pending} onClick={() => setRetirer(false)} className="pressable min-h-12 rounded-xl border border-line px-3 text-[15px] font-semibold">
              Annuler
            </button>
            <button type="button" disabled={pending} aria-busy={pending} onClick={() => void supprimer()} className="pressable min-h-12 rounded-xl bg-danger px-3 text-[15px] font-bold text-white disabled:opacity-60">
              Retirer le logo
            </button>
          </div>
        </Fenetre>
      ) : null}
    </Card>
  );
}

/**
 * « Enregistrer » (la phrase de Greg est juste au-dessus, dans la page). Téléphone : collé en bas de l'écran (le menu du bas est masqué sur cet écran
 * d'édition), toujours visible ; ordinateur : sous les réglages, collé en bas de la colonne. Un seul des deux s'affiche.
 */
function BarreEnregistrer({ modifie, pending, statut, onEnregistrer }: { modifie: boolean; pending: boolean; statut: "" | "enregistre" | "erreur"; onEnregistrer: () => void }) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-line bg-ground/95 px-4 pt-2.5 pb-[max(env(safe-area-inset-bottom),10px)] shadow-float backdrop-blur lg:rounded-xl lg:border lg:p-2">
      <Button onClick={onEnregistrer} pending={pending} disabled={!modifie} className="min-h-12 w-full">
        {modifie ? "Enregistrer" : "Enregistré"}
      </Button>
      {statut === "enregistre" ? (
        <p role="status" className="text-center text-[14px] font-semibold text-ok">
          Réglages enregistrés.
        </p>
      ) : statut === "erreur" ? (
        <p role="alert" className="text-center text-[14px] font-semibold text-danger">
          Le réglage n&apos;est pas passé. Réessaie dans un instant.
        </p>
      ) : null}
    </div>
  );
}
