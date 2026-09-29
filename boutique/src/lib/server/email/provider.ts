import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { isProduction } from "../env";

// Envoi d'e-mails : une interface, deux implémentations. Changer de
// prestataire (Brevo, Postmark, SMTP…) = écrire un nouveau `send`.

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

const resend = (apiKey: string, from: string): EmailProvider => ({
  name: "resend",
  async send(m) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [m.to], subject: m.subject, html: m.html, text: m.text, reply_to: m.replyTo || undefined }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 200);
      throw new Error(`Resend a refusé l'envoi (${res.status}) ${detail}`);
    }
  },
});

/** Développement : les e-mails sont écrits dans .data/emails/ (consultables dans un navigateur). */
const devOutbox: EmailProvider = {
  name: "dev",
  async send(m) {
    const dir = path.join(process.cwd(), ".data", "emails");
    await mkdir(dir, { recursive: true });
    const safe = m.subject.replace(/[^a-z0-9]+/gi, "-").slice(0, 40);
    await writeFile(path.join(dir, `${Date.now()}-${safe}.html`), `<!-- À : ${m.to} -->\n${m.html}`);
    sent.push(m);
  },
};

/** Messages envoyés en développement / tests (inspection). */
export const sent: EmailMessage[] = [];

let override: EmailProvider | undefined;
export function setEmailProviderForTests(p: EmailProvider | undefined) {
  override = p;
}

export function emailProvider(): EmailProvider {
  if (override) return override;
  if (process.env.EMAIL_PROVIDER === "resend") {
    const key = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!key || !from) throw new Error("RESEND_API_KEY / EMAIL_FROM manquants");
    return resend(key, from);
  }
  if (isProduction()) throw new Error("Aucun service d'e-mail configuré en production (EMAIL_PROVIDER=resend).");
  return devOutbox;
}
