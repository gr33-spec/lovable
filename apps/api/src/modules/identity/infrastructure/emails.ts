import type { TransactionalEmail } from "../../../platform/email/email.port.js";

/**
 * Gabarits des e-mails d'identité (français). À migrer dans le catalogue
 * i18n partagé lorsque celui-ci existera (phase 1, packages/i18n).
 */
export function verificationEmail(to: string, name: string, url: string): TransactionalEmail {
  return {
    to,
    subject: "Confirmez votre adresse e-mail",
    text: [
      `Bonjour ${name},`,
      "",
      "Pour confirmer votre adresse e-mail, ouvrez ce lien :",
      url,
      "",
      "Ce lien est valable 24 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
    ].join("\n"),
  };
}

export function resetPasswordEmail(to: string, name: string, url: string): TransactionalEmail {
  return {
    to,
    subject: "Réinitialisation de votre mot de passe",
    text: [
      `Bonjour ${name},`,
      "",
      "Pour choisir un nouveau mot de passe, ouvrez ce lien :",
      url,
      "",
      "Ce lien est valable 1 heure. Si vous n'avez rien demandé, ignorez ce message : votre mot de passe reste inchangé.",
    ].join("\n"),
  };
}
