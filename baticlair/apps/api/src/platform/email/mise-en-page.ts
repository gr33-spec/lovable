import { EDITEUR_APP, EMETTEUR_FACTURES, NOM_APP } from "@baticlair/domain";
import type { TransactionalEmail } from "./email.port.js";

/**
 * LES E-MAILS RÉELS (Greg, 24 octobre 2026) : chaque e-mail qui part a le logo, le pied légal (l'éditeur, son adresse,
 * son SIRET) et un lien pour ne plus en recevoir. Les services écrivent leur texte ; la mise en page est faite ici, une
 * fois, pour tous (le texte reste la référence, le HTML en est la mise en forme).
 */

/** Les lignes de désabonnement écrites par les services : « Se désabonner : https://… », « Stop : … », etc. */
const LIGNE_STOP = /^(?:Ne plus recevoir ces e-mails|Se désabonner|Stop|Pour ne plus rien recevoir)\s*:\s*(https?:\/\/\S+)\s*$/im;

export const PIED_LEGAL = `${NOM_APP}, service édité par ${EDITEUR_APP}, ${EMETTEUR_FACTURES.forme}, ${EMETTEUR_FACTURES.adresse}. SIRET ${EMETTEUR_FACTURES.siret}.`;

const echapper = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const liens = (t: string) => t.replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" style="color:#0E0E0E">${u}</a>`);

/** Le lien de désabonnement de l'e-mail : celui qu'il écrit, sinon la page de ses réglages. */
export function lienDesabonnement(email: Pick<TransactionalEmail, "text">, webAppUrl: string): { url: string; propre: boolean } {
  const m = LIGNE_STOP.exec(email.text);
  return m ? { url: m[1]!, propre: true } : { url: `${webAppUrl}/compte`, propre: false };
}

/** L'e-mail tel qu'il part : HTML avec logo et pied, texte avec le pied légal, en-tête List-Unsubscribe. */
export function miseEnPage(email: TransactionalEmail, webAppUrl: string): TransactionalEmail & { headers: Record<string, string> } {
  const stop = lienDesabonnement(email, webAppUrl);
  const texteSansStop = stop.propre ? email.text.replace(LIGNE_STOP, "").trimEnd() : email.text.trimEnd();
  const corps =
    email.html ??
    texteSansStop
      .split(/\n{2,}/)
      .map((p) => `<p style="margin:0 0 14px">${liens(echapper(p)).replace(/\n/g, "<br>")}</p>`)
      .join("");
  const motStop = stop.propre ? "Ne plus recevoir ces e-mails" : "Gérer tes e-mails";
  const html = [
    `<!doctype html><html lang="fr"><body style="margin:0;background:#F4F4F2;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0E0E0E">`,
    `<div style="max-width:560px;margin:0 auto;padding:24px 16px">`,
    `<div style="padding:0 0 16px"><img src="${webAppUrl}/marque/logo-clair.png" alt="${NOM_APP}" height="32" style="height:32px;width:auto;display:block"></div>`,
    `<div style="background:#FFFFFF;border-radius:16px;padding:24px;font-size:15px;line-height:1.5">${corps}</div>`,
    `<div style="padding:16px 4px 0;font-size:12px;line-height:1.5;color:#555555">`,
    `<p style="margin:0 0 8px">${echapper(PIED_LEGAL)}</p>`,
    `<p style="margin:0"><a href="${stop.url}" style="color:#555555">${motStop}</a></p>`,
    `</div></div></body></html>`,
  ].join("");
  const text = `${texteSansStop}\n\n--\n${PIED_LEGAL}\n${motStop} : ${stop.url}`;
  return { ...email, text, html, headers: { "List-Unsubscribe": `<${stop.url}>` } };
}

/**
 * LA LISTE BLANCHE DE LA PRÉVISUALISATION : seules les adresses (ou les domaines « @exemple.fr ») de `EMAILS_AUTORISES`
 * reçoivent leurs e-mails ; les autres vont à l'adresse de test, objet « [TEST → destinataire réel] … ». Sans adresse de
 * test, l'e-mail ne part pas. En production, la garde est éteinte (null).
 */
export interface GardeEnvoi {
  autorises: readonly string[];
  redirigerVers: string | null;
}

export function autorise(garde: GardeEnvoi, to: string): boolean {
  const a = to.trim().toLowerCase();
  return garde.autorises.some((x) => (x.startsWith("@") ? a.endsWith(x) : a === x));
}

/** L'e-mail après la garde : tel quel, redirigé vers l'adresse de test, ou null (il ne part pas). */
export function garder(garde: GardeEnvoi | null, email: TransactionalEmail): TransactionalEmail | null {
  if (!garde || autorise(garde, email.to)) return email;
  if (!garde.redirigerVers) return null;
  return { ...email, to: garde.redirigerVers, subject: `[TEST → ${email.to}] ${email.subject}` };
}
