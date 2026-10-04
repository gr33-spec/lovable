import { Module } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import type { AppLogger } from "../../platform/logging/logger.js";
import { CONFIG, LOGGER } from "../../platform/tokens.js";
import { TenancyModule } from "../tenancy/index.js";
import { DOCUMENT_REPOSITORY, type DocumentRepository } from "./application/document.repository.js";
import { DocumentAiInput } from "./application/ai-input.js";
import { DocumentsService } from "./application/documents.service.js";
import { PDF_READER, type PdfReader } from "./application/pdf-reader.js";
import { DocumentsController } from "./http/documents.controller.js";
import { extractPdfPages, pdfPageCount } from "./infrastructure/pdf-pages.js";
import { PdfJsPdfReader } from "./infrastructure/pdfjs-pdf-reader.js";
import { PrismaDocumentRepository } from "./infrastructure/prisma-document.repository.js";
import { UploadParts } from "./infrastructure/upload-parts.js";

@Module({
  imports: [TenancyModule],
  controllers: [DocumentsController],
  providers: [
    { provide: DOCUMENT_REPOSITORY, useFactory: (p: PrismaService) => new PrismaDocumentRepository(p), inject: [PrismaService] },
    { provide: UploadParts, useFactory: (p: PrismaService) => new UploadParts(p), inject: [PrismaService] },
    { provide: PDF_READER, useFactory: () => new PdfJsPdfReader() },
    {
      provide: DocumentAiInput,
      useFactory: (r: DocumentRepository, config: AppConfig) =>
        new DocumentAiInput(r, { extract: extractPdfPages, pageCount: pdfPageCount }, { maxPages: config.documents.maxPages }),
      inject: [DOCUMENT_REPOSITORY, CONFIG],
    },
    {
      provide: DocumentsService,
      useFactory: (r: DocumentRepository, reader: PdfReader, config: AppConfig, logger: AppLogger) =>
        new DocumentsService(r, reader, config.documents, undefined, undefined, (error, documentId) =>
          logger.error({ err: error, documentId }, "documents: lecture du PDF impossible (panne technique)"),
        ),
      inject: [DOCUMENT_REPOSITORY, PDF_READER, CONFIG, LOGGER],
    },
  ],
  exports: [DOCUMENT_REPOSITORY, DocumentsService, DocumentAiInput, UploadParts],
})
export class DocumentsModule {}
