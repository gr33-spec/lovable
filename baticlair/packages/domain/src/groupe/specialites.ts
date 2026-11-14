/**
 * LES SPÉCIALITÉS DES NÉGOCES ET « QUI REÇOIT QUOI » (Greg, 1er novembre 2026) : du code pur, sans base ni IA.
 * L'artisan déclare les spécialités de chaque négoce (jamais présentées comme sûres, corrigeables) ; avant l'envoi, chaque
 * lot de la liste va aux négoces compatibles. Un spécialisé ne reçoit que ses lots ; un généraliste peut tout recevoir ;
 * un négoce sans spécialité déclarée reste possible, signalé « à préciser ». Envoyer un lot à un négoce non compatible
 * reste possible, après un avertissement.
 */

export const SPECIALITES = ["generaliste", "couverture", "zinguerie", "etancheite", "charpente", "maconnerie", "isolation_platrerie", "plomberie", "electricite", "bois", "autre"] as const;
export type Specialite = (typeof SPECIALITES)[number];

export const LIBELLES_SPECIALITES: Readonly<Record<Specialite, string>> = {
  generaliste: "Généraliste",
  couverture: "Couverture",
  zinguerie: "Zinguerie",
  etancheite: "Étanchéité",
  charpente: "Charpente",
  maconnerie: "Maçonnerie",
  isolation_platrerie: "Isolation et plâtrerie",
  plomberie: "Plomberie",
  electricite: "Électricité",
  bois: "Bois",
  autre: "Autre",
};

export const estSpecialite = (v: unknown): v is Specialite => typeof v === "string" && (SPECIALITES as readonly string[]).includes(v);

/** La spécialité qui chiffre un lot, d'après le métier de la liste (identifiants de `TRADES`). */
const PAR_METIER: Readonly<Record<string, Specialite>> = {
  roofing: "couverture",
  // Greg, 13 novembre 2026 : l'étanchéité est un métier à part, elle ne part plus d'office chez les négoces de couverture.
  waterproofing: "etancheite",
  cladding: "couverture",
  carpentry: "charpente",
  masonry: "maconnerie",
  facade: "maconnerie",
  paving: "maconnerie",
  earthworks: "maconnerie",
  tiling: "maconnerie",
  drywall: "isolation_platrerie",
  ceiling: "isolation_platrerie",
  painting: "isolation_platrerie",
  plumbing: "plomberie",
  hvac: "plomberie",
  irrigation: "plomberie",
  electrical: "electricite",
  solar: "electricite",
  joinery: "bois",
  interior_joinery: "bois",
  decking: "bois",
  flooring: "bois",
  kitchen: "bois",
};

export const specialiteDuMetier = (metier: string | null | undefined): Specialite => (metier ? (PAR_METIER[metier] ?? "autre") : "autre");

export interface LotAEnvoyer {
  /** La clé du lot (le métier, ou « liste » pour une liste d'un seul lot). */
  cle: string;
  libelle: string;
  specialite: Specialite;
  /** Les articles du lot (clés de la liste). */
  articles: readonly string[];
}

export interface NegoceDestinataire {
  id: string;
  nom: string;
  specialites: readonly string[];
}

export type Compatibilite = "specialiste" | "generaliste" | "a_preciser" | "non";

export function compatibilite(n: NegoceDestinataire, s: Specialite): Compatibilite {
  const ses = n.specialites.filter(estSpecialite);
  if (ses.length === 0) return "a_preciser";
  if (ses.includes(s)) return "specialiste";
  if (ses.includes("generaliste")) return "generaliste";
  return "non";
}

const NOMBRES = ["Aucune", "Une", "Deux", "Trois", "Quatre", "Cinq", "Six", "Sept", "Huit", "Neuf", "Dix"];

/** « Deux lignes de maçonnerie n'ont actuellement aucun négoce compatible. Ajoute un négoce généraliste ou … » */
export function phraseLotSansNegoce(lignes: number, libelle: string): string {
  const n = lignes <= 10 ? NOMBRES[lignes]! : String(lignes);
  const de = /^[aeiouyéèêh]/i.test(libelle) ? "d'" : "de ";
  return `${n} ligne${lignes > 1 ? "s" : ""} ${de}${libelle.toLowerCase()} ${lignes > 1 ? "n'ont" : "n'a"} actuellement aucun négoce compatible. Ajoute un négoce généraliste ou un négoce spécialisé pour demander leur chiffrage.`;
}

export interface QuiRecoitQuoi {
  /** Pour chaque lot : les négoces choisis compatibles, et s'il est couvert. */
  lots: { cle: string; libelle: string; specialite: Specialite; lignes: number; destinataires: { id: string; nom: string; compatibilite: Compatibilite }[]; couvert: boolean }[];
  /** Pour chaque négoce choisi : les lots qu'il recevra (et ceux forcés malgré l'avertissement). */
  negoces: { id: string; nom: string; lots: string[]; forces: string[]; sansLot: boolean }[];
  alertes: string[];
}

/**
 * La correspondance lots × négoces choisis. `forces` : les couples « négoce:lot » que l'artisan a confirmés malgré
 * l'avertissement. Un négoce à spécialités non déclarées reçoit tout (comme avant), signalé « à préciser ».
 */
