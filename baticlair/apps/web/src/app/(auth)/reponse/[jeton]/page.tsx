"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LiensLegaux } from "@/components/legal";
import { Button, ErrorNotice, PageTitle, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

/** Test complet (21 octobre) : l'espace fine de fr-FR (U+202F) ne se voit pas dans la police ; une espace insécable, si. */
const lisible = (texte: string) => texte.replace(/\u202f/g, "\u00a0");
const nombre = (q: string) => lisible(Number(q).toLocaleString("fr-FR", { maximumFractionDigits: 3 }));

/** Ce que l'API rend pour un lien de réponse (`GET /v1/reponse/:jeton`). */
interface PageReponse {
  lot: {
    numero: number;
    designation: string;
    famille: string;
    departement: string;
    volumeFerme: string;
    volumeProbable: string;
    fenetre: { tot: string; tard: string };
    chantiers: { adresse: string; quantite: string; unite: string; fenetre: { tot: string; tard: string }; engagement: "ferme" | "probable" }[];
    ouvert: boolean;
    reponseAttendueLe: string | null;
    /** Nouveau cap (22 octobre) : les zones de livraison (commune de chaque chantier), chacune avec son prix obligatoire. */
    zones?: string[];
  };
  negoce: { nom: string; email: string };
  commission: { phrase: string; phraseAccord: string; tauxPourcent: number; versionContrat: string; contrat: string[] };
  accord: { accepteLe: string } | null;
  reponse: { deposeLe: string; fichiers: string[]; message: string | null; statutExtraction: string } | null;
}

const jour = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/**
 * LA PAGE DE DÉPÔT DU NÉGOCE (parcours groupé, étape 5) : par son lien unique, sans compte. Le lot (volumes, chantiers,
 * fenêtre), la case d'accord de commission OBLIGATOIRE avec le contrat PDF à côté (décision du fondateur, 2026-10-20),
 * un ou deux devis PDF, une phrase libre. Le négoce est vouvoyé ; aucun nom d'artisan n'apparaît.
 */
export default function ReponseNegocePage() {
  const { jeton } = useParams<{ jeton: string }>();
  const [page, setPage] = useState<PageReponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [envoi, setEnvoi] = useState<ApiError | null>(null);
  const [accord, setAccord] = useState(false);
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [depose, setDepose] = useState(false);
  // Décision de Greg (22 octobre) : deux chiffres, « gratuite jusqu'à X km » et « Y € par livraison au-delà », plus l'adresse
  // d'où partent les livraisons ; l'app calcule la distance à chaque chantier.
  const [depart, setDepart] = useState("");
  const [francoKm, setFrancoKm] = useState("");
  const [prixAuDela, setPrixAuDela] = useState("");

  useEffect(() => {
    api<PageReponse>(`/v1/reponse/${encodeURIComponent(jeton)}`)
      .then(setPage)
      .catch((e) => setError(e instanceof ApiError ? e : new ApiError("internal_error", 500)));
  }, [jeton]);

  async function deposer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData();
    form.set("accord", accord ? "oui" : "non");
    if (message.trim()) form.set("message", message.trim());
    form.set("depart", depart.trim());
    form.set("francoKm", francoKm.trim());
    form.set("prixAuDela", prixAuDela.trim());
    for (const f of fichiers) form.append("file", f, f.name);
    setPending(true);
    setEnvoi(null);
    try {
      setPage(await api<PageReponse>(`/v1/reponse/${encodeURIComponent(jeton)}`, { method: "POST", body: form }));
      setDepose(true);
    } catch (e) {
      setEnvoi(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
    }
  }

  if (error) {
    return (
      <>
        <PageTitle>Demande de prix</PageTitle>
        <p role="status" className="rounded-3xl bg-warn-bg p-4 font-semibold text-warn">
          {error.status === 404 ? "Ce lien n'est plus valable." : "Cette page n'a pas pu se charger. Réessayez dans un instant."}
        </p>
      </>
    );
  }
  if (!page) return <Spinner label="Chargement de la demande…" />;
  const { lot } = page;
  const estNombre = (v: string) => /^\d+([.,]\d{1,2})?$/.test(v.replace(/[\s€]/g, ""));
  const livraisonOk = depart.trim().length >= 5 && estNombre(francoKm) && estNombre(prixAuDela);
  const pret = accord && fichiers.length >= 1 && fichiers.length <= 2 && livraisonOk;
  return (
    <>
      <PageTitle>Demande de prix, lot n° {lot.numero}</PageTitle>
      <p className="text-sm text-muted">
        Regroupement artisans, département {lot.departement}. Pour {page.negoce.nom}.
      </p>
      <section aria-label="Le lot" className="flex flex-col gap-2 rounded-[20px] border border-line bg-surface p-4">
        <h2 className="text-base font-extrabold">{lot.designation}</h2>
        <p className="text-sm">
          <span className="font-bold">Volume ferme : {lisible(lot.volumeFerme)}</span> · volume probable : {lisible(lot.volumeProbable)}
        </p>
        <p className="text-sm">
          Livraison entre le {jour(lot.fenetre.tot)} et le {jour(lot.fenetre.tard)}, par chantier.
        </p>
        <ul aria-label="Chantiers à livrer" className="mt-1 flex flex-col divide-y divide-line text-sm">
          {lot.chantiers.map((c, i) => (
            <li key={i} className="flex flex-col py-2">
              <span className="font-semibold">{c.adresse}</span>
              <span className="text-muted">
                {nombre(c.quantite)} {c.unite} · du {jour(c.fenetre.tot)} au {jour(c.fenetre.tard)} · {c.engagement === "ferme" ? "ferme" : "probable"}
              </span>
            </li>
          ))}
        </ul>
        {lot.reponseAttendueLe ? <p className="text-sm text-muted">Réponse attendue avant le {jour(lot.reponseAttendueLe)}.</p> : null}
      </section>

      {page.reponse ? (
        <p role="status" className="rounded-3xl bg-ok-bg p-4 font-semibold text-ok">
          {depose ? "Devis reçu, merci. " : `Devis reçu le ${jour(page.reponse.deposeLe)}. `}
          {page.reponse.fichiers.join(", ")}
          {page.reponse.statutExtraction === "lue" ? " · prix et délai lus." : " · nous le relisons."}
        </p>
      ) : null}

      {!lot.ouvert ? (
        <p role="status" className="rounded-3xl bg-warn-bg p-4 font-semibold text-warn">
          Ce lot n&apos;attend plus de réponse.
        </p>
      ) : (
        <form onSubmit={deposer} aria-label="Déposer mon devis" className="flex flex-col gap-4" noValidate>
          {envoi ? <ErrorNotice error={envoi} /> : null}
          {/* Revue à froid (21 octobre) : ce qu'on attend du devis, dit en une ligne ; un vrai bouton à la place du champ brut. */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="devis-pdf" className="text-sm font-bold">
              Votre devis en PDF (un, ou deux par palier de quantité)
            </label>
            <p className="text-sm text-muted">Comme d&apos;habitude : prix unitaire HT par référence, délai et conditions de livraison, validité.</p>
            <input id="devis-pdf" type="file" accept="application/pdf" multiple onChange={(e) => setFichiers(Array.from(e.currentTarget.files ?? []).slice(0, 2))} className="sr-only" />
            <label htmlFor="devis-pdf" className="inline-flex min-h-12 cursor-pointer items-center justify-center self-start rounded-2xl border border-line bg-surface px-4 text-sm font-bold">
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
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Un mot pour nous (facultatif)
            <textarea value={message} onChange={(e) => setMessage(e.currentTarget.value)} maxLength={2000} rows={3} className="rounded-2xl border border-line bg-surface px-3 py-2 text-sm font-normal" />
          </label>
          <div className="flex flex-col gap-2 rounded-[20px] border border-line bg-surface p-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" checked={accord} onChange={(e) => setAccord(e.currentTarget.checked)} aria-label="J'accepte la commission" className="mt-0.5 size-5 shrink-0 accent-accent" />
              <strong>{page.commission.phraseAccord}</strong>
            </label>
            <a href={`/v1/reponse/${encodeURIComponent(jeton)}/contrat.pdf`} target="_blank" rel="noreferrer" className="min-h-11 self-start py-2 text-sm font-bold text-accent-text underline decoration-dotted underline-offset-4">
              Lire le contrat (PDF, version {page.commission.versionContrat})
            </a>
          </div>
          <Button type="submit" pending={pending} disabled={!pret}>
            {page.reponse ? "Déposer un nouveau devis" : "Déposer mon devis"}
          </Button>
          {!accord ? <p className="text-center text-xs text-muted">Sans la case cochée, le devis n&apos;est pas pris en compte.</p> : null}
          {accord && !livraisonOk ? <p className="text-center text-xs text-muted">Indiquez votre adresse de départ, la distance gratuite et le prix au-delà.</p> : null}
        </form>
      )}
      <footer className="mt-4 flex flex-col gap-2 text-sm text-muted">
        <p>BatiClair est édité par BATI INVEST SARL. Une question : répondez simplement à l&apos;e-mail reçu.</p>
        <LiensLegaux />
      </footer>
    </>
  );
}
