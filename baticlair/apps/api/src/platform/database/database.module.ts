import { Global, Module } from "@nestjs/common";
import type { AppConfig } from "../config/config.js";
import { CONFIG } from "../tokens.js";
import { Chiffreur, lireCle } from "../chiffrement/chiffreur.js";
import { PrismaService } from "./prisma.service.js";

@Global()
@Module({
  providers: [
    { provide: PrismaService, useFactory: (config: AppConfig) => new PrismaService(config.databaseUrl, new Chiffreur(lireCle(config.chiffrementCle))), inject: [CONFIG] },
  ],
  exports: [PrismaService],
})
export class DatabaseModule {}
