import Image from "next/image";
import { NOM_APP } from "@/lib/nom";

/**
 * LE LOGO MOBIIZ (Greg, 24 octobre 2026) : « clair » (lettres noires) sur un fond clair, « sombre » (lettres blanches) sur la
 * landing et les fonds noirs ; les deux i portent le casque jaune #FFC800. Fichiers PNG à fond transparent tirés du logo du
 * fondateur (`public/marque/`) ; des SVG restent à faire (DETTE.md).
 */
const LOGOS = {
  clair: { src: "/marque/logo-clair.png", width: 728, height: 195 },
  sombre: { src: "/marque/logo-sombre.png", width: 620, height: 181 },
} as const;

export function Logo({ fond = "clair", hauteur = 28, className }: { fond?: keyof typeof LOGOS; hauteur?: number; className?: string }) {
  const l = LOGOS[fond];
  return <Image src={l.src} alt={NOM_APP} width={Math.round((l.width * hauteur) / l.height)} height={hauteur} priority className={className} />;
}
