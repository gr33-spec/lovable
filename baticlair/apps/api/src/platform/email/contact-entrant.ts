import { BANDEAU_EXTERNE, liensDesactives, objetExterne, pieceDangereuse, verdictEntrant, type Authentification, type VerdictEntrant } from "@baticlair/domain";
import type { AppLogger } from "../logging/logger.js";
import type { TransactionalEmail, TransactionalEmailSender } from "./email.port.js";

/**
 * LA BOÎTE DE CONTACT (Greg, 26 octobre 2026 : « MX sur mobiiz.fr directement, chez Resend ») : un e-mail reçu sur
 * contact@mobiiz.fr (ou l'ancienne bonjour@) est renvoyé à l'adresse admin, pièces jointes comprises, et « Répondre »
 * écrit à l'expéditeur d'origine. Le webhook de Resend ne porte que l'enveloppe : le corps et les pièces jointes se
 * relisent par l'API de réception.
 */
export interface EmailRecu {
  from: string;
  to: string[];
  subject: string;
  date: string;
  text: string | null;
  html: string | null;
  attachments: { filename: string; contentType: string; contentBase64: string }[];
  /** Pièces trop lourdes pour être renvoyées : nommées dans le texte, à lire dans Resend. */
  tropLourdes: string[];
  /**
   * Le verdict SPF, DKIM et DMARC du serveur de réception (Resend, `authentication`) : l'expéditeur ne peut pas l'écrire.
   * Absent quand le message n'a pas pu être relu.
   */
  authentification?: Authentification | null;
  /** Pièces jointes dangereuses, jamais téléchargées (Greg, 22 novembre 2026) : seulement leur nom. */
  piecesRetenues?: string[];
}

export interface LecteurEmailRecu {
  lire(emailId: string): Promise<EmailRecu | null>;
}

/** Au-delà, les pièces jointes ne repartent pas (Resend accepte 40 Mo par e-mail, base64 compris). */
export const PIECES_MAX_OCTETS = 20 * 1024 * 1024;

type HttpGet = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown>; arrayBuffer(): Promise<ArrayBuffer> }>;

/** Lecture réelle par l'API de réception de Resend (pas de SDK). */
export class ResendLecteurEmailRecu implements LecteurEmailRecu {
  constructor(
    private readonly apiKey: string,
    private readonly logger: AppLogger,
    private readonly fetchImpl: HttpGet = fetch as unknown as HttpGet,
  ) {}

  async lire(emailId: string): Promise<EmailRecu | null> {
    const id = encodeURIComponent(emailId);
    const auth = { authorization: `Bearer ${this.apiKey}` };
    const res = await this.fetchImpl(`https://api.resend.com/emails/receiving/${id}`, { headers: auth, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      this.logger.error({ status: res.status }, "resend: e-mail reçu illisible");
      return null;
    }
    const e = (await res.json()) as { from?: string; to?: string[]; subject?: string; created_at?: string; text?: string | null; html?: string | null; authentication?: Authentification | null; headers?: Record<string, string> };
    const attachments: EmailRecu["attachments"] = [];
    const tropLourdes: string[] = [];
    const piecesRetenues: string[] = [];
    const liste = await this.fetchImpl(`https://api.resend.com/emails/receiving/${id}/attachments`, { headers: auth, signal: AbortSignal.timeout(10_000) });
    if (liste.ok) {
      const pieces = ((await liste.json()) as { data?: { filename?: string; content_type?: string; size?: number; download_url?: string }[] }).data ?? [];
      let total = 0;
      for (const p of pieces) {
        const nom = p.filename ?? "piece-jointe";
        // Une pièce dangereuse (exécutable, archive, macro) n'est jamais téléchargée : seul son nom reste.
        if (pieceDangereuse(nom, p.content_type ?? "")) {
          piecesRetenues.push(nom);
          continue;
        }
        if (!p.download_url || total + (p.size ?? 0) > PIECES_MAX_OCTETS) {
          tropLourdes.push(nom);
          continue;
        }
        const fichier = await this.fetchImpl(p.download_url, { headers: {}, signal: AbortSignal.timeout(20_000) });
        if (!fichier.ok) {
          tropLourdes.push(nom);
          continue;
        }
        const octets = Buffer.from(await fichier.arrayBuffer());
        total += octets.length;
        attachments.push({ filename: nom, contentType: p.content_type ?? "application/octet-stream", contentBase64: octets.toString("base64") });
      }
    }
    // Le nom affiché de l'expéditeur vit dans l'en-tête (le champ `from` est l'adresse nue).
    const from = e.headers?.from ?? e.from ?? "";
    return { from, to: e.to ?? [], subject: e.subject ?? "", date: e.created_at ?? new Date().toISOString(), text: e.text ?? null, html: e.html ?? null, attachments, tropLourdes, authentification: e.authentication ?? null, piecesRetenues };
  }
}

/** Hors Resend (tests, local) : l'enveloppe du webhook suffit, le corps est dit absent. */
export class EnveloppeSeule implements LecteurEmailRecu {
  lire(): Promise<EmailRecu | null> {
    return Promise.resolve(null);
  }
}

/**
 * En test (parcours e2e) : le prochain e-mail « relu » est celui déposé par la boîte de test
 * (`POST /v1/internal/test/email-recu`), corps et pièces jointes compris ; sans dépôt, l'enveloppe seule.
 */
export class LecteurEmailRecuDeTest implements LecteurEmailRecu {
  private prochain: Partial<EmailRecu> | null = null;

