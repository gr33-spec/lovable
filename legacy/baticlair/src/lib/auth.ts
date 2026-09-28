import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { EmailConfig } from "@auth/core/providers/email";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const EMAIL_FROM = process.env.EMAIL_FROM ?? "BatiClair <connexion@baticlair.fr>";

/**
 * Connexion par lien magique (§5). En l'absence de RESEND_API_KEY (dev sans
 * infra e-mail), le lien est simplement affiché dans les logs du serveur.
 */
const MagicLinkProvider: EmailConfig = {
  id: "magic-link",
  type: "email",
  name: "E-mail",
  from: EMAIL_FROM,
  maxAge: 24 * 60 * 60,
  async sendVerificationRequest({ identifier, url }) {
    const sent = await sendEmail({
      to: identifier,
      subject: "Ton lien de connexion BatiClair",
      html: `<p>Clique sur ce lien pour te connecter à BatiClair :</p><p><a href="${url}">${url}</a></p><p>Ce lien expire dans 24h.</p>`,
      text: `Connecte-toi à BatiClair : ${url}`,
    });

    if (!sent) {
      console.log(`[BatiClair] Lien de connexion pour ${identifier} : ${url}`);
    }
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma as unknown as Parameters<typeof PrismaAdapter>[0]),
  providers: [MagicLinkProvider],
  session: { strategy: "database" },
  pages: {
    signIn: "/connexion",
    verifyRequest: "/connexion/verification",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
