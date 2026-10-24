import { deMois, type Mois } from "./commande-du-mois.js";

/**
 * LE SUIVI DES DEMANDES DE PRIX (Greg, 24 octobre 2026) : après la clôture, l'artisan voit où en sont les négoces, sans
 * jamais un nom ni un prix avant les résultats. « Demandes envoyées à 10 négoces de ton secteur », « Résultats le 08/11
 * à 18 h », « 4 négoces sur 10 ont répondu » et une barre ; la veille sans réponse, « On les a relancés » ; à l'échéance,
 * le bilan, ou le report de la liste à la commande suivante quand personne n'a répondu.
 *
 * Calcul pur : les comptes viennent de l'API (grilles envoyées, grilles déposées).
 */

const dateFr = (d: Date) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" }).format(d);
const heureFr = (d: Date) => {
  const parts = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value);
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return m === "00" ? `${h} h` : `${h} h ${m}`;
};

/** « Résultats le 08/11 à 18 h » : l'heure réelle de la limite des négoces (réglage de l'admin). */
export function phraseResultatsLe(reponseAvant: Date): string {
  return `Résultats le ${dateFr(reponseAvant)} à ${heureFr(reponseAvant)}`;
}

/** « 1 négoce », « 10 négoces ». */
const negoces = (n: number) => `${n} négoce${n > 1 ? "s" : ""}`;

/** « 4 négoces sur 10 ont répondu », « 1 négoce sur 10 a répondu », « Aucun négoce sur 10 n'a encore répondu ». */
export function compteurDeReponses(repondus: number, consultes: number): string {
  if (repondus <= 0) return `Aucun négoce sur ${consultes} n'a encore répondu`;
  if (repondus >= consultes) return consultes === 1 ? "Le négoce consulté a répondu" : `Les ${consultes} négoces ont répondu`;
  return `${repondus} négoce${repondus > 1 ? "s" : ""} sur ${consultes} ${repondus > 1 ? "ont" : "a"} répondu`;
}

export interface EtatDesDemandes {
  mois: Mois;
  phase: "inscriptions" | "negoces" | "resultats";
  /** Négoces à qui la grille est partie (comptes inscrits, ajoutés avant la clôture). */
  consultes: number;
  /** Grilles déposées. */
  repondus: number;
  reponseAvant: Date;
  relanceLe: Date;
  maintenant: Date;
}

export interface SuiviDesDemandes {
  /** « Demandes envoyées à 10 négoces de ton secteur ». */
  titre: string;
  /** « Résultats le 08/11 à 18 h » ; null une fois les résultats publiés. */
  resultatsLe: string | null;
  /** « 4 négoces sur 10 ont répondu » ; null sans négoce consulté. */
  compteur: string | null;
  /** De 0 à 1, pour la barre ; null sans négoce consulté. */
  progression: number | null;
  /** La phrase du moment : la relance, le bilan, ou ce qu'il reste à faire. */
  phrase: string | null;
  /** Vrai quand l'artisan peut aider : aucun négoce consulté, ou aucune réponse. Le bouton « Mets ton négoce dans la boucle ». */
  boucle: boolean;
}

/**
 * Le suivi pendant la phase des négoces, puis à l'échéance. Rien pendant les inscriptions (le chrono de clôture suffit).
 * Jamais un nom ni un prix : seulement des comptes.
 */
