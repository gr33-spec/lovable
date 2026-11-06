import { GRAVITE_EXCEPTION, type TypeException } from "@baticlair/domain";
import type { PrismaService } from "../database/prisma.service.js";

/**
 * LA FILE D'EXCEPTIONS (lot 6, prompt maître point 14) : un seul point d'entrée pour tous les modules. Une même clé ne
 * remonte qu'une fois tant qu'elle est ouverte (le compteur et la date montent) ; résolue, elle se rouvre si le cas
 * revient. Jamais bloquant : une panne de la file ne casse jamais le geste de l'artisan.
 */
export interface ExceptionSignalee {
  type: TypeException;
  /** Ce qui identifie le cas (« <destinataire> », « <devis> ») ; la clé finale est « type:cle ». */
  cle: string;
  titre: string;
  detail?: string | null;
  lien?: string | null;
  companyId?: string | null;
}

export async function signalerException(prisma: PrismaService, e: ExceptionSignalee, maintenant = new Date()): Promise<void> {
  const cle = `${e.type}:${e.cle}`.slice(0, 300);
  const data = { titre: e.titre.slice(0, 300), detail: e.detail?.slice(0, 2000) ?? null, lien: e.lien ?? null, companyId: e.companyId ?? null };
  try {
    await prisma.exceptionSupervision.upsert({
      where: { cle },
      create: { ...data, cle, type: e.type, gravite: GRAVITE_EXCEPTION[e.type] },
      update: { ...data, statut: "ouverte", occurrences: { increment: 1 }, dernierLe: maintenant, resoluLe: null, resoluPar: null },
    });
  } catch {
    // La supervision ne bloque jamais le parcours.
  }
}
