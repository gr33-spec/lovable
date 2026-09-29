import { Mail } from "lucide-react";
import type { Metadata } from "next";
import { SocialIcon } from "@/components/ui/social-icon";
import { getSettings } from "@/lib/server/cached";
import { SOCIAL_LABELS } from "@/lib/validation";

export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

// Pas de formulaire de contact : l'e-mail et les réseaux suffisent, sans
// collecte de données ni spam à gérer.
export default async function ContactPage() {
  const s = await getSettings();
  return (
    <div className="container-page max-w-2xl py-10 sm:py-16">
      <h1 className="text-4xl sm:text-5xl">Contact</h1>
      <p className="mt-4 text-[17px] text-text-2">Une question sur une création, une commande ou une envie particulière ? Écrivez-moi, je réponds avec plaisir.</p>
      <ul className="mt-8 space-y-3">
        {s.contactEmail && (
          <li>
            <a href={`mailto:${s.contactEmail}`} className="card flex items-center gap-4 p-4 no-underline transition hover:border-primary">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-light text-primary">
                <Mail size={20} aria-hidden="true" />
              </span>
              <span>
                <span className="block font-semibold">E-mail</span>
                <span className="text-text-2">{s.contactEmail}</span>
              </span>
            </a>
          </li>
        )}
        {s.socials.map((so) => (
          <li key={so.url}>
            <a href={so.url} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-4 p-4 no-underline transition hover:border-primary">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-light text-primary">
                <SocialIcon network={so.network} />
              </span>
              <span>
                <span className="block font-semibold">{SOCIAL_LABELS[so.network]}</span>
                <span className="text-text-2">{so.network === "whatsapp" ? "Envoyer un message" : so.url.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      {!s.contactEmail && s.socials.length === 0 && <p className="mt-8 text-text-2">Les coordonnées seront bientôt disponibles.</p>}
    </div>
  );
}
