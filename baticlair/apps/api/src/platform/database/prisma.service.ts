import type { OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";
import { Chiffreur, estChiffre } from "../chiffrement/chiffreur.js";

/** Les écritures qui portent des données (`data`, `create`, `update`). */
const ECRITURES = new Set(["create", "createMany", "createManyAndReturn", "update", "updateMany", "updateManyAndReturn", "upsert"]);

/** Un objet simple (ni date, ni décimal, ni valeur spéciale de Prisma) : le seul dans lequel on descend. */
const estSimple = (v: unknown): v is Record<string, unknown> => {
  if (typeof v !== "object" || v === null) return false;
  const p = Object.getPrototypeOf(v) as unknown;
  return p === Object.prototype || p === null;
};

/**
 * Rend la valeur avec chaque suite d'octets remplacée par `f(octets)`, sans toucher à l'original. Les seules colonnes
 * d'octets du schéma sont des fichiers (devis, PDF, pièces jointes, logos, captures) : tout ce qui est octets est un fichier.
 */
function surLesOctets<T>(v: T, f: (o: Uint8Array) => Uint8Array): T {
  if (v instanceof Uint8Array) return f(v) as T;
  if (Array.isArray(v)) {
    let copie: unknown[] | null = null;
    for (let i = 0; i < v.length; i++) {
      const n = surLesOctets(v[i] as unknown, f);
      if (n !== v[i]) (copie ??= [...(v as unknown[])])[i] = n;
    }
    return (copie ?? v) as T;
  }
  if (estSimple(v)) {
    let copie: Record<string, unknown> | null = null;
    for (const k of Object.keys(v)) {
      const n = surLesOctets(v[k], f);
      if (n !== v[k]) (copie ??= { ...v })[k] = n;
    }
    return (copie ?? v) as T;
  }
  return v;
}

/**
 * Client Prisma unique. Utilisé uniquement dans les couches infrastructure.
 *
 * LES FICHIERS CHIFFRÉS AU REPOS (lot B, Greg, 26 octobre puis 16 novembre 2026) : avec `CHIFFREMENT_CLE`, chaque fichier
 * écrit en base est chiffré ici, au seul endroit par où passent toutes les écritures ; chaque fichier relu est déchiffré ici.
 * Sans clé, rien n'est chiffré et rien ne change ; un fichier chiffré relu sans la clé est une erreur franche.
 */
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(connectionString: string, chiffreur: Chiffreur = new Chiffreur(null)) {
    super({ adapter: new PrismaPg({ connectionString }) });
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- le client étendu remplace l'instance rendue par `new`.
    const brut = this;
    const etendu = this.$extends({
      query: {
        async $allOperations({ operation, args, query }) {
          const ecrit = chiffreur.actif && ECRITURES.has(operation) ? surLesOctets(args, (o) => (estChiffre(o) ? o : chiffreur.chiffrer(o))) : args;
          return surLesOctets(await query(ecrit), (o) => (estChiffre(o) ? chiffreur.dechiffrer(o) : o));
        },
      },
      client: {
        async onModuleDestroy() {
          await brut.$disconnect();
        },
        /** Le client sans chiffrement ni déchiffrement : réservé au script qui chiffre ou remet en clair les fichiers. */
        $brut: brut as PrismaClient,
      },
    });
    return etendu as unknown as this;
  }

  /** Le client sans chiffrement ni déchiffrement (voir le constructeur). */
  declare readonly $brut: PrismaClient;

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
