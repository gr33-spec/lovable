/**
 * Port d'envoi d'e-mails transactionnels (vérification, mot de passe…).
 * Adapters actuels : développement uniquement (console, capture).
 * Un adapter réel (Resend, Brevo, Postmark…) sera ajouté avant tout
 * déploiement — la configuration refuse de démarrer sans lui hors dev.
 */
export interface TransactionalEmail {
  to: string;
  subject: string;
  text: string;
}

export interface TransactionalEmailSender {
  send(email: TransactionalEmail): Promise<void>;
}
