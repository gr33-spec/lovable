import webpush from "web-push";
import type { AppLogger } from "../logging/logger.js";
import type { PushMessage, PushSender, PushTarget } from "./push.port.js";
import { vapidKeysFrom } from "./vapid.js";

/** Web Push réel (Chrome, Firefox, Safari et iPhone avec BatiClair sur l'écran d'accueil). */
export class WebPushSender implements PushSender {
  readonly publicKey: string;
  private readonly privateKey: string;

  constructor(
    secret: string,
    /** Qui envoie (exigé par les services de notification) : l'adresse https de l'application. */
    private readonly subject: string,
    private readonly logger: AppLogger,
  ) {
    const keys = vapidKeysFrom(secret);
    this.publicKey = keys.publicKey;
    this.privateKey = keys.privateKey;
  }

  async send(target: PushTarget, message: PushMessage): Promise<"sent" | "gone" | "failed"> {
    try {
      await webpush.sendNotification({ endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } }, JSON.stringify(message), {
        vapidDetails: { subject: this.subject, publicKey: this.publicKey, privateKey: this.privateKey },
        TTL: 60 * 60,
        urgency: "high",
        topic: message.tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || undefined,
      });
      return "sent";
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) return "gone";
      this.logger.warn({ status }, "push: notification non envoyée");
      return "failed";
    }
  }
}

/** Tests : les notifications sont gardées en mémoire. */
export class CapturingPushSender implements PushSender {
  readonly publicKey: string;
  readonly sent: { target: PushTarget; message: PushMessage }[] = [];
  constructor(secret: string) {
    this.publicKey = vapidKeysFrom(secret).publicKey;
  }
  async send(target: PushTarget, message: PushMessage): Promise<"sent"> {
    this.sent.push({ target, message });
    return "sent";
  }
}
