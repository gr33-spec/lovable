import type { TransactionalEmail } from "../../../platform/email/email.port.js";

/**
 * Gabarits des e-mails d'identité (français, tutoiement comme le reste de l'app ; test complet du 21 octobre 2026). À migrer dans le catalogue
 * i18n partagé lorsque celui-ci existera (phase 1, packages/i18n).
 */
export function verificationEmail(to: string, name: string, url: string): TransactionalEmail {
  return {
    to,
    subject: "Confirme ton adresse e-mail",
    text: [
      `Bonjour ${name},`,
      "",
      "Pour confirmer ton adresse e-mail, ouvre ce lien :",
      url,
      "",
      "Ce lien est valable 24 heures. Si tu n'es pas à l'origine de cette demande, ignore ce message.",
    ].join("\n"),
  };
}

export function resetPasswordEmail(to: string, name: string, url: string): TransactionalEmail {
  return {
    to,
    subject: "Ton nouveau mot de passe",
    text: [
      `Bonjour ${name},`,
      "",
      "Pour choisir un nouveau mot de passe, ouvre ce lien :",
      url,
      "",
      "Ce lien est valable 1 heure. Si tu n'as rien demandé, ignore ce message : ton mot de passe reste inchangé.",
    ].join("\n"),
  };
}
