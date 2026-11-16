import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";

import type { StockagePhotos } from "../application/stockage.port.js";

export type { StockagePhotos };

/** Les adaptateurs du stockage des photos (le contrat est dans `application/stockage.port.ts`). */
export class StockageBlob implements StockagePhotos {
  readonly actif = true;
  constructor(private readonly jeton: string) {}

  async deposer(cle: string, octets: Buffer, type: string): Promise<string> {
    const r = await put(cle, octets, { access: "public", contentType: type, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 31_536_000, token: this.jeton });
    return r.url;
  }

  async supprimer(cles: string[]): Promise<void> {
    if (cles.length === 0) return;
    // Vercel Blob accepte les chemins ou les adresses ; on garde les adresses (`cles` de la photo).
    await del(cles, { token: this.jeton });
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

  async deposer(cle: string, octets: Buffer): Promise<string> {
    const f = this.chemin(cle);
    await mkdir(path.dirname(f), { recursive: true });
    await writeFile(f, octets);
    return `${this.adressePublique.replace(/\/$/, "")}/v1/public/fichiers-pages/${cle}`;
  }

  async supprimer(cles: string[]): Promise<void> {
    await Promise.all(cles.map((c) => rm(this.chemin(c.replace(/^.*\/v1\/public\/fichiers-pages\//, "")), { force: true })));
  }

  lire(cle: string): Promise<Buffer> {
    return readFile(this.chemin(cle));
  }
}

export class StockageCoupe implements StockagePhotos {
  readonly actif = false;
  deposer(): Promise<string> {
    return Promise.reject(new Error("stockage des photos coupé"));
  }
  async supprimer(): Promise<void> {}
}
