import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, list, put } from "@vercel/blob";

import type { StockagePhotos } from "../application/stockage.port.js";

export type { StockagePhotos };

/** Les adaptateurs du stockage des photos (le contrat est dans `application/stockage.port.ts`). */
export class StockageBlob implements StockagePhotos {
  readonly actif = true;
  constructor(private readonly jeton: string) {}

  /**
   * Le fichier vit sur le CDN de Vercel Blob, mais la page le lit sur SON domaine : `/photos/<chemin>` est réécrit par le
   * site vers le store (`PHOTOS_BLOB_URL` du projet web, `next.config.ts`). La CSP reste « rien d'ailleurs ».
   */
  async deposer(cle: string, octets: Buffer, type: string): Promise<{ adresse: string; cle: string }> {
    const r = await put(cle, octets, { access: "public", contentType: type, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 31_536_000, token: this.jeton });
    return { adresse: `/photos/${cle.replace(/^pages\//, "")}`, cle: r.url };
  }

  async supprimer(cles: string[]): Promise<void> {
    if (cles.length === 0) return;
    // Vercel Blob accepte les chemins ou les adresses ; on garde les adresses (`cles` de la photo).
    await del(cles, { token: this.jeton });
  }

  async lister(prefixe: string): Promise<{ cle: string; url: string }[]> {
    const tout: { cle: string; url: string }[] = [];
    let cursor: string | undefined;
    do {
      const r = await list({ prefix: prefixe, cursor, limit: 1000, token: this.jeton });
      tout.push(...r.blobs.map((b) => ({ cle: b.pathname, url: b.url })));
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
    return tout;
  }
}

/** Le dossier local (développement, tests) : les fichiers sont servis par `GET /v1/public/fichiers-pages/<cle>`. */
export class StockageLocal implements StockagePhotos {
  readonly actif = true;
  constructor(
    private readonly dossier: string,
    private readonly adressePublique: string,
  ) {}

  private chemin(cle: string): string {
    const propre = path.posix.normalize(cle).replace(/^(\.\.\/)+/, "");
    if (propre.startsWith("/") || propre.includes("..")) throw new Error("clé invalide");
    return path.join(this.dossier, propre);
  }

  async deposer(cle: string, octets: Buffer): Promise<{ adresse: string; cle: string }> {
    const f = this.chemin(cle);
    await mkdir(path.dirname(f), { recursive: true });
    await writeFile(f, octets);
    const adresse = `${this.adressePublique.replace(/\/$/, "")}/v1/public/fichiers-pages/${cle}`;
    return { adresse, cle: adresse };
  }

  async supprimer(cles: string[]): Promise<void> {
    await Promise.all(cles.map((c) => rm(this.chemin(c.replace(/^.*\/v1\/public\/fichiers-pages\//, "")), { force: true })));
  }

  async lister(prefixe: string): Promise<{ cle: string; url: string }[]> {
    const racine = this.chemin(prefixe.replace(/\/$/, ""));
    const fichiers = await readdir(racine, { recursive: true, withFileTypes: true }).catch(() => []);
    return fichiers
      .filter((f) => f.isFile())
      .map((f) => {
        const cle = path.posix.join(prefixe.replace(/\/$/, ""), path.relative(racine, path.join(f.parentPath, f.name)).split(path.sep).join("/"));
        return { cle, url: `${this.adressePublique.replace(/\/$/, "")}/v1/public/fichiers-pages/${cle}` };
      });
  }

  lire(cle: string): Promise<Buffer> {
    return readFile(this.chemin(cle));
  }
}

export class StockageCoupe implements StockagePhotos {
  readonly actif = false;
  deposer(): Promise<{ adresse: string; cle: string }> {
    return Promise.reject(new Error("stockage des photos coupé"));
  }
  async supprimer(): Promise<void> {}
  async lister(): Promise<{ cle: string; url: string }[]> {
    return [];
  }
}
