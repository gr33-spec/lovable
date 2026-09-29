import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Stockage des fichiers. Deux espaces bien séparés :
//  - public : photos des produits et de la marque (servies par CDN) ;
//  - privé  : sauvegardes et exports (jamais accessibles par une URL publique).
// Les chemins sont toujours construits par le serveur à partir d'identifiants
// (jamais à partir d'un nom de fichier fourni par l'utilisateur).

export type Visibility = "public" | "private";

interface StorageDriver {
  put(visibility: Visibility, key: string, body: Buffer, contentType: string): Promise<void>;
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
  return {
    async put(visibility, key, body, contentType) {
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

let driver: StorageDriver | undefined;
function current(): StorageDriver {
  driver ??= process.env.STORAGE_DRIVER === "supabase" ? supabaseDriver() : localDriver;
  return driver;
}

export async function putFile(visibility: Visibility, key: string, body: Buffer, contentType: string) {
  assertKey(key);
  await current().put(visibility, key, body, contentType);
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
  if (process.env.STORAGE_DRIVER !== "supabase" || !process.env.SUPABASE_URL) return null;
  return new URL(process.env.SUPABASE_URL).origin;
}
