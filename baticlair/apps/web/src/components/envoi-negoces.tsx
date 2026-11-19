"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, ErrorNotice, Field } from "@/components/ui";
import { api, ApiError, messageErreur } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/**
 * L'ENVOI À SES NÉGOCES EN TROIS TEMPS (Greg, lot final, points 1 et 4) : la première fois seulement, « Avant d'envoyer »
 * (SIRET, prénom, portable) ; puis « À qui j'envoie ? » ; puis « Voici ce que ton négoce va recevoir », l'aperçu fidèle
 * (objet compris) avec « Modifier le message ». Un seul bouton principal par écran, en bas de la feuille.
 */
export interface Identite {
  phrase: string;
  entreprise: string;
  adresse: string | null;
  siret: string | null;
  prenom: string | null;
  telephone: string | null;
  complete: boolean;
  /** SIRET vérifié (entreprise du bâtiment) : l'achat groupé le demande. */
  siretVerifie?: boolean;
  /** Pourquoi un SIRET enregistré n'est pas retenu pour l'achat groupé. */
  siretMessage?: string | null;
  /** Nouvel onboarding : l'entreprise reste à confirmer avant tout envoi à un négoce. */
  aConfirmer?: boolean;
  /** Le département choisi (carte) et celui de l'adresse de l'entreprise. */
  departement?: { code: string; nom: string } | null;
  departementEntreprise?: { code: string; nom: string } | null;
}

export function useIdentite() {
  const charger = useCallback((signal: AbortSignal) => api<Identite>("/v1/company/identite", { signal }), []);
  return useResource(charger);
}

export const FORMULAIRE_IDENTITE = "identite-avant-envoi";

/**
 * « Avant d'envoyer » : SIRET, prénom, portable ; le SIRET remplit le nom et l'adresse de l'entreprise.
 *
 * LA VALIDATION DU SIRET (nouvel onboarding, Greg, 19 novembre 2026) : à quatorze chiffres, l'entreprise trouvée s'affiche
 * (nom, adresse, activité) avec « C'est bien mon entreprise » (qui enregistre) et « Ce n'est pas la mienne » (qui vide le
 * numéro). Rien ne part chez un négoce avant. Puis, si le département de l'entreprise n'est pas celui choisi sur la carte,
 * l'artisan dit lequel garder (il sert aux achats groupés). Pour un compte d'avant sans fiche trouvée, rien ne change.
 */