  deposer(email: Partial<EmailRecu>): void {
    this.prochain = email;
  }

  lire(): Promise<EmailRecu | null> {
    const e = this.prochain;
    this.prochain = null;
    if (!e) return Promise.resolve(null);
    // Comme Resend : une pièce dangereuse n'est jamais « téléchargée », seul son nom reste.
    const pieces = e.attachments ?? [];
    const retenues = pieces.filter((p) => pieceDangereuse(p.filename, p.contentType)).map((p) => p.filename);
    return Promise.resolve({ from: e.from ?? "", to: e.to ?? [], subject: e.subject ?? "", date: e.date ?? new Date().toISOString(), text: e.text ?? null, html: e.html ?? null, attachments: pieces.filter((p) => !retenues.includes(p.filename)), tropLourdes: e.tropLourdes ?? [], authentification: e.authentification ?? null, piecesRetenues: [...(e.piecesRetenues ?? []), ...retenues] });
  }
}

/** L'adresse nue d'un « Nom <adresse> ». */
export function adresseNue(s: string): string {
  return (/<([^>]+)>/.exec(s)?.[1] ?? s).trim().toLowerCase();
}

/** Le verdict d'un message relu (Greg, 22 novembre 2026) : authentification, pièces jointes, usurpation du domaine. */
export function verdictDuRecu(recu: EmailRecu, domaineApp: string | null): VerdictEntrant {
  const pieces = [...recu.attachments.map((p) => ({ nom: p.filename, type: p.contentType })), ...(recu.piecesRetenues ?? []).map((nom) => ({ nom }))];
  return verdictEntrant({ de: recu.from, authentification: recu.authentification ?? null, pieces, domaineApp });
}

/** Le texte d'un e-mail reçu (texte, sinon le HTML dépouillé de ses balises). */
export function texteRecu(recu: Pick<EmailRecu, "text" | "html">): string {
  return (
    recu.text ??
    (recu.html
      ? recu.html
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/p>/gi, "\n\n")
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .trim()
      : "(e-mail sans texte)")
  );
}

/**
 * Le renvoi d'un message externe (Greg, 22 novembre 2026 : « ne jamais habiller un message externe en Mobiiz ») :
 * le bandeau « Message externe, non vérifié par Mobiiz », l'expéditeur réel, l'objet préfixé « [Externe] », le texte
 * seul avec ses liens non cliquables, aucune page HTML de l'expéditeur, aucun logo (`externe`), seulement les pièces
 * jointes sûres. « Répondre » écrit à l'expéditeur réel.
 */
