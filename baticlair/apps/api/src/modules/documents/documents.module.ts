import { Module } from "@nestjs/common";
import type { AppConfig } from "../../platform/config/config.js";
import { PrismaService } from "../../platform/database/prisma.service.js";
import { CONFIG } from "../../platform/tokens.js";
import { TenancyModule } from "../tenancy/index.js";
import { DOCUMENT_REPOSITORY, type DocumentRepository } from "./application/document.repository.js";
import { DocumentsService } from "./application/documents.service.js";
import { PDF_READER, type PdfReader } from "./application/pdf-reader.js";
import { DocumentsController } from "./http/documents.controller.js";
import { PdfJsPdfReader } from "./infrastructure/pdfjs-pdf-reader.js";
import { PrismaDocumentRepository } from "./infrastructure/prisma-document.repository.js";

@Module({
  imports: [TenancyModule],
  controllers: [DocumentsController],
  providers: [
    { provide: DOCUMENT_REPOSITORY, useFactory: (p: PrismaService) => new PrismaDocumentRepository(p), inject: [PrismaService] },
    { provide: PDF_READER, useFactory: () => new PdfJsPdfReader() },
    {
      provide: DocumentsService,
      useFactory: (r: DocumentRepository, reader: PdfReader, config: AppConfig) =>
        new DocumentsService(r, reader, config.documents),
      inject: [DOCUMENT_REPOSITORY, PDF_READER, CONFIG],
    },
  ],
})
export class DocumentsModule {}
