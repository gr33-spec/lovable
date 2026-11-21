/** Ce que le reste de l'application sait de l'utilisateur connecté. */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  emailVerified: boolean;
  /** La session de connexion (la double authentification de l'admin lui est attachée) ; absente pour une clé API. */
  sessionId?: string;
}