export function suiviDesDemandes(e: EtatDesDemandes): SuiviDesDemandes | null {
  if (e.phase === "inscriptions") return null;
  const consultes = Math.max(0, e.consultes);
  const repondus = Math.min(Math.max(0, e.repondus), consultes);
  const titre = consultes > 0 ? `Demandes envoyées à ${negoces(consultes)} de ton secteur` : "Aucun négoce de ton secteur n'a encore son accès";
  const compteur = consultes > 0 ? compteurDeReponses(repondus, consultes) : null;
  const progression = consultes > 0 ? repondus / consultes : null;
  if (e.phase === "negoces") {
    const veille = e.maintenant >= e.relanceLe;
    let phrase: string | null = null;
    if (consultes === 0) phrase = "Mets ton négoce dans la boucle : il recevra les prochaines demandes dès qu'il a son accès.";
    else if (repondus === 0 && veille) phrase = "Aucune réponse pour l'instant. On les a relancés.";
    return { titre, resultatsLe: phraseResultatsLe(e.reponseAvant), compteur, progression, phrase, boucle: consultes === 0 };
  }
  // Les résultats : le bilan.
  if (repondus === 0) return { titre, resultatsLe: null, compteur, progression, phrase: null, boucle: true };
  const sur = `Sur ${consultes} demande${consultes > 1 ? "s" : ""}, ${repondus} négoce${repondus > 1 ? "s ont" : " a"} répondu.`;
  const phrase = repondus === 1 ? `${sur} Compare son prix à ta dernière facture.` : `${sur} Voici le meilleur prix livré pour toi.`;
  return { titre, resultatsLe: null, compteur, progression, phrase, boucle: false };
}

/**
 * Personne n'a répondu à l'échéance : la liste part toute seule avec la commande suivante (Greg, 24 octobre 2026).
 * « Aucun négoce n'a répondu à la commande du 1er novembre. Ta liste passe automatiquement à la commande du 15 novembre. »
 */
export function phraseDeReport(de: Mois, vers: Mois): string {
  return `Aucun négoce n'a répondu à la commande ${deMois(de)}. Ta liste passe automatiquement à la commande ${deMois(vers)}.`;
}

/** La notification de report (une fois). */
export function messageDeReport(de: Mois, vers: Mois): { titre: string; corps: string } {
  return { titre: `Commande ${deMois(de)}`, corps: phraseDeReport(de, vers) };
}

/** « 2 nouvelles réponses. », « 1 nouvelle réponse. » : la notification du jour, sans nom ni prix. */
export function messageNouvellesReponses(n: number, reponseAvant: Date | null): { titre: string; corps: string } {
  const quoi = n > 1 ? `${n} nouvelles réponses.` : "1 nouvelle réponse.";
  return { titre: "Commande commune", corps: reponseAvant ? `${quoi} ${phraseResultatsLe(reponseAvant)}.` : quoi };
}

/**
 * Le négoce que l'artisan a mis dans la boucle (Greg, 24 octobre 2026) : seulement s'il a répondu, jamais son prix avant
 * les résultats. `pas_consulte` : il n'avait pas son accès (ou a été ajouté après la clôture), la demande ne lui est pas partie.
 */
export function phraseDeMonNegoce(nom: string, etat: "repondu" | "attente" | "pas_consulte"): string {
  if (etat === "repondu") return `Ton négoce ${nom} a répondu.`;
  if (etat === "attente") return `Ton négoce ${nom} n'a pas encore répondu.`;
  return `Ton négoce ${nom} n'a pas reçu cette demande : il recevra la prochaine dès qu'il a son accès.`;
}

/** Ce que voit le négoce : combien de négoces sont consultés et quand tombent les résultats, jamais lesquels. */
export function consultationPourLeNegoce(consultes: number, reponseAvant: Date): string {
  return `${negoces(Math.max(1, consultes))} consulté${consultes > 1 ? "s" : ""}, ${phraseResultatsLe(reponseAvant).replace(/^Résultats/, "résultats")}.`;
}

/** Le compteur de l'admin, par commande et par département : « 22 · commande du 1er novembre : 4 négoces sur 10 ont répondu ». */
export function compteurAdmin(c: { zone: string; mois: Mois; consultes: number; repondus: number }): string {
  return `${c.zone} · commande ${deMois(c.mois)} : ${c.consultes > 0 ? compteurDeReponses(c.repondus, c.consultes) : "aucun négoce consulté"}`;
}

