import type { AlerteCourte } from "@baticlair/domain";
import type { PrismaService } from "../database/prisma.service.js";

/**
 * LA CLOCHE (Greg, 10 novembre 2026) : une alerte courte par fait et par entreprise (`cle` unique). Écrite deux fois, elle
 * ne l'est qu'une : un webhook rejoué ou un bouton rappuyé ne double jamais une alerte. Rend vrai quand elle est nouvelle.
 */
export async function ecrireAlerte(prisma: PrismaService, companyId: string, a: AlerteCourte): Promise<boolean> {
  const r = await prisma.alerteCourte.createMany({ data: [{ companyId, categorie: a.categorie, genre: a.genre, titre: a.titre, detail: a.detail, action: a.action, href: a.href, cle: a.cle }], skipDuplicates: true });
  return r.count === 1;
}