export function emailDeRenvoi(recu: EmailRecu, adresse: string, vers: string, verdict: VerdictEntrant = verdictDuRecu(recu, null)): TransactionalEmail {
  const verification = verdict.authentifie ? "Expéditeur authentifié par son domaine (DMARC)." : "Expéditeur non authentifié : méfie-toi des liens et des demandes de paiement.";
  const entete = [`${BANDEAU_EXTERNE}.`, verification, "", `De : ${recu.from}`, `À : ${adresse}`, `Reçu le : ${new Date(recu.date).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`, `Objet : ${recu.subject || "(sans objet)"}`];
  const lourdes = recu.tropLourdes.length ? [`Pièces jointes trop lourdes, à lire dans Resend : ${recu.tropLourdes.join(", ")}`] : [];
  const retenues = verdict.piecesBloquees.length ? [`Pièces jointes retenues (dangereuses) : ${verdict.piecesBloquees.join(", ")}`] : [];
  const expediteur = adresseNue(recu.from);
  const sures = recu.attachments.filter((p) => !verdict.piecesBloquees.includes(p.filename));
  return {
    to: vers,
    subject: objetExterne(recu.subject),
    text: [...entete, ...lourdes, ...retenues, "", liensDesactives(texteRecu(recu))].join("\n"),
    externe: true,
    ...(sures.length ? { attachments: sures } : {}),
    ...(expediteur.includes("@") ? { replyTo: expediteur } : {}),
    mustDeliver: true,
  };
}

/** Ce qu'il faut garder d'un message reçu sur contact@ (le journal des entrants, la liste de l'admin). */
export type JournalEntrant = (e: { adresse: string; recu: EmailRecu; verdict: VerdictEntrant; emailId: string | null }) => Promise<void>;

/** Le renvoi : rien si l'e-mail ne vise aucune adresse de contact, ou s'il vient de l'adresse qui reçoit (pas de boucle). */
export async function renvoyerContact(
  contact: { adresses: string[]; vers: string } | null,
  evenement: { email_id?: string; from?: string; to?: string[] | string; subject?: string; created_at?: string },
  lecteur: LecteurEmailRecu,
  envoi: TransactionalEmailSender,
  logger: AppLogger,
  domaineApp: string | null = null,
  journal: JournalEntrant = () => Promise.resolve(),
): Promise<{ traite: boolean; raison?: string } | null> {
  if (!contact) return null;
  const to = (Array.isArray(evenement.to) ? evenement.to : evenement.to ? [evenement.to] : []).map(adresseNue);
  const adresse = contact.adresses.find((a) => to.includes(a));
  if (!adresse) return null;
  if (adresseNue(evenement.from ?? "") === contact.vers) return { traite: false, raison: "boucle" };
  const lu = evenement.email_id ? await lecteur.lire(evenement.email_id) : null;
  const recu: EmailRecu = lu ?? {
    from: evenement.from ?? "",
    to,
    subject: evenement.subject ?? "",
    date: evenement.created_at ?? new Date().toISOString(),
    text: "(Le corps de l'e-mail n'a pas pu être relu : il est dans Resend, onglet Receiving.)",
    html: null,
    attachments: [],
    tropLourdes: [],
  };
  const verdict = verdictDuRecu(recu, domaineApp);
  await journal({ adresse, recu, verdict, emailId: evenement.email_id ?? null }).catch((err: unknown) => logger.warn({ err }, "contact: journal des entrants indisponible"));
  // Suspect : rien n'est renvoyé ; le message reste dans la liste de l'admin (Indésirables), avec sa raison.
  if (verdict.suspect) {
    logger.warn({ adresse, raisons: verdict.raisons }, "contact: e-mail suspect mis en indésirables");
    return { traite: true, raison: "indesirable" };
  }
  await envoi.send(emailDeRenvoi(recu, adresse, contact.vers, verdict));
  logger.info({ adresse }, "contact: e-mail renvoyé à l'admin");
  return { traite: true };
}
