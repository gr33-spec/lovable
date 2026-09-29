import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { del as blobDel, get as blobGet, put as blobPut } from "@vercel/blob";

// Stockage des fichiers. Deux espaces bien séparés :
//  - public : photos des produits et de la marque (servies par CDN) ;
//  - privé  : sauvegardes et exports (jamais accessibles par une URL publique).
// Les chemins sont toujours construits par le serveur à partir d'identifiants
// (jamais à partir d'un nom de fichier fourni par l'utilisateur).

export type Visibility = "public" | "private";

interface StorageDriver {
  /** Renvoie l'adresse publique du fichier quand le stockage la choisit lui-même. */
  put(visibility: Visibility, key: string, body: Buffer, contentType: string): Promise<string | void>;
  get(visibility: Visibility, key: string): Promise<Buffer | null>;
  remove(visibility: Visibility, keys: string[]): Promise<void>;
  publicUrl(key: string): string;
}

const SAFE_KEY = /^[a-z0-9][a-z0-9/_.-]{0,200}$/;

function assertKey(key: string) {
  if (!SAFE_KEY.test(key) || key.includes("..") || key.includes("//")) throw new Error("Chemin de fichier refusé");
}

// ───────── Local (développement) : fichiers dans .data/, servis par /media ─────────

const LOCAL_ROOT = path.join(process.cwd(), ".data", "storage");

const localDriver: StorageDriver = {
  async put(visibility, key, body) {
    const file = path.join(LOCAL_ROOT, visibility, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
  },
  async get(visibility, key) {
    try {
      return await readFile(path.join(LOCAL_ROOT, visibility, key));
    } catch {
      return null;
    }
  },
  async remove(visibility, keys) {
    await Promise.all(keys.map((k) => rm(path.join(LOCAL_ROOT, visibility, k), { force: true })));
  },
  publicUrl(key) {
    return `/media/${key}`;
  },
};

// ───────── Supabase Storage (production), via son API REST ─────────

function supabaseDriver(): StorageDriver {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!/^https:\/\//.test(base) || !serviceKey) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants pour le stockage.");
  const bucket = (v: Visibility) => (v === "public" ? process.env.SUPABASE_PUBLIC_BUCKET || "boutique-public" : process.env.SUPABASE_PRIVATE_BUCKET || "boutique-prive");
  const auth = { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey };
  // Les deux espaces sont créés automatiquement au premier envoi (public : photos ; privé : sauvegardes).
  const ensured = new Set<Visibility>();
  async function ensureBucket(visibility: Visibility) {
    if (ensured.has(visibility)) return;
    const res = await fetch(`${base}/storage/v1/bucket`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        id: bucket(visibility),
        name: bucket(visibility),
        public: visibility === "public",
        ...(visibility === "public" ? { allowed_mime_types: ["image/webp", "image/jpeg"], file_size_limit: 5 * 1024 * 1024 } : {}),
      }),
    });
    // 200 : créé ; 400/409 : existe déjà.
    if (res.ok || res.status === 400 || res.status === 409) ensured.add(visibility);
  }
  return {
    async put(visibility, key, body, contentType) {
      await ensureBucket(visibility);
      const res = await fetch(`${base}/storage/v1/object/${bucket(visibility)}/${key}`, {
        method: "POST",
        headers: {
          ...auth,
          "Content-Type": contentType,
          // Les fichiers publics ne changent jamais (nouvelle photo = nouvel identifiant).
          "Cache-Control": visibility === "public" ? "max-age=31536000, immutable" : "no-store",
          "x-upsert": "true",
        },
        body: new Uint8Array(body),
      });
      if (!res.ok) throw new Error(`Stockage : envoi refusé (${res.status})`);
    },
    async get(visibility, key) {
      const res = await fetch(`${base}/storage/v1/object/${bucket(visibility)}/${key}`, { headers: auth });
      if (res.status === 404 || res.status === 400) return null;
      if (!res.ok) throw new Error(`Stockage : lecture refusée (${res.status})`);
      return Buffer.from(await res.arrayBuffer());
    },
    async remove(visibility, keys) {
      if (!keys.length) return;
      const res = await fetch(`${base}/storage/v1/object/${bucket(visibility)}`, {
        method: "DELETE",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: keys }),
      });
      if (!res.ok) throw new Error(`Stockage : suppression refusée (${res.status})`);
    },
    publicUrl(key) {
      return `${base}/storage/v1/object/public/${bucket("public")}/${key}`;
    },
  };
}

