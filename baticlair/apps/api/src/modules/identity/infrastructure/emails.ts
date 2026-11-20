import type { TransactionalEmail } from "../../../platform/email/email.port.js";

/**
 * Gabarits des e-mails d'identité (français, tutoiement comme le reste de l'app ; test complet du 21 octobre 2026). À migrer dans le catalogue
 * i18n partagé lorsque celui-ci existera (phase 1, packages/i18n).
 */
/** « Bonjour Jean, », ou « Bonjour, » pour un compte du nouvel onboarding (aucun nom demandé). */
const bonjour = (name: string | null | undefined) => (name?.trim() ? `Bonjour ${name.trim()},` : "Bonjour,");

/**
 * LE LIEN DE CONNEXION (Greg, 19 novembre 2026) : la façon normale de se reconnecter sans mot de passe. Un lien à usage
 * unique, valable 15 minutes.
 */
export function magicLinkEmail(to: string, url: string): TransactionalEmail {
  return {
    to,
    subject: "Ton lien de connexion Mobiiz",
    text: [
      "Bonjour,",
      "",
      "Pour te connecter à Mobiiz, ouvre ce lien :",
      url,
      "",
      "Il est valable 15 minutes et ne sert qu'une fois. Si tu n'as rien demandé, ignore ce message : personne ne peut se connecter sans ce lien.",
    ].join("\n"),
  };
}

export function verificationEmail(to: string, name: string, url: string): TransactionalEmail {
  return {
    to,
    subject: "Confirme ton adresse e-mail",
    text: [
      bonjour(name),
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
      bonjour(name),
      "",
      "Pour choisir un nouveau mot de passe, ouvre ce lien :",
      url,
      "",
      "Ce lien est valable 1 heure. Si tu n'as rien demandé, ignore ce message : ton mot de passe reste inchangé.",
    ].join("\n"),
  };
}
