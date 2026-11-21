/**
 * Port d'envoi d'e-mails transactionnels (vérification, mot de passe…).
 * Adapters : Resend (réel), désactivé (en ligne sans clé), console (dev),
 * capture (tests). Changer de prestataire = écrire un adapter.
 */
export interface TransactionalEmail {
  to: string;
  subject: string;
  text: string;
  /** Le même corps en HTML quand une mise en forme compte (la phrase de commission en gras, parcours groupé) ; le texte reste la référence. */
  html?: string;
  /** Pièces jointes (le PDF de commande fournisseur, §43) : contenu en base64. */
  attachments?: { filename: string; contentType: string; contentBase64: string }[];
  /** Adresse de réponse : « Répondre » écrit à l'artisan, pas à l'adresse d'envoi de BatiClair. */
  replyTo?: string;
  /**
   * Le mail DOIT partir (une demande au fournisseur) : un refus ou une panne du prestataire lève `email_not_sent`, au lieu
   * d'être seulement journalisé comme pour un mail de compte (inscription, mot de passe), qu'on peut redemander.
   */
  mustDeliver?: boolean;
  /** En-têtes ajoutés par la mise en page (List-Unsubscribe). */
  headers?: Record<string, string>;
  /**
   * R7 : l'expéditeur de cet e-mail quand il n'est pas celui de l'application (« Toitures Martin via Mobiiz
   * <toitures-martin@mobiiz.fr> », une demande de prix). Toujours sur le domaine de l'application.
   */
  from?: string;
}

export interface TransactionalEmailSender {
  send(email: TransactionalEmail): Promise<void>;
}

/** Indique si des e-mails partent réellement (l'interface l'affiche honnêtement). */
export interface EmailCapability {
  readonly deliversEmail: boolean;
}
