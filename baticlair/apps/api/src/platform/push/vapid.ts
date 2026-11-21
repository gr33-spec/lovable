import { createECDH, hkdfSync } from "node:crypto";

/** Ordre de la courbe P-256 : une clé privée est un entier dans [1, n - 1]. */
const P256_ORDER = BigInt("0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551");

/**
 * Les clés VAPID (Web Push) TIRÉES DU SECRET DE L'APPLICATION (AUTH_SECRET) : aucune clé de plus à créer ni à coller
 * en ligne. Mêmes clés à chaque démarrage, donc les abonnements tiennent ; changer AUTH_SECRET les renouvelle (les
 * téléphones se réabonnent à la prochaine attente).
 */
export function vapidKeysFrom(secret: string): { publicKey: string; privateKey: string } {
  for (let i = 0; i < 16; i++) {
    const raw = Buffer.from(hkdfSync("sha256", secret, "baticlair-web-push", `vapid-p256-${i}`, 32));
    const n = BigInt(`0x${raw.toString("hex")}`);
    if (n === 0n || n >= P256_ORDER) continue;
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(raw);
    return { publicKey: ecdh.getPublicKey().toString("base64url"), privateKey: raw.toString("base64url") };
  }
  throw new Error("vapid: aucune clé valide");
}
