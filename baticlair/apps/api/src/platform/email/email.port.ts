/**
 * Port d'envoi d'e-mails transactionnels (vérification, mot de passe…).
 * Adapters : Resend (réel), désactivé (en ligne sans clé), console (dev),
 * capture (tests). Changer de prestataire = écrire un adapter.
 */
export interface TransactionalEmail {
  to: string;
  subject: string;
  text: string;
}

export interface TransactionalEmailSender {
  send(email: TransactionalEmail): Promise<void>;
}

/** Indique si des e-mails partent réellement (l'interface l'affiche honnêtement). */
export interface EmailCapability {
  readonly deliversEmail: boolean;
}