// ───────── Vercel Blob (tout se configure depuis Vercel, en un clic) ─────────
// Photos : magasin PUBLIC (BLOB_READ_WRITE_TOKEN). Sauvegardes : magasin PRIVÉ
// distinct et facultatif (BLOB_PRIVATE_READ_WRITE_TOKEN) — jamais de fichier
// confidentiel dans le magasin public.

/**
 * Jeton du magasin public. Vercel le nomme BLOB_READ_WRITE_TOKEN par défaut,
 * mais un autre préfixe peut être choisi en reliant le magasin (ex.
 * STORAGE_READ_WRITE_TOKEN) : on le reconnaît alors à sa forme.
 */
export function publicBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith("_READ_WRITE_TOKEN") && key !== "BLOB_PRIVATE_READ_WRITE_TOKEN" && value?.startsWith("vercel_blob_rw_")) return value;
  }
  return undefined;
}

class PrivateStorageMissing extends Error {
  constructor() {
    super("Stockage privé non configuré (BLOB_PRIVATE_READ_WRITE_TOKEN).");
  }
}

function blobDriver(): StorageDriver {
  const publicToken = publicBlobToken();
  if (!publicToken) throw new Error("BLOB_READ_WRITE_TOKEN manquant.");
  const token = (v: Visibility) => {
    const t = v === "public" ? publicToken : process.env.BLOB_PRIVATE_READ_WRITE_TOKEN;
    if (!t) throw new PrivateStorageMissing();
    return t;
  };
  return {
    async put(visibility, key, body, contentType) {
      const res = await blobPut(key, body, {
        access: visibility,
        token: token(visibility),
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: visibility === "public" ? 31_536_000 : 60,
      });
      return res.url;
    },
    async get(visibility, key) {
      const res = await blobGet(key, { access: visibility, token: token(visibility) });
      if (!res || res.statusCode !== 200 || !res.stream) return null;
      return Buffer.from(await new Response(res.stream).arrayBuffer());
    },
    async remove(visibility, keys) {
      if (keys.length) await blobDel(keys, { token: token(visibility) });
    },
    publicUrl() {
      // Avec Vercel Blob, l'adresse est enregistrée au moment de l'envoi (colonne image.base_url).
      throw new Error("Adresse publique inconnue : utiliser l'adresse enregistrée");
    },
  };
}

export function storageDriverName(): "blob" | "supabase" | "local" {
  const explicit = process.env.STORAGE_DRIVER;
  if (explicit === "blob" || explicit === "supabase" || explicit === "local") return explicit;
  if (publicBlobToken()) return "blob";
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return "supabase";
  return "local";
}

export function isPrivateStorageMissing(err: unknown): boolean {
  return err instanceof PrivateStorageMissing;
}

let driver: StorageDriver | undefined;
function current(): StorageDriver {
  if (!driver) {
    const name = storageDriverName();
    if (name === "local" && process.env.VERCEL) throw new Error("Aucun stockage de photos configuré (Vercel → Storage → Blob).");
    driver = name === "blob" ? blobDriver() : name === "supabase" ? supabaseDriver() : localDriver;
  }
  return driver;
}

export async function putFile(visibility: Visibility, key: string, body: Buffer, contentType: string): Promise<string> {
  assertKey(key);
  const url = await current().put(visibility, key, body, contentType);
  return url || (visibility === "public" ? current().publicUrl(key) : key);
}

export async function getFile(visibility: Visibility, key: string) {
  assertKey(key);
  return current().get(visibility, key);
}

export async function removeFiles(visibility: Visibility, keys: string[]) {
  keys.forEach(assertKey);
  await current().remove(visibility, keys);
}

/** URL publique d'un fichier public. Utilisable côté serveur uniquement. */
export function publicFileUrl(key: string): string {
  assertKey(key);
  return current().publicUrl(key);
}

/** Origine des images (pour la politique de sécurité du contenu). */
export function mediaOrigin(): string | null {
  if (storageDriverName() !== "supabase" || !process.env.SUPABASE_URL) return null;
  return new URL(process.env.SUPABASE_URL).origin;
}
