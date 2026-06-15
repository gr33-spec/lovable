import "server-only";

const EMAIL_FROM = process.env.EMAIL_FROM ?? "BatiClair <connexion@baticlair.fr>";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

/**
 * Envoie un e-mail via Resend. Renvoie `false` si RESEND_API_KEY n'est pas
 * configurée (dev sans infra e-mail) : l'appelant doit alors logger le
 * contenu lui-même.
 */
export async function sendEmail({ to, subject, html, text, replyTo }: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`Échec de l'envoi de l'e-mail : ${await res.text()}`);
  }

  return true;
}
