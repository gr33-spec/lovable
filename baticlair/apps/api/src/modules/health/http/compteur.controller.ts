import { Controller, Get, Header, Inject } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { PrismaService } from "../../../platform/database/prisma.service.js";
import { Public } from "../../identity/index.js";

/** Sous ce nombre, le compteur ne se montre pas (Greg, 22 octobre : « vrai chiffre de la base, masqué sous 10 »). */
export const SEUIL_COMPTEUR = 10;

/**
 * LE COMPTEUR DE LA PAGE PUBLIQUE (landing du 22 octobre) : « X couvreurs déjà inscrits dans les Côtes-d'Armor ». Public,
 * sans aucune donnée d'entreprise : un seul nombre, ou null sous le seuil. Un couvreur = une entreprise au métier
 * « roofing » dont l'adresse porte un code postal du 22 ; les comptes de démonstration (`@demo.baticlair.fr`) ne comptent pas.
 */
@Controller("v1/public")
export class CompteurController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Public()
  @Throttle({ default: { ttl: 3_600_000, limit: 600 } })
  @Header("Cache-Control", "public, max-age=300")
  @Get("compteur")
  async compteur() {
    const [ligne] = await this.prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM company c
      WHERE 'roofing' = ANY(c.trades)
        AND c.address ~ '(^|[^0-9])22[0-9]{3}([^0-9]|$)'
        AND NOT EXISTS (
          SELECT 1 FROM membership m JOIN "user" u ON u.id = m."userId"
          WHERE m."companyId" = c.id AND u.email LIKE '%@demo.baticlair.fr'
        )`;
    const n = Number(ligne?.n ?? 0);
    return { departement: "22", couvreurs: n >= SEUIL_COMPTEUR ? n : null };
  }
}
