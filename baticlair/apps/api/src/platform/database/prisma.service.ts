import type { OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";

/** Client Prisma unique. Utilisé uniquement dans les couches infrastructure. */
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(connectionString: string) {
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