export function quiRecoitQuoi(lots: readonly LotAEnvoyer[], negoces: readonly NegoceDestinataire[], forces: ReadonlySet<string> = new Set()): QuiRecoitQuoi {
  const parNegoce = new Map(negoces.map((n) => [n.id, { id: n.id, nom: n.nom, lots: [] as string[], forces: [] as string[], sansLot: false }]));
  const vues = lots.map((l) => {
    const destinataires = negoces
      .map((n) => ({ id: n.id, nom: n.nom, compatibilite: compatibilite(n, l.specialite) }))
      .filter((d) => d.compatibilite !== "non" || forces.has(`${d.id}:${l.cle}`));
    for (const d of destinataires) {
      const p = parNegoce.get(d.id)!;
      p.lots.push(l.cle);
      if (d.compatibilite === "non") p.forces.push(l.cle);
    }
    return { cle: l.cle, libelle: l.libelle, specialite: l.specialite, lignes: l.articles.length, destinataires, couvert: destinataires.length > 0 };
  });
  const negocesVue = [...parNegoce.values()].map((n) => ({ ...n, sansLot: n.lots.length === 0 }));
  const alertes = vues.filter((l) => !l.couvert && l.lignes > 0).map((l) => phraseLotSansNegoce(l.lignes, l.libelle));
  return { lots: vues, negoces: negocesVue, alertes };
}

/** Les articles que reçoit un négoce : ceux de ses lots, dans l'ordre de la liste. */
export function articlesPour(qrq: QuiRecoitQuoi, lots: readonly LotAEnvoyer[], negoceId: string): string[] {
  const ses = new Set(qrq.negoces.find((n) => n.id === negoceId)?.lots ?? []);
  return lots.filter((l) => ses.has(l.cle)).flatMap((l) => [...l.articles]);
}

/* ------------------------------------------------------------------------------------------- la demande classique */

/**
 * LA DEMANDE DE PRIX CLASSIQUE TRIE SES LIGNES PAR MÉTIER DU NÉGOCE (Greg, 14 novembre 2026, recette du 13, B7 : « oui, la
 * demande classique trie les lignes par métier du négoce »). Avant, chaque négoce choisi recevait toute la liste : un
 * zingueur recevait les ardoises. Chaque ligne a sa spécialité (ses mots, sinon le métier de la liste) ; un négoce reçoit
 * les lignes de ses spécialités, tout s'il est généraliste ou s'il n'a rien déclaré.
 *
 * AUCUNE LIGNE N'EST PERDUE : une ligne que personne ne couvre parmi les négoces choisis part chez TOUS, et se dit
 * (`sansSpecialiste`). Un négoce qui ne recevrait rien se dit aussi (`sansLigne`), il ne reçoit pas de demande vide.
 */
export interface LigneARepartir {
  cle: string;
  libelle: string;
  specialite: Specialite;
}
export interface RepartitionDemande {
  /** Les négoces qui reçoivent exactement les mêmes lignes partent dans la même demande. */
  groupes: { negoces: string[]; lignes: string[] }[];
  /** Les lignes qu'aucun négoce choisi ne couvre : elles partent chez tous. */
  sansSpecialiste: { cle: string; libelle: string; specialite: Specialite }[];
  /** Les négoces choisis dont aucune ligne ne relève. */
  sansLigne: string[];
  /** Vrai si tous les négoces reçoivent toute la liste (rien à trier). */
  toutPourTous: boolean;
}

export function repartirLaDemande(lignes: readonly LigneARepartir[], negoces: readonly NegoceDestinataire[]): RepartitionDemande {
  const couvre = (n: NegoceDestinataire, s: Specialite) => compatibilite(n, s) !== "non";
  const sansSpecialiste = lignes.filter((l) => !negoces.some((n) => couvre(n, l.specialite)));
  const orphelines = new Set(sansSpecialiste.map((l) => l.cle));
  const parNegoce = negoces.map((n) => ({ id: n.id, lignes: lignes.filter((l) => orphelines.has(l.cle) || couvre(n, l.specialite)).map((l) => l.cle) }));
  const sansLigne = parNegoce.filter((p) => p.lignes.length === 0).map((p) => p.id);
  const groupes = new Map<string, { negoces: string[]; lignes: string[] }>();
  for (const p of parNegoce) {
    if (p.lignes.length === 0) continue;
    const signature = p.lignes.join("\u0000");
    const g = groupes.get(signature) ?? { negoces: [], lignes: p.lignes };
    g.negoces.push(p.id);
    groupes.set(signature, g);
  }
  const liste = [...groupes.values()];
  return { groupes: liste, sansSpecialiste: sansSpecialiste.map((l) => ({ cle: l.cle, libelle: l.libelle, specialite: l.specialite })), sansLigne, toutPourTous: sansLigne.length === 0 && liste.length <= 1 && (liste[0]?.lignes.length ?? 0) === lignes.length };
}

/**
 * « NÉGOCE COUVERTURE » COCHE D'OFFICE COUVERTURE, ZINGUERIE ET ÉTANCHÉITÉ (Greg, 14 novembre 2026 : « il décoche ce qu'il ne
 * vend pas »). RÈGLE CHANGÉE : le 13 novembre, un négoce de couverture ne recevait la zinguerie et l'étanchéité que s'il
 * les avait cochées. Les trois restent des métiers à part : on peut en décocher.
 */
export const SPECIALITES_AVEC_LA_COUVERTURE: readonly Specialite[] = ["couverture", "zinguerie", "etancheite"];
/** Cocher « Couverture » coche aussi les deux autres ; décocher l'une d'elles ne touche pas aux autres. */
export function cocherSpecialite(actuelles: readonly string[], specialite: string, cochee: boolean): string[] {
  if (!cochee) return actuelles.filter((s) => s !== specialite);
  const ajout = specialite === "couverture" ? SPECIALITES_AVEC_LA_COUVERTURE : [specialite];
  return [...new Set([...actuelles, ...ajout])];
}