export function EtapeIdentite({ identite, onFait, onPending }: { identite: Identite; onFait: (i: Identite) => void; onPending: (p: boolean) => void }) {
  const [siret, setSiret] = useState(identite.siret ?? "");
  const [prenom, setPrenom] = useState(identite.prenom ?? "");
  const [telephone, setTelephone] = useState(identite.telephone ?? "");
  const [trouve, setTrouve] = useState<{ siret: string; trouvee: boolean; entreprise: string | null; adresse: string | null; activite: string | null } | null>(
    null,
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [enregistree, setEnregistree] = useState<Identite | null>(null);
  const [garder, setGarder] = useState<string | null>(null);
  const chiffres = siret.replace(/\s/g, "");

  // Quatorze chiffres : l'annuaire des entreprises dit le nom, l'adresse et l'activité, et préremplit le prénom du dirigeant.
  const annuaire = trouve && trouve.siret === chiffres ? trouve : null;
  useEffect(() => {
    if (!/^\d{14}$/.test(chiffres)) return;
    const c = new AbortController();
    api<{ trouvee: boolean; entreprise: string | null; adresse: string | null; prenomDirigeant: string | null; activite?: string | null }>(
      `/v1/company/identite/annuaire?siret=${chiffres}`,
      { signal: c.signal },
    ).then(
      (r) => {
        setTrouve({ siret: chiffres, trouvee: r.trouvee, entreprise: r.entreprise, adresse: r.adresse, activite: r.activite ?? null });
        if (r.prenomDirigeant) setPrenom((p) => p || r.prenomDirigeant!);
      },
      () => setTrouve(null),
    );
    return () => c.abort();
  }, [chiffres]);

  // La fiche se confirme d'un bouton quand l'annuaire nomme l'entreprise, ou toujours pour le nouveau parcours.
  const aConfirmer = !!identite.aConfirmer || !!annuaire?.entreprise;
  const montrerFiche = /^\d{14}$/.test(chiffres) && aConfirmer && (annuaire || identite.aConfirmer);

  async function enregistrer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    const parLeBouton = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("data-confirmer") === "oui";
    // Le choix du département, après l'enregistrement : celui gardé est envoyé, puis on continue.
    if (enregistree) {
      const dep = garder ?? enregistree.departement?.code ?? null;
      onPending(true);
      try {
        if (dep && dep !== enregistree.departement?.code) await api("/v1/company/departement", { method: "PATCH", body: { departement: dep } });
        onFait({ ...enregistree, departement: dep === enregistree.departementEntreprise?.code ? enregistree.departementEntreprise : enregistree.departement });
      } catch (x) {
        setErreur(messageErreur(x));
      } finally {
        onPending(false);
      }
      return;
    }
    if (montrerFiche && !parLeBouton) {
      setErreur("Dis-nous si c'est bien ton entreprise : « C'est bien mon entreprise » ou « Ce n'est pas la mienne ».");
      return;
    }
    onPending(true);
    try {
      const i = await api<Identite>("/v1/company/identite", { method: "PUT", body: { siret: chiffres, prenom: prenom.trim(), telephone: telephone.trim() } });
      const choisi = i.departement?.code;
      const entreprise = i.departementEntreprise?.code;
      if (choisi && entreprise && choisi !== entreprise) {
        setEnregistree(i);
        setGarder(choisi);
      } else onFait(i);
    } catch (x) {
      setErreur(
        messageErreur(x, {
          portable_invalide: "Il me faut ton portable (06 ou 07), pour que ton négoce puisse t'appeler.",
          siret_invalide: "Ce SIRET ne va pas : 14 chiffres.",
          prenom_requis: "Il me faut ton prénom.",
        }),
      );
    } finally {
      onPending(false);
    }
  }

  function pasLaMienne() {
    setSiret("");
    setTrouve(null);
    setErreur(null);
    requestAnimationFrame(() => document.getElementById("identite-siret")?.focus());
  }

  if (enregistree?.departement && enregistree.departementEntreprise) {
    const options = [enregistree.departement, enregistree.departementEntreprise];
    return (
      <form id={FORMULAIRE_IDENTITE} onSubmit={(e) => void enregistrer(e)} className="flex flex-col gap-4" noValidate>
        <p className="text-[16px] font-semibold">
          Ton entreprise est enregistrée en {enregistree.departementEntreprise.nom} ({enregistree.departementEntreprise.code}), tu avais choisi{" "}
          {enregistree.departement.nom} ({enregistree.departement.code}). Lequel on garde pour tes achats groupés ?
        </p>
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Le département gardé</legend>
          {options.map((d, k) => (
            <label key={d.code} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 ${garder === d.code ? "border-ink" : "border-line"}`}>
              <input
                type="radio"
                name="departement-garde"
                value={d.code}
                checked={garder === d.code}
                onChange={() => setGarder(d.code)}
                className="size-5 accent-accent"
              />
              <span className="text-[16px]">
                {d.nom} ({d.code}) <span className="text-muted">· {k === 0 ? "choisi sur la carte" : "celui de mon entreprise"}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {erreur ? (
          <p role="alert" className="text-[14px] font-semibold text-danger">
            {erreur}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <form id={FORMULAIRE_IDENTITE} onSubmit={(e) => void enregistrer(e)} className="flex flex-col gap-4" noValidate>
      <p className="text-[16px] font-semibold">{identite.phrase}</p>
      <Field
        id="identite-siret"
        label="SIRET de ton entreprise"
        inputMode="numeric"
        autoComplete="off"
        placeholder="14 chiffres"
        value={siret}
        onChange={(e) => setSiret(e.target.value)}
      />
      {montrerFiche ? (
        <Card className="flex flex-col gap-1 p-4 text-[15px]" aria-label="L'entreprise trouvée">
          {annuaire?.entreprise ? (
            <>
              <span className="text-[13px] font-semibold text-muted">L&apos;entreprise trouvée</span>
              <span className="text-[17px] font-extrabold">{annuaire.entreprise}</span>
              {annuaire.adresse ? <span>{annuaire.adresse}</span> : null}
              {annuaire.activite ? <span className="text-muted">Activité : {annuaire.activite}</span> : null}
            </>
          ) : annuaire && !annuaire.trouvee ? (
            <span>On ne trouve pas ce SIRET dans l&apos;annuaire des entreprises. Vérifie le numéro.</span>
          ) : (
            <span>L&apos;annuaire des entreprises ne dit pas encore le nom de ce SIRET.{annuaire?.activite ? ` Activité : ${annuaire.activite}.` : ""}</span>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="submit"
              data-confirmer="oui"
              className="pressable inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-5 text-[15px] font-extrabold text-on-accent"
            >
              {annuaire?.entreprise ? "C'est bien mon entreprise" : "C'est bien mon numéro"}
            </button>
            <button
              type="button"
              onClick={pasLaMienne}
              className="pressable inline-flex min-h-12 items-center justify-center rounded-full border border-line px-5 text-[15px] font-semibold"
            >
              Ce n&apos;est pas la mienne
            </button>
          </div>
        </Card>
      ) : null}
      <Field id="identite-prenom" label="Ton prénom" autoComplete="given-name" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
      <Field
        id="identite-portable"
        label="Ton portable"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="06 12 34 56 78"
        value={telephone}
        onChange={(e) => setTelephone(e.target.value)}
        hint="Ton négoce peut t'appeler s'il a un doute. Ton e-mail, lui, n'est jamais donné."
      />
      {erreur ? (
        <p role="alert" className="text-[14px] font-semibold text-danger">
          {erreur}
        </p>
      ) : null}
      <p className="text-[13px] text-muted">Demandé une seule fois. Tu le changes quand tu veux dans Profil.</p>
    </form>
  );
}

interface Apercu {
  subject: string;
  mail: string;
  texteLibre: string;
  tutoie: boolean;
}

/** « Voici ce que ton négoce va recevoir » : l'objet et le mail mot pour mot ; seul le texte libre se modifie. */
export function EtapeApercu({
  projectId,
  supplierId,
  message,
  onMessage,
  tutoie,
  onTutoie,
}: {
  projectId: string;
  supplierId: string | null;
  message: string | null;
  onMessage: (m: string | null) => void;
  tutoie: boolean | null;
  onTutoie: (t: boolean) => void;
}) {
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [erreur, setErreur] = useState<ApiError | null>(null);
  const [modifier, setModifier] = useState(false);
  const [brouillon, setBrouillon] = useState("");

  useEffect(() => {
    const c = new AbortController();
    api<Apercu>(`/v1/projects/${encodeURIComponent(projectId)}/price-requests/preview`, {
      method: "POST",
      body: { supplierId, message, ...(tutoie === null ? {} : { tutoie }) },
      signal: c.signal,
    }).then(
      (a) => {
        setApercu(a);
        setErreur(null);
      },
      (e: unknown) => {
        if (!c.signal.aborted) setErreur(e instanceof ApiError ? e : new ApiError("internal_error", 500));
      },
    );
    return () => c.abort();
  }, [projectId, supplierId, message, tutoie]);

  if (erreur) return <ErrorNotice error={erreur} />;
  if (!apercu) return <p className="text-[15px] text-muted">Je prépare l&apos;aperçu…</p>;
  return (
    <div className="flex flex-col gap-3">
      <Card aria-label="Le mail à ton négoce" className="flex flex-col gap-3 p-4">
        <p className="text-[14px]">
          <span className="font-extrabold">Objet : </span>
          {apercu.subject}
        </p>
        <pre className="font-sans text-[14px] leading-snug whitespace-pre-wrap">{apercu.mail}</pre>
        <p className="text-[13px] text-muted">Avec la liste en PDF.</p>
      </Card>
      {modifier ? (
        <Card className="flex flex-col gap-2 p-4">
          <label htmlFor="message-libre" className="text-[14px] font-semibold">
            Ton message
          </label>
          <textarea
            id="message-libre"
            rows={5}
            value={brouillon}
            onChange={(e) => setBrouillon(e.target.value)}
            className="rounded-2xl border border-line bg-surface p-3 text-[16px] outline-none focus-visible:border-accent"
          />
          <p className="text-[13px] text-muted">La liste, la date de réponse et le lien ne bougent pas. Ton message est gardé pour tes prochaines demandes.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onMessage(brouillon.trim() || null);
                setModifier(false);
              }}
              className="pressable inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-[14px] font-bold"
            >
              Garder ce message
            </button>
            <button
              type="button"
              onClick={() => setModifier(false)}
              className="inline-flex min-h-11 items-center px-3 text-[14px] font-semibold text-muted underline"
            >
              Annuler
            </button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setBrouillon(apercu.texteLibre);
              setModifier(true);
            }}
            className="pressable inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-[14px] font-bold"
          >
            Modifier le message
          </button>
          <button
            type="button"
            onClick={() => onTutoie(!apercu.tutoie)}
            className="pressable inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-[14px] font-bold"
          >
            {apercu.tutoie ? "Le vouvoyer" : "Le tutoyer"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Profil : l'identité donnée au premier envoi, modifiable (lot final, point 1). */
export function CarteIdentite() {
  const { data, setData } = useIdentite();
  const [ouverte, setOuverte] = useState(false);
  const [pending, setPending] = useState(false);
  if (!data) return null;
  return (
    <Card className="flex flex-col gap-2 p-4" aria-label="Ton identité auprès des négoces">
      <span className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Auprès de tes négoces</span>
      {ouverte ? (
        <>
          <EtapeIdentite
            identite={data}
            onPending={setPending}
            onFait={(i) => {
              setData(i);
              setOuverte(false);
            }}
          />
          <button
            type="submit"
            form={FORMULAIRE_IDENTITE}
            disabled={pending}
            className="pressable inline-flex min-h-12 items-center justify-center self-start rounded-full bg-accent px-6 text-[15px] font-extrabold text-on-accent disabled:opacity-60"
          >
            Enregistrer
          </button>
        </>
      ) : (
        <>
          <span className="text-[16px] font-extrabold">{data.complete ? `${data.prenom}, ${data.entreprise}` : "À compléter au premier envoi"}</span>
          {data.complete ? (
            <span className="text-sm text-muted">
              SIRET {data.siret} · {data.telephone}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setOuverte(true)}
            className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold text-accent-text"
          >
            Modifier
          </button>
        </>
      )}
    </Card>
  );
}
