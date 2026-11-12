"use client";

import { useEffect, useId, useRef, useState } from "react";
import { chercherMetier } from "../../../../packages/domain/src/missions/missions";
import { api } from "@/lib/api";
import { Champ, SAISIE } from "./ux-kit";

/**
 * LES CHAMPS DES FORMULAIRES MISSIONS (Greg, 12 novembre 2026, dossier de corrections UX, point 4).
 * `ChampMetier` : un sélecteur avec recherche (dès les premières lettres, mots du chantier compris) ; un métier
 * réellement absent de la liste se garde tel qu'écrit, sur demande explicite.
 * `ChampsCommune` : le code postal propose la commune, la commune propose son code postal ; un code postal à plusieurs
 * communes demande un choix (jamais un choix arbitraire). L'annuaire muet ne bloque rien : la saisie reste libre.
 */

const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const OPTION = "pressable flex min-h-11 w-full items-center rounded-xl px-3 text-left text-[15px] font-bold text-[#130901]";

export function ChampMetier({ label, valeur, onChange, erreur }: { label: string; valeur: string; onChange: (v: string) => void; erreur?: string | undefined }) {
  const id = useId();
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(-1);
  const saisie = valeur.trim();
  const trouves = chercherMetier(valeur).slice(0, saisie ? 8 : 14);
  const exact = trouves.some((m) => sansAccent(m) === sansAccent(valeur));
  // « Garder ce que j'ai écrit » n'apparaît que si la liste n'a pas ce métier.
  const libre = saisie.length >= 2 && !exact;
  const options = [...trouves, ...(libre ? [saisie] : [])];
  const choisir = (m: string) => {
    onChange(m);
    setOuvert(false);
    setActif(-1);
  };
  return (
    <Champ label={label} erreur={erreur}>
      <input
        role="combobox"
        aria-expanded={ouvert}
        aria-controls={`${id}-liste`}
        aria-autocomplete="list"
        aria-activedescendant={ouvert && actif >= 0 ? `${id}-${actif}` : undefined}
        aria-invalid={erreur ? true : undefined}
        value={valeur}
        placeholder="Chercher un métier"
        autoComplete="off"
        className={SAISIE}
        onChange={(e) => {
          onChange(e.target.value);
          setOuvert(true);
          setActif(-1);
        }}
        onFocus={() => setOuvert(true)}
        // Le temps qu'un appui sur une proposition soit pris en compte avant de refermer.
        onBlur={() => setTimeout(() => setOuvert(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOuvert(true);
            setActif((a) => (options.length ? (a + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length : -1));
          } else if (e.key === "Enter" && ouvert && actif >= 0 && options[actif]) {
            e.preventDefault();
            choisir(options[actif]!);
          } else if (e.key === "Escape") setOuvert(false);
        }}
      />
      {ouvert && !(exact && trouves.length === 1) ? (
        <ul id={`${id}-liste`} role="listbox" aria-label={`${label} : propositions`} className="mt-1 flex max-h-64 flex-col gap-0.5 overflow-y-auto border-t border-[#e4dfd3] pt-1">
          {trouves.map((m, i) => (
            <li key={m} id={`${id}-${i}`} role="option" aria-selected={actif === i}>
              <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => choisir(m)} className={`${OPTION} ${actif === i ? "bg-[#ffe98a]" : ""}`}>
                {m}
              </button>
            </li>
          ))}
          {libre ? (
            <li id={`${id}-${trouves.length}`} role="option" aria-selected={actif === trouves.length}>
              <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => choisir(saisie)} className={`${OPTION} font-semibold ${actif === trouves.length ? "bg-[#ffe98a]" : ""}`}>
                {trouves.length ? `Autre métier : garder « ${saisie} »` : `Pas dans la liste : garder « ${saisie} »`}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </Champ>
  );
}

interface Commune {
  nom: string;
  codePostal: string;
}

export function ChampsCommune({ labelCommune, commune, codePostal, onChange, erreurCommune, erreurCodePostal }: { labelCommune: string; commune: string; codePostal: string; onChange: (v: { commune: string; codePostal: string }) => void; erreurCommune?: string | undefined; erreurCodePostal?: string | undefined }) {
  const [propositions, setPropositions] = useState<{ pour: "codePostal" | "commune"; communes: Commune[] } | null>(null);
  // Ce que l'artisan vient de modifier : c'est ce champ-là qui interroge l'annuaire.
  const [source, setSource] = useState<"codePostal" | "commune" | null>(null);
  const derniere = useRef({ commune, codePostal });
  useEffect(() => {
    derniere.current = { commune, codePostal };
  });

  useEffect(() => {
    if (!source) return;
    const requete = source === "codePostal" ? (/^\d{5}$/.test(codePostal) ? `codePostal=${codePostal}` : null) : commune.trim().length >= 2 ? `nom=${encodeURIComponent(commune.trim())}` : null;
    if (!requete) return;
    const arret = new AbortController();
    const attente = setTimeout(
      () => {
        api<{ items: Commune[] }>(`/v1/communes?${requete}`, { signal: arret.signal }).then(
          ({ items }) => {
            const { commune: c, codePostal: cp } = derniere.current;
            if (source === "codePostal") {
              const meme = items.find((x) => sansAccent(x.nom) === sansAccent(c));
              // Une seule commune : elle se remplit (sans écraser ce que l'artisan a écrit) ; plusieurs : il choisit.
              if (items.length === 1 && !c.trim()) onChange({ commune: items[0]!.nom, codePostal: cp });
              setPropositions(meme || items.length <= 1 ? null : { pour: "codePostal", communes: items });
            } else {
              const exacte = items.filter((x) => sansAccent(x.nom) === sansAccent(c));
              if (exacte.length === 1 && !cp) onChange({ commune: exacte[0]!.nom, codePostal: exacte[0]!.codePostal });
              const deja = items.some((x) => sansAccent(x.nom) === sansAccent(c) && x.codePostal === cp);
              setPropositions(deja || items.length === 0 || (exacte.length === 1 && !cp) ? null : { pour: "commune", communes: items });
            }
          },
          () => undefined,
        );
      },
      source === "commune" ? 250 : 0,
    );
    return () => {
      clearTimeout(attente);
      arret.abort();
    };
    // `onChange` change à chaque rendu du formulaire : seules la saisie et sa source relancent la recherche.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, commune, codePostal]);

  const choisir = (c: Commune) => {
    setSource(null);
    setPropositions(null);
    onChange({ commune: c.nom, codePostal: c.codePostal });
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[1fr_7.5rem] gap-3">
        <Champ label={labelCommune} erreur={erreurCommune}>
          <input
            value={commune}
            onChange={(e) => {
              setSource("commune");
              setPropositions(null);
              onChange({ commune: e.target.value, codePostal });
            }}
            placeholder="Ex. Plouha"
            aria-invalid={erreurCommune ? true : undefined}
            autoComplete="address-level2"
            className={SAISIE}
          />
        </Champ>
        <Champ label="Code postal" erreur={erreurCodePostal}>
          <input
            value={codePostal}
            onChange={(e) => {
              setSource("codePostal");
              setPropositions(null);
              onChange({ commune, codePostal: e.target.value.replace(/\D/g, "").slice(0, 5) });
            }}
            inputMode="numeric"
            placeholder="Ex. 22580"
            aria-invalid={erreurCodePostal ? true : undefined}
            autoComplete="postal-code"
            className={SAISIE}
          />
        </Champ>
      </div>
      {propositions ? (
        <div role="group" aria-label="Communes proposées" className="flex flex-col gap-2 rounded-[18px] bg-surface p-3 text-[#130901] shadow-card">
          <p className="text-[13px] font-bold text-[#5c5648]">{propositions.pour === "codePostal" ? `Plusieurs communes ont le code postal ${codePostal}. Laquelle ?` : "Est-ce l'une de ces communes ?"}</p>
          <div className="flex flex-wrap gap-2">
            {propositions.communes.map((c) => (
              <button key={`${c.nom}-${c.codePostal}`} type="button" onClick={() => choisir(c)} className="pressable min-h-11 rounded-full border border-[#8a8474] px-4 text-[14px] font-extrabold">
                {c.nom}
                {propositions.pour === "commune" ? ` · ${c.codePostal}` : ""}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
