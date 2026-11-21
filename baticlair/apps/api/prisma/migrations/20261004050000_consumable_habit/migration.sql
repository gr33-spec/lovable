-- §45.8 : consommables suggérés (« On ajoute ? ») refusés ou ajoutés à la main, par entreprise.
CREATE TABLE "consumable_habit" (
    "companyId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "refusedInARow" INTEGER NOT NULL DEFAULT 0,
    "lastRefusedProject" UUID,
    "manualProjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastQuantity" TEXT,
    "lastUnit" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumable_habit_pkey" PRIMARY KEY ("companyId","key")
);

ALTER TABLE "consumable_habit" ADD CONSTRAINT "consumable_habit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
