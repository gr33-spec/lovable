import {
  Axe,
  BrickWall,
  CloudRain,
  DoorOpen,
  Droplets,
  Fence,
  Flame,
  Hammer,
  HardHat,
  House,
  LayoutGrid,
  Lightbulb,
  PaintRoller,
  Plug,
  ShieldCheck,
  ShowerHead,
  Shovel,
  Sparkles,
  Sprout,
  Sun,
  Thermometer,
  Wind,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * L'icône d'une prestation (maquette de Greg, 17 novembre 2026 : « une icône jaune par service »). Choisie par le code
 * d'après les mots du titre écrit par l'artisan, sinon d'après son métier ; jamais un dessin ni une photo inventés.
 * Le premier motif qui correspond l'emporte : du plus précis au plus général.
 */
const PAR_MOTS: [RegExp, LucideIcon][] = [
  [/d[ée]moussage|nettoyage|entretien|traitement/i, Sparkles],
  [/r[ée]paration|d[ée]pannage|fuite|urgence|temp[êe]te/i, Wrench],
  [/goutti[èe]re|descente|zinguerie|zinc|chéneau|cheneau/i, CloudRain],
  [/[ée]tanch[ée]it[ée]|toit(ure)?[- ]terrasse/i, Droplets],
  [/isolation|combles|doublage/i, Thermometer],
  [/charpente|ossature|bois/i, Axe],
  [/couverture|toiture|ardoise|tuile/i, House],
  [/fa[çc]ade|ravalement|enduit|cr[ée]pi/i, PaintRoller],
  [/peinture|papier|rev[êe]tement mural|toile de verre/i, PaintRoller],
  [/ma[çc]onnerie|mur|dalle|fondation|extension|agrandissement|parpaing|brique|pierre/i, BrickWall],
  [/carrel|fa[ïi]ence|sol/i, LayoutGrid],
  [/salle de bain|sanitaire|douche|plomberie/i, ShowerHead],
  [/chauffage|chaudi[èe]re|pompe [àa] chaleur|po[êe]le/i, Flame],
  [/ventilation|vmc|climatisation/i, Wind],
  [/[ée]clairage|luminaire/i, Lightbulb],
  [/[ée]lectri|tableau|prise|c[âa]blage/i, Plug],
  [/solaire|photovolta[ïi]que|panneau/i, Sun],
  [/menuiserie|fen[êe]tre|porte|volet/i, DoorOpen],
  [/cl[ôo]ture|portail|muret/i, Fence],
  [/terrassement|vrd|assainissement/i, Shovel],
  [/jardin|paysag|espace vert|arrosage/i, Sprout],
  [/s[ée]curit[ée]|garantie|d[ée]cennale/i, ShieldCheck],
];

const PAR_METIER: Record<string, LucideIcon> = {
  roofing: House,
  masonry: BrickWall,
  painting: PaintRoller,
  electrical: Plug,
  plumbing: ShowerHead,
  hvac: Flame,
  carpentry: Axe,
  joinery: DoorOpen,
  tiling: LayoutGrid,
  drywall: Thermometer,
  waterproofing: Droplets,
};

export function iconeDePrestation(titre: string, metier: string): LucideIcon {
  for (const [motif, icone] of PAR_MOTS) if (motif.test(titre)) return icone;
  return PAR_METIER[metier] ?? (/landscap|garden/.test(metier) ? Sprout : metier === "general" ? HardHat : Hammer);
}
