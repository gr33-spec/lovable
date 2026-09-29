import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../../src/app.module.js";
import { configureApp } from "../../src/app.js";
import { PrismaService } from "../../src/platform/database/prisma.service.js";
import type { CapturingEmailSender } from "../../src/platform/email/capturing-email.sender.js";
import { EMAIL_SENDER } from "../../src/platform/tokens.js";

export const WEB_ORIGIN = "http://localhost:3000";

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  emails: CapturingEmailSender;
}

export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ bodyParser: false });
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService), emails: app.get(EMAIL_SENDER) };
}

/** Vide toutes les tables (hors historique des migrations) entre deux tests. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

export type Agent = ReturnType<typeof request.agent>;

/** Crée un compte et renvoie un agent HTTP qui garde le cookie de session. */
export async function signUp(app: INestApplication, email: string, name = "Artisan Test"): Promise<Agent> {
  const agent = request.agent(app.getHttpServer());
  const res = await agent
    .post("/v1/auth/sign-up/email")
    .set("origin", WEB_ORIGIN)
    .send({ email, password: "motdepasse-solide", name });
  if (res.status !== 200) throw new Error(`sign-up failed: ${res.status} ${res.text}`);
  return agent;
}

/** Compte + entreprise : l'état normal après l'onboarding. */
export async function signUpWithCompany(app: INestApplication, email: string, companyName: string) {
  const agent = await signUp(app, email);
  const res = await agent.post("/v1/companies").send({ name: companyName });
  if (res.status !== 201) throw new Error(`company creation failed: ${res.status} ${res.text}`);
  return { agent, companyId: res.body.id as string };
}
