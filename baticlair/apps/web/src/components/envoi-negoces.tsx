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
}

export function useIdentite() {
  const charger = useCallback((signal: AbortSignal) => api<Identite>("/v1/company/identite", { signal }), []);
  return useResource(charger);
}

export const FORMULAIRE_IDENTITE = "identite-avant-envoi";

/** « Avant d'envoyer » : SIRET, prénom, portable ; le SIRET remplit le nom et l'adresse de l'entreprise. */
export function EtapeIdentite({ identite, onFait, onPending }: { identite: Identite; onFait: (i: Identite) => void; onPending: (p: boolean) => void }) {
  const [siret, setSiret] = useState(identite.siret ?? "");
  const [prenom, setPrenom] = useState(identite.prenom ?? "");
  const [telephone, setTelephone] = useState(identite.telephone ?? "");
  const [trouve, setTrouve] = useState<{ siret: string; entreprise: string | null; adresse: string | null } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const chiffres = siret.replace(/\s/g, "");

  // Quatorze chiffres : l'annuaire des entreprises dit le nom et l'adresse, et préremplit le prénom du dirigeant.
  const annuaire = trouve && trouve.siret === chiffres ? trouve : null;
  useEffect(() => {
    if (!/^\d{14}$/.test(chiffres)) return;
    const c = new AbortController();
    api<{ trouvee: boolean; entreprise: string | null; adresse: string | null; prenomDirigeant: string | null }>(`/v1/company/identite/annuaire?siret=${chiffres}`, { signal: c.signal }).then(
      (r) => {
        setTrouve(r.trouvee ? { siret: chiffres, entreprise: r.entreprise, adresse: r.adresse } : null);
        if (r.prenomDirigeant) setPrenom((p) => p || r.prenomDirigeant!);
      },
      () => setTrouve(null),
    );
    return () => c.abort();
  }, [chiffres]);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    onPending(true);
    try {
      onFait(await api<Identite>("/v1/company/identite", { method: "PUT", body: { siret: chiffres, prenom: prenom.trim(), telephone: telephone.trim() } }));
    } catch (x) {
      setErreur(messageErreur(x, { portable_invalide: "Il me faut ton portable (06 ou 07), pour que ton négoce puisse t'appeler.", siret_invalide: "Ce SIRET ne va pas : 14 chiffres." }));
    } finally {
      onPending(false);
    }
  }

  return (
    <form id={FORMULAIRE_IDENTITE} onSubmit={(e) => void enregistrer(e)} className="flex flex-col gap-4" noValidate>
      <p className="text-[16px] font-semibold">{identite.phrase}</p>
      <Field id="identite-siret" label="SIRET de ton entreprise" inputMode="numeric" autoComplete="off" placeholder="14 chiffres" value={siret} onChange={(e) => setSiret(e.target.value)} />
      {annuaire?.entreprise ? (
        <Card className="flex flex-col gap-0.5 p-3 text-[14px]">
          <span className="font-extrabold">{annuaire.entreprise}</span>
          {annuaire.adresse ? <span className="text-muted">{annuaire.adresse}</span> : null}
        </Card>
      ) : null}
      <Field id="identite-prenom" label="Ton prénom" autoComplete="given-name" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
      <Field id="identite-portable" label="Ton portable" type="tel" inputMode="tel" autoComplete="tel" placeholder="06 12 34 56 78" value={telephone} onChange={(e) => setTelephone(e.target.value)} hint="Ton négoce peut t'appeler s'il a un doute. Ton e-mail, lui, n'est jamais donné." />
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
    api<Apercu>(`/v1/projects/${encodeURIComponent(projectId)}/price-requests/preview`, { method: "POST", body: { supplierId, message, ...(tutoie === null ? {} : { tutoie }) }, signal: c.signal }).then(
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
            <button type="button" onClick={() => setModifier(false)} className="inline-flex min-h-11 items-center px-3 text-[14px] font-semibold text-muted underline">
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
          <button type="button" onClick={() => onTutoie(!apercu.tutoie)} className="pressable inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-[14px] font-bold">
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
          <button type="submit" form={FORMULAIRE_IDENTITE} disabled={pending} className="pressable inline-flex min-h-12 items-center justify-center self-start rounded-full bg-accent px-6 text-[15px] font-extrabold text-on-accent disabled:opacity-60">
            Enregistrer
          </button>
        </>
      ) : (
        <>
          <span className="text-[16px] font-extrabold">{data.complete ? `${data.prenom}, ${data.entreprise}` : "À compléter au premier envoi"}</span>
          {data.complete ? <span className="text-sm text-muted">SIRET {data.siret} · {data.telephone}</span> : null}
          <button type="button" onClick={() => setOuverte(true)} className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold text-accent-text">
            Modifier
          </button>
        </>
      )}
    </Card>
  );
}
