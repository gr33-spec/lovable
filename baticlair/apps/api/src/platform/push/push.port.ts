/**
 * §48 : « Va boire un café, je te préviens quand c'est prêt. » Une notification envoyée par le serveur (Web Push) arrive
 * même application fermée ou écran verrouillé ; celle de la page seule ne part que si la page tourne encore.
 */
export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushMessage {
  title: string;
  body: string;
  /** Où le tap mène (chemin de l'application). */
  url: string;
  /** Même étiquette = une seule notification (celle de la page et celle du serveur se remplacent). */
  tag: string;
}

export interface PushSender {
  /** Clé publique (VAPID, base64url) que le navigateur reçoit pour s'abonner. */
  readonly publicKey: string;
  /** « gone » : l'abonnement n'existe plus chez le navigateur, on l'oublie. */
  send(target: PushTarget, message: PushMessage): Promise<"sent" | "gone" | "failed">;
}
