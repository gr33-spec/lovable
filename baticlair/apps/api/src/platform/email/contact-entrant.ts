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
    const e = (await res.json()) as { from?: string; to?: string[]; subject?: string; created_at?: string; text?: string | null; html?: string | null };
    const attachments: EmailRecu["attachments"] = [];
    const tropLourdes: string[] = [];
    const liste = await this.fetchImpl(`https://api.resend.com/emails/receiving/${id}/attachments`, { headers: auth, signal: AbortSignal.timeout(10_000) });
    if (liste.ok) {
      const pieces = ((await liste.json()) as { data?: { filename?: string; content_type?: string; size?: number; download_url?: string }[] }).data ?? [];
      let total = 0;
      for (const p of pieces) {
        const nom = p.filename ?? "piece-jointe";
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
    return { from: e.from ?? "", to: e.to ?? [], subject: e.subject ?? "", date: e.created_at ?? new Date().toISOString(), text: e.text ?? null, html: e.html ?? null, attachments, tropLourdes };
  }
}

/** Hors Resend (tests, local) : l'enveloppe du webhook suffit, le corps est dit absent. */
export class EnveloppeSeule implements LecteurEmailRecu {
  lire(): Promise<EmailRecu | null> {
    return Promise.resolve(null);
  }
}

/** L'adresse nue d'un « Nom <adresse> ». */
export function adresseNue(s: string): string {
  return (/<([^>]+)>/.exec(s)?.[1] ?? s).trim().toLowerCase();
}

const echapper = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** L'e-mail de renvoi : l'en-tête d'origine, puis le corps tel que reçu ; « Répondre » écrit à l'expéditeur. */
export function emailDeRenvoi(recu: EmailRecu, adresse: string, vers: string): TransactionalEmail {
  const entete = [`De : ${recu.from}`, `À : ${adresse}`, `Reçu le : ${new Date(recu.date).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`, `Objet : ${recu.subject || "(sans objet)"}`];
  const lourdes = recu.tropLourdes.length ? [`Pièces jointes trop lourdes, à lire dans Resend : ${recu.tropLourdes.join(", ")}`] : [];
  const corps = recu.text ?? (recu.html ? recu.html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim() : "(e-mail sans texte)");
  const expediteur = adresseNue(recu.from);
  return {
    to: vers,
    subject: `[${adresse}] ${recu.subject || "(sans objet)"}`,
    text: [...entete, ...lourdes, "", corps].join("\n"),
    ...(recu.html ? { html: `<div style="font:13px sans-serif;color:#555;border-bottom:1px solid #ddd;padding-bottom:8px;margin-bottom:12px">${[...entete, ...lourdes].map(echapper).join("<br>")}</div>${recu.html}` } : {}),
    ...(recu.attachments.length ? { attachments: recu.attachments } : {}),
    ...(expediteur.includes("@") ? { replyTo: expediteur } : {}),
    mustDeliver: true,
  };
}

/** Le renvoi : rien si l'e-mail ne vise aucune adresse de contact, ou s'il vient de l'adresse qui reçoit (pas de boucle). */
export async function renvoyerContact(
  contact: { adresses: string[]; vers: string } | null,
  evenement: { email_id?: string; from?: string; to?: string[] | string; subject?: string; created_at?: string },
  lecteur: LecteurEmailRecu,
  envoi: TransactionalEmailSender,
  logger: AppLogger,
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
  await envoi.send(emailDeRenvoi(recu, adresse, contact.vers));
  logger.info({ adresse }, "contact: e-mail renvoyé à l'admin");
  return { traite: true };
}
