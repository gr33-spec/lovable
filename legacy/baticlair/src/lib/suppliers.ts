import "server-only";
import { prisma } from "@/lib/db";

export interface SupplierItem {
  id: string;
  nom: string;
  email: string;
  telephone: string | null;
  metier: string | null;
}

/** Carnet de fournisseurs de l'artisan, trié par nom (étape 7). */
export async function getSuppliers(userId: string): Promise<SupplierItem[]> {
  return prisma.supplier.findMany({
    where: { userId },
    orderBy: { nom: "asc" },
    select: { id: true, nom: true, email: true, telephone: true, metier: true },
  });
}

interface CreateSupplierInput {
  nom: string;
  email: string;
  telephone?: string;
  metier?: string;
}

export async function createSupplier(userId: string, data: CreateSupplierInput): Promise<void> {
  await prisma.supplier.create({ data: { userId, ...data } });
}

export async function deleteSupplier(userId: string, id: string): Promise<void> {
  await prisma.supplier.deleteMany({ where: { id, userId } });
}
