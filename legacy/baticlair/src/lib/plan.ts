import "server-only";
import { prisma } from "@/lib/db";
import { startOfMonth } from "@/lib/analysis";

/** Nombre d'analyses gratuites par mois (cahier des charges §6, étape 6). */
export const FREE_MONTHLY_LIMIT = 3;

export interface Usage {
  plan: "free" | "pro";
  used: number;
  limit: number | null;
  remaining: number | null;
  atteinte: boolean;
}

/** Calcule l'usage du mois en cours pour un artisan (§6, étape 6). */
export async function getUsage(userId: string): Promise<Usage> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { plan: true },
  });

  if (user.plan === "pro") {
    return { plan: "pro", used: 0, limit: null, remaining: null, atteinte: false };
  }

  const used = await prisma.analysis.count({
    where: { userId, createdAt: { gte: startOfMonth() } },
  });

  return {
    plan: "free",
    used,
    limit: FREE_MONTHLY_LIMIT,
    remaining: Math.max(0, FREE_MONTHLY_LIMIT - used),
    atteinte: used >= FREE_MONTHLY_LIMIT,
  };
}
