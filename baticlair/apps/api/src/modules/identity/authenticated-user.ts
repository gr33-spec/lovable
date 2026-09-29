/** Ce que le reste de l'application sait de l'utilisateur connecté. */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  emailVerified: boolean;
}
