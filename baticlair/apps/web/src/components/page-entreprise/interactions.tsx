"use client";

import { Check, Flag, Send } from "lucide-react";
import { useState } from "react";
import { Turnstile, TURNSTILE_ACTIF } from "@/components/turnstile";

/**
 * Les deux gestes d'un visiteur sur une page publique : écrire à l'entreprise (son e-mail n'est jamais montré, le message
 * part par Mobiiz) et « Signaler cette page ». Aucun compte, aucun cookie ; le défi anti-robots apparaît quand Turnstile
 * est branché. Dans l'aperçu de l'éditeur, rien ne part.
 */
async function envoyer(url: string, corps: unknown, captcha: string | null): Promise<{ ok: true } | { ok: false; phrase: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", accept: "application/json", ...(captcha ? { "x-captcha-response": captcha } : {}) }, body: JSON.stringify(corps) });
    if (res.ok) return { ok: true };
    const d = (await res.json().catch(() => null)) as { error?: { details?: { phrase?: string } | { path: string }[] } } | null;
    const details = d?.error?.details;
    const phrase = details && !Array.isArray(details) && details.phrase ? details.phrase : res.status === 429 ? "Trop de messages envoyés. Réessayez plus tard ou appelez directement." : Array.isArray(details) ? "Vérifiez les champs : nom (2 lettres au moins) et message (5 caractères au moins)." : "Le message n'est pas parti. Réessayez dans un instant.";
    return { ok: false, phrase };
  } catch {
    return { ok: false, phrase: "Pas de connexion. Réessayez dans un instant." };
  }
}

export function ContactPage({ adresse, nom, apercu = false }: { adresse: string; nom: string; apercu?: boolean }) {
  const [etat, setEtat] = useState<"saisie" | "envoi" | "envoye">("saisie");
  const [erreur, setErreur] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  if (etat === "envoye") {
    return (
      <p className="pe-merci" role="status">
        <Check size={20} aria-hidden="true" /> Message envoyé à {nom}. Vous serez recontacté directement.
      </p>
    );
  }
  return (
    <form
      className="pe-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (apercu) return;
        const f = new FormData(e.currentTarget);
        const v = (k: string) => String(f.get(k) ?? "").trim() || null;
        if (!v("telephone") && !v("email")) {
          setErreur("Laissez un téléphone ou un e-mail pour qu'on vous réponde.");
          return;
        }
        setEtat("envoi");
        setErreur(null);
        const r = await envoyer(`/v1/public/pages/${adresse}/contact`, { nom: v("nom"), telephone: v("telephone"), email: v("email"), commune: v("commune"), message: v("message") }, captcha);
        if (r.ok) setEtat("envoye");
        else {
          setEtat("saisie");
          setErreur(r.phrase);
        }
      }}
    >
      <label>
        <span>Votre nom</span>
        <input name="nom" required minLength={2} maxLength={80} autoComplete="name" />
      </label>
      <div className="pe-form-deux">
        <label>
          <span>Téléphone</span>
          <input name="telephone" type="tel" inputMode="tel" maxLength={25} autoComplete="tel" />
        </label>
        <label>
          <span>E-mail</span>
          <input name="email" type="email" maxLength={200} autoComplete="email" />
        </label>
      </div>
      <label>
        <span>Commune du chantier (facultatif)</span>
        <input name="commune" maxLength={80} autoComplete="address-level2" />
      </label>
      <label>
        <span>Votre projet</span>
        <textarea name="message" required minLength={5} maxLength={2000} rows={4} />
      </label>
      {TURNSTILE_ACTIF && !apercu ? <Turnstile onToken={setCaptcha} /> : null}
      {erreur ? (
        <p className="pe-erreur" role="alert">
          {erreur}
        </p>
      ) : null}
      <button type="submit" className="pe-btn pe-btn-plein" disabled={etat === "envoi" || apercu} aria-busy={etat === "envoi" || undefined}>
        <Send size={18} aria-hidden="true" /> {etat === "envoi" ? "Envoi…" : "Envoyer ma demande"}
      </button>
      <p className="pe-note">Vos coordonnées sont transmises uniquement à {nom} pour vous répondre. Mobiiz ne les garde pas.</p>
    </form>
  );
}

const MOTIFS = [
  { id: "contenu", libelle: "Contenu choquant ou trompeur" },
  { id: "usurpation", libelle: "Cette page usurpe une entreprise" },
  { id: "photos", libelle: "Photos qui ne lui appartiennent pas ou montrent des personnes" },
  { id: "arnaque", libelle: "Arnaque ou démarchage abusif" },
  { id: "autre", libelle: "Autre" },
];

export function SignalerPage({ adresse, apercu = false }: { adresse: string; apercu?: boolean }) {
  const [fait, setFait] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  if (fait) return <p className="pe-note" role="status">Merci, l&apos;équipe Mobiiz va regarder cette page.</p>;
  return (
    <details className="pe-signaler">
      <summary>
        <Flag size={14} aria-hidden="true" /> Signaler cette page
      </summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (apercu) return;
          const f = new FormData(e.currentTarget);
          const r = await envoyer(`/v1/public/pages/${adresse}/signalement`, { motif: f.get("motif"), precision: String(f.get("precision") ?? "").trim() || null }, null);
          if (r.ok) setFait(true);
          else setErreur(r.phrase);
        }}
      >
        <fieldset>
          <legend>Pourquoi ?</legend>
          {MOTIFS.map((m, i) => (
            <label key={m.id} className="pe-radio">
              <input type="radio" name="motif" value={m.id} defaultChecked={i === 0} /> {m.libelle}
            </label>
          ))}
        </fieldset>
        <label>
          <span>Précision (facultatif)</span>
          <textarea name="precision" maxLength={1000} rows={2} />
        </label>
        {erreur ? <p className="pe-erreur">{erreur}</p> : null}
        <button type="submit" className="pe-btn pe-btn-contour" disabled={apercu}>
          Envoyer le signalement
        </button>
      </form>
    </details>
  );
}
