import type { Agent, TestContext } from "./test-app.js";

/** La double authentification de l'admin en test : le code reçu par e-mail, puis sa vérification. */
export async function doubleAuthentification(ctx: TestContext, agent: Agent, email: string): Promise<void> {
  await agent.post("/v1/admin/pilotage/code").expect(200);
  const mail = ctx.emails.sent.filter((m) => m.to === email && /code d'accès au pilotage/.test(m.subject)).at(-1);
  if (!mail) throw new Error(`Aucun code reçu par ${email}`);
  const code = /(\d{6})/.exec(mail.text)![1]!;
  await agent.post("/v1/admin/pilotage/code/verifier").send({ code }).expect(200);
}
