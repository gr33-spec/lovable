import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { appSecret } from "./env";

// Primitives cryptographiques de l'application (bibliothèque standard de
// Node.js uniquement : aucune dépendance supplémentaire à auditer).

/** Jeton aléatoire non devinable (256 bits), sûr dans une URL. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function derivedKey(purpose: string): Buffer {
  return createHmac("sha256", appSecret()).update(`boutique|${purpose}`).digest();
}

/** Empreinte d'un jeton pour stockage : la base ne contient jamais le jeton lui-même. */
export function tokenHash(token: string, purpose: string): string {
  return createHmac("sha256", derivedKey(`hash|${purpose}`)).update(token).digest("hex");
}

/** Chiffrement authentifié (AES-256-GCM) d'une petite valeur secrète. */
export function encrypt(plain: string, purpose: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", derivedKey(`enc|${purpose}`), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decrypt(payload: string, purpose: string): string {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Donnée chiffrée invalide");
  const decipher = createDecipheriv("aes-256-gcm", derivedKey(`enc|${purpose}`), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

/** Valeur signée à durée de vie courte (ex. étape « code à 6 chiffres » de la connexion). */
export function signShortLived(value: string, purpose: string, ttlMs: number, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ v: value, exp: now + ttlMs })).toString("base64url");
  const sig = createHmac("sha256", derivedKey(`sig|${purpose}`)).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readShortLived(token: string | undefined, purpose: string, now = Date.now()): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", derivedKey(`sig|${purpose}`)).update(payload).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const { v, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof v === "string" && typeof exp === "number" && exp > now ? v : null;
  } catch {
    return null;
  }
}

// ───────────── Mots de passe (scrypt, sel aléatoire, paramètres versionnés) ─────────────

const SCRYPT = { N: 1 << 15, r: 8, p: 1, keylen: 64, maxmem: 64 * 1024 * 1024 };

function scryptAsync(password: string, salt: Buffer, params = SCRYPT): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, params.keylen, { N: params.N, r: params.r, p: params.p, maxmem: params.maxmem }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, key] = stored.split("$");
  if (algo !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64url");
  const actual = await scryptAsync(password, Buffer.from(salt, "base64url"), {
    ...SCRYPT,
    N: Number(n),
    r: Number(r),
    p: Number(p),
    keylen: expected.length,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Hachage factice pour que « compte inconnu » prenne autant de temps que « mauvais mot de passe ». */
let dummyHash: Promise<string> | undefined;
export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword(randomToken());
  return dummyHash;
}

// ───────────── Double authentification (TOTP, RFC 6238) ─────────────

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | BASE32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function newTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function totpCode(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 15;
  const bin = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(bin % 1_000_000).padStart(6, "0");
}

/**
 * Vérifie un code à 6 chiffres (tolérance ±30 s). Renvoie le pas utilisé, à
 * mémoriser : un code déjà utilisé ne peut pas être rejoué.
 */
export function verifyTotp(secret: string, code: string, lastStep: number | null, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const current = Math.floor(now / 30_000);
  for (const step of [current - 1, current, current + 1]) {
    if (lastStep !== null && step <= lastStep) continue;
    const expected = Buffer.from(totpCode(secret, step));
    if (timingSafeEqual(expected, Buffer.from(code))) return step;
  }
  return null;
}
