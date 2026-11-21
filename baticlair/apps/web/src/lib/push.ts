import { api } from "@/lib/api";

/**
 * §48 : « VA BOIRE UN CAFÉ, JE TE PRÉVIENS » (retour de Greg : rien n'arrivait). Une page sur un téléphone verrouillé
 * dort : elle ne peut pas prévenir. Cet appareil s'abonne donc aux notifications DU SERVEUR (Web Push), qui prévient
 * quand la lecture ou le calcul finit, application fermée comprise. Sur iPhone, il faut BatiClair sur l'écran d'accueil.
 */
export type PushSupport = "ok" | "iphone-browser" | "unsupported";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") return ios && !standalone ? "iphone-browser" : "unsupported";
  return "ok";
}

/** Abonne cet appareil (si l'artisan a déjà dit oui aux notifications) ; sans bruit si ce n'est pas possible. */
export async function ensurePush(): Promise<boolean> {
  if (pushSupport() !== "ok" || Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const { publicKey } = await api<{ publicKey: string }>("/v1/me/notifications/push-key");
    let sub = await reg.pushManager.getSubscription();
    // Une clé du serveur qui a changé : l'ancien abonnement ne sert plus.
    if (sub && keyOf(sub) !== publicKey) {
      await sub.unsubscribe().catch(() => undefined);
      sub = null;
    }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromBase64Url(publicKey) });
    await api("/v1/me/notifications/push", { method: "POST", body: sub.toJSON() });
    return true;
  } catch {
    return false;
  }
}

/** « Me prévenir » : demande l'autorisation (au tap, c'est la règle des navigateurs), puis abonne l'appareil. */
export async function askPush(): Promise<boolean> {
  if (pushSupport() !== "ok") return false;
  if (Notification.permission === "default") await Notification.requestPermission();
  return ensurePush();
}

function keyOf(sub: PushSubscription): string | null {
  const key = sub.options?.applicationServerKey;
  if (!key) return null;
  const bytes = new Uint8Array(key);
  let raw = "";
  for (const b of bytes) raw += String.fromCharCode(b);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "=");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
