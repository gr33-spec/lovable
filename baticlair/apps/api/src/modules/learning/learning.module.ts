import { Module } from "@nestjs/common";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { COMPANY_MEMORY_STORE, CompanyMemory, type CompanyMemoryStore } from "./application/company-memory.js";
import { CORRECTION_JOURNAL_STORE, CorrectionJournal, type CorrectionJournalStore } from "./application/correction-journal.js";
import { CorrectionsController } from "./http/corrections.controller.js";
import { MemoryController } from "./http/memory.controller.js";
import { PrismaCompanyMemoryStore, PrismaCorrectionJournalStore } from "./infrastructure/prisma-learning.js";
import { TenancyModule } from "../tenancy/index.js";

/**
 * Apprentissage CONTRÔLÉ (PD-045) : mémoire de chaque entreprise et journal
 * des corrections. Aucun accès au référentiel général : rien ici ne peut le
 * modifier.
 */
@Module({
  imports: [TenancyModule],
  controllers: [CorrectionsController, MemoryController],
  providers: [
    { provide: CORRECTION_JOURNAL_STORE, useFactory: (p: PrismaService) => new PrismaCorrectionJournalStore(p), inject: [PrismaService] },
    { provide: COMPANY_MEMORY_STORE, useFactory: (p: PrismaService) => new PrismaCompanyMemoryStore(p), inject: [PrismaService] },
    { provide: CorrectionJournal, useFactory: (s: CorrectionJournalStore) => new CorrectionJournal(s), inject: [CORRECTION_JOURNAL_STORE] },
    {
      provide: CompanyMemory,
      useFactory: (s: CompanyMemoryStore, j: CorrectionJournal) => new CompanyMemory(s, j),
      inject: [COMPANY_MEMORY_STORE, CorrectionJournal],
    },
  ],
  exports: [CorrectionJournal, CompanyMemory],
})
export class LearningModule {}
