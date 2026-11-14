import localFont from "next/font/local";
import "./landing.css";

/**
 * Les pages publiques (sans compte). La landing « niveau studio » (Greg, 26 octobre 2026) : le titre en Bricolage Grotesque
 * étroite. Le fichier vient du paquet déjà installé (`@fontsource-variable/bricolage-grotesque`, fichier « standard »), réduit
 * à la seule variante utilisée (chasse 75, taille optique 96, graisse 800 : 21 Ko au lieu de 131) avec fontTools ; licence
 * SIL OFL 1.1 jointe (`polices/OFL-bricolage-grotesque.txt`). Chargée seulement ici ; l'app garde son fichier.
 */
const titre = localFont({
  src: "./polices/bricolage-etroite-800.woff2",
  weight: "800",
  display: "swap",
  variable: "--font-titre",
});

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className={titre.variable}>{children}</div>;
}
