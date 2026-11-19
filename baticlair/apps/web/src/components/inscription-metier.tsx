"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useState } from "react";
import { Button, INPUT } from "@/components/ui";
import { BADGE_BIENTOT_DISPONIBLE, DEPARTEMENTS_INSCRIPTION, METIERS_INSCRIPTION, type MetierInscription } from "@/lib/metiers-inscription";

/** Les métiers « Bientôt disponible » montrés d'emblée ; les autres se déplient. */
const VISIBLES = 8;

/**
 * LE CHOIX DU MÉTIER À L'INSCRIPTION (Greg, 19 novembre 2026) : « Couvreur » est ouvert (choisi d'office, Mobiiz se lance
 * pour les couvreurs) ; tous les autres métiers portent « Bientôt disponible ». En choisir un remplace le formulaire de
 * compte par la liste d'attente (`ListeAttente`) : l'artisan n'entre pas dans l'application.
 */
export function ChoixMetier({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [tous, setTous] = useState(false);
  const ouverts = METIERS_INSCRIPTION.filter((m) => m.ouvert);
  const bientot = METIERS_INSCRIPTION.filter((m) => !m.ouvert);
  const montres = tous ? bientot : bientot.filter((m, i) => i < VISIBLES || m.id === value);
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-[14px] font-semibold">Ton métier</legend>
      <div className="flex flex-col gap-3">
        {ouverts.map((m) => {
          const on = value === m.id;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(m.id)}
              className={`pressable flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 text-left ${on ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink"}`}
            >
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full border ${on ? "border-white bg-white text-ink" : "border-line"}`}
                aria-hidden="true"
              >
                {on ? <Check size={15} strokeWidth={3} /> : null}
              </span>
              <span className="flex flex-col">
                <span className="text-[16px] font-bold">{m.nom}</span>
                <span className={`text-[13px] ${on ? "text-white/75" : "text-muted"}`}>{m.detail}</span>
              </span>
            </button>
          );
        })}
        <p className="mt-1 text-[13px] font-semibold text-muted">Les autres métiers arrivent bientôt :</p>
        <div className="flex flex-wrap gap-2">
          {montres.map((m) => {
            const on = value === m.id;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={on}
                aria-label={`${m.nom}, ${BADGE_BIENTOT_DISPONIBLE.toLowerCase()}`}
                onClick={() => onChange(m.id)}
                className={`pressable inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[14px] font-semibold ${on ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink"}`}
              >
                {m.nom}
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${on ? "bg-white/20 text-white" : "bg-ground text-muted"}`}>
                  {BADGE_BIENTOT_DISPONIBLE}
                </span>
              </button>
            );
          })}
          {!tous && bientot.length > montres.length ? (
            <button
              type="button"
              onClick={() => setTous(true)}
              className="pressable inline-flex min-h-11 items-center rounded-full border border-dashed border-line px-4 text-[14px] font-semibold text-accent-text"
            >
              Voir les {bientot.length - montres.length} autres métiers
            </button>
          ) : null}
        </div>
      </div>
    </fieldset>
  );
}

/** Le département de l'entreprise : rempli quand l'artisan l'a touché sur la carte d'une page régionale. */
export function ChampDepartement({ value, onChange, id = "departement" }: { value: string; onChange: (v: string) => void; id?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[14px] font-semibold">
        Ton département
      </label>
      <select
        id={id}
        name="departement"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={`${id}-hint`}
        className={`${INPUT} appearance-auto`}
      >
        <option value="">Choisir…</option>
        {DEPARTEMENTS_INSCRIPTION.map((d) => (
          <option key={d.code} value={d.code}>
            {d.code} · {d.nom}
          </option>
        ))}
      </select>
      <p id={`${id}-hint`} className="text-[14px] text-muted">
        Pour te montrer les achats groupés près de chez toi.
      </p>
    </div>
  );
}

/**
 * LA LISTE D'ATTENTE (métier pas encore ouvert) : un e-mail, le département s'il le veut, et un message sympa. Pas de
 * compte, pas d'entrée dans l'application. Lue dans l'espace admin (décompte par métier et par département).
 */
export function ListeAttente({
  metier,
  departement,
  onDepartement,
  source,
}: {
  metier: MetierInscription;
  departement: string;
  onDepartement: (v: string) => void;
  source: string;
}) {
  const [email, setEmail] = useState("");
  const [etat, setEtat] = useState<"saisie" | "envoi" | "fait" | "erreur" | "email">("saisie");
  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setEtat("email");
    setEtat("envoi");
    try {
      const r = await fetch("/v1/public/liste-attente", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          metier: metier.id,
          departement: departement || null,
          source,
        }),
      });
      setEtat(r.ok ? "fait" : "erreur");
    } catch {
      setEtat("erreur");
    }
  }
  if (etat === "fait") {
    return (
      <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-5 shadow-card" aria-live="polite">
        <h2 className="text-[20px] font-bold">C’est noté, merci !</h2>
        <p className="text-[16px] leading-relaxed text-muted">
          Tu seras parmi les premiers prévenus quand Mobiiz ouvrira aux {metier.pluriel}. On commence par les couvreurs, on arrive vite.
        </p>
        <Link href="/" className="font-semibold text-accent-text underline">
          Retour à l’accueil
        </Link>
      </section>
    );
  }
  return (
    <form onSubmit={envoyer} noValidate className="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 shadow-card">
      <div className="flex flex-col gap-1">
        <h2 className="text-[20px] font-bold">Mobiiz arrive bientôt pour les {metier.pluriel}</h2>
        <p className="text-[16px] leading-relaxed text-muted">
          On démarre avec les couvreurs. Laisse ton e-mail : on te prévient dès que c’est ouvert pour toi. Rien d’autre.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="email-attente" className="text-[14px] font-semibold">
          Ton e-mail
        </label>
        <input
          id="email-attente"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (etat === "email" || etat === "erreur") setEtat("saisie");
          }}
          aria-invalid={etat === "email" || undefined}
          className={`${INPUT} ${etat === "email" ? "border-danger" : ""}`}
        />
        {etat === "email" ? <p className="text-[14px] font-semibold text-danger">Vérifie ton adresse e-mail.</p> : null}
      </div>
      <ChampDepartement id="departement-attente" value={departement} onChange={onDepartement} />
      {etat === "erreur" ? <p className="text-[14px] font-semibold text-danger">Ça n’est pas passé. Réessaie dans un instant.</p> : null}
      <Button type="submit" pending={etat === "envoi"}>
        Me prévenir
      </Button>
    </form>
  );
}
