/**
 * MA PAGE MOBIIZ (Greg, 16 novembre 2026) : le moteur. Un thème par métier du catalogue ; le contraste reste lisible quelle
 * que soit la couleur ; l'adresse de la page ; jamais une rubrique vide ; trois architectures ; données structurées sans
 * adresse exacte ni note inventée ; textes proposés sans coordonnées inventées.
 */
import { describe, expect, it } from "vitest";
import {
  accrocheParDefaut,
  adresseDepuis,
  adressesCandidates,
  ambianceDe,
  contraste,
  donneesStructurees,
  descriptionDeLaPage,
  lienAppel,
  MODELES_PAGE,
  NUANCIER,
  ordreDesRubriques,
  paletteDeLaPage,
  proposerTextes,
  refusAdresse,
  rubriquesVisibles,
  siteWebPropre,
  sousTitre,
  telephonePropre,
  texteSur,
  THEMES_METIER,
  themeDuMetier,
  titreDeLaPage,
  TRADES,
  VISUELS,
  type ContenuPage,
} from "../src/index.js";

const libelles = Object.fromEntries(TRADES.map((t) => [t.id, t.label]));

function contenu(partiel: Partial<ContenuPage> = {}): ContenuPage {
  return {
    adresse: "toits-martin",
    nom: "Toits Martin",
    metierPrincipal: "roofing",
    metiers: ["roofing"],
    accroche: null,
    presentation: null,
    zone: null,
    horaires: null,
    telephone: null,
    siteWeb: null,
    adressePostale: null,
    creeeEn: null,
    certifications: [],
    verifiee: false,
    siret: null,
    modele: "photo",
    couleur: null,
    fond: null,
    pictos: true,
    motif: true,
    logo: null,
    couverture: null,
    photos: [],
    missions: null,
    majLe: "2026-11-16T10:00:00.000Z",
    ...partiel,
  };
}

describe("thèmes par métier", () => {
  it("chaque métier du catalogue a son thème, avec un visuel et une couleur valables", () => {
    for (const t of TRADES) {
      const th = THEMES_METIER[t.id];
      expect(th, t.id).toBeDefined();
      expect(VISUELS).toContain(th!.visuel);
      expect(th!.couleur).toMatch(/^#[0-9A-F]{6}$/i);
      expect(th!.accroche).toContain("{zone}");
    }
  });

  it("couvreur : tons ardoise et visuel de toiture ; peintre : fond clair et visuel de finitions ; inconnu : Autre métier", () => {
    expect(themeDuMetier("roofing")).toMatchObject({ nom: "Couvreur", visuel: "toiture", picto: "toit", fond: "sombre" });
    expect(themeDuMetier("painting")).toMatchObject({ nom: "Peintre", visuel: "peinture", picto: "pinceau", fond: "clair" });
    expect(themeDuMetier("inconnu").metier).toBe("other");
    expect(themeDuMetier(null).metier).toBe("other");
    expect(accrocheParDefaut(themeDuMetier("roofing"), "Lannion")).toBe("Votre toiture entre de bonnes mains à Lannion");
    expect(accrocheParDefaut(themeDuMetier("roofing"), null)).toBe("Votre toiture entre de bonnes mains");
  });

  it("changer de métier principal change l'ambiance, sauf ce que l'artisan a choisi (couleur, fond)", () => {
    const a = ambianceDe({ metierPrincipal: "roofing", couleur: null, fond: null });
    const b = ambianceDe({ metierPrincipal: "painting", couleur: null, fond: null });
    expect(a.visuel).not.toBe(b.visuel);
    expect(a.palette.principale).not.toBe(b.palette.principale);
    const choisi = ambianceDe({ metierPrincipal: "painting", couleur: "#7A2E3A", fond: "sombre" });
    expect(choisi.palette.principale).toBe("#7A2E3A");
    expect(choisi.palette.fond).toBe("sombre");
    expect(choisi.visuel).toBe("peinture");
  });
});

describe("nuancier et contraste", () => {
  it("une vingtaine de teintes, toutes différentes", () => {
    expect(NUANCIER.length).toBeGreaterThanOrEqual(18);
    expect(new Set(NUANCIER.map((c) => c.hex)).size).toBe(NUANCIER.length);
  });

  it("contraste WCAG : noir sur blanc = 21, blanc sur blanc = 1", () => {
    expect(contraste("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contraste("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("TOUJOURS LISIBLE : chaque teinte du nuancier, plus des couleurs libres extrêmes, sur fond clair et sombre", () => {
    const libres = ["#FFFFFF", "#000000", "#FFFF00", "#00FFFF", "#777777", "#FED206", "#F0F0F0", "#101010"];
    for (const hex of [...NUANCIER.map((c) => c.hex), ...libres]) {
      for (const fond of ["clair", "sombre"] as const) {
        const p = paletteDeLaPage(hex, fond, "#3E5163");
        expect(contraste(p.surPrincipale, p.bouton), `${hex} bouton ${fond}`).toBeGreaterThanOrEqual(4.5);
        expect(contraste(p.accent, p.page), `${hex} accent ${fond}`).toBeGreaterThanOrEqual(4.5);
        expect(contraste(p.accent, p.surface), `${hex} accent surface ${fond}`).toBeGreaterThanOrEqual(4.5);
        expect(contraste(p.texte, p.page)).toBeGreaterThanOrEqual(7);
        expect(contraste(p.texteDoux, p.surface)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("une couleur invalide prend celle du métier", () => {
    expect(paletteDeLaPage("rouge", "clair", "#3E5163").principale).toBe("#3E5163");
    expect(paletteDeLaPage("#12", "clair", "#3E5163").principale).toBe("#3E5163");
  });
});

describe("adresse de la page", () => {
  it("nom → adresse propre", () => {
    expect(adresseDepuis("Toits Martin & Fils (SARL)")).toBe("toits-martin-fils-sarl");
    expect(adresseDepuis("  Électricité Le Gall  ")).toBe("electricite-le-gall");
    expect(adresseDepuis("x".repeat(80)).length).toBe(50);
  });

  it("refus dits en une phrase : trop court, caractères, réservée", () => {
    expect(refusAdresse("ab")).toMatch(/Au moins 3/);
    expect(refusAdresse("Toits_Martin")).toMatch(/lettres sans accent/);
    expect(refusAdresse("toits--martin")).toMatch(/lettres sans accent/);
    expect(refusAdresse("admin")).toMatch(/réservée/);
    expect(refusAdresse("toits-martin")).toBeNull();
  });

  it("candidates : le nom, le nom et la ville, puis numérotées ; un nom réservé ou trop court est préfixé", () => {
    const c = adressesCandidates("Toits Martin", "Lannion");
    expect(c.slice(0, 3)).toEqual(["toits-martin", "toits-martin-lannion", "toits-martin-2"]);
    expect(adressesCandidates("AB", null)[0]).toBe("entreprise-ab");
    expect(adressesCandidates("Admin", null)[0]).toBe("entreprise-admin");
    for (const a of c) expect(refusAdresse(a)).toBeNull();
  });
});

describe("rubriques : jamais une rubrique vide", () => {
  it("une page sans rien n'a que le contact", () => {
    expect(rubriquesVisibles(contenu({ metiers: [] }))).toEqual(["contact"]);
  });

  it("chaque rubrique apparaît avec son contenu seulement", () => {
    const plein = contenu({
      presentation: "Bonjour",
      zone: "Lannion",
      horaires: "Lun-Ven 8h-18h",
      verifiee: true,
      photos: [{ id: "p", legende: null, largeur: 10, hauteur: 10, variantes: [], partage: null }],
      missions: { disponibleDu: null, disponibleAu: null, lien: "/missions" },
    });
    expect(rubriquesVisibles(plein)).toEqual(["presentation", "metiers", "zone", "galerie", "preuves", "horaires", "missions", "contact"]);
    expect(rubriquesVisibles(contenu({ presentation: "   " }))).not.toContain("presentation");
    expect(rubriquesVisibles(contenu({ certifications: ["RGE"] }))).toContain("preuves");
  });

  it("trois architectures : l'ordre change, le contenu reste le même", () => {
    expect(MODELES_PAGE.map((m) => m.id)).toEqual(["photo", "colonnes", "sobre"]);
    const v = rubriquesVisibles(contenu({ presentation: "x", zone: "Brest", verifiee: true, photos: [{ id: "p", legende: null, largeur: 1, hauteur: 1, variantes: [], partage: null }] }));
    const ordres = MODELES_PAGE.map((m) => ordreDesRubriques(m.id, v).join(","));
    expect(new Set(ordres).size).toBe(3);
    for (const m of MODELES_PAGE) expect([...ordreDesRubriques(m.id, v)].sort()).toEqual([...v].sort());
  });
});

describe("Google et partage", () => {
  it("titre « métier à ville – nom », sous-titre sans texte inventé", () => {
    expect(titreDeLaPage(contenu({ zone: "Lannion" }))).toBe("Couvreur à Lannion – Toits Martin");
    expect(titreDeLaPage(contenu())).toBe("Couvreur – Toits Martin");
    expect(sousTitre(contenu({ zone: "Lannion" }))).toBe("Couvreur · Lannion");
    expect(sousTitre(contenu({ accroche: " Ma toiture " }))).toBe("Ma toiture");
  });

  it("description coupée proprement à 160 caractères", () => {
    const d = descriptionDeLaPage(contenu({ presentation: "mot ".repeat(80) }), libelles);
    expect(d.length).toBeLessThanOrEqual(160);
    expect(d.endsWith("…")).toBe(true);
  });

  it("LocalBusiness : type du métier, zone, téléphone ; jamais d'adresse sans le choix, jamais de note", () => {
    const sans = donneesStructurees(contenu({ zone: "Lannion", telephone: "02 96 00 00 00" }), "https://mobiiz.fr/e/toits-martin", libelles);
    expect(sans).toMatchObject({ "@type": "RoofingContractor", name: "Toits Martin", areaServed: "Lannion", telephone: "02 96 00 00 00" });
    expect(sans).not.toHaveProperty("address");
    expect(sans).not.toHaveProperty("aggregateRating");
    const avec = donneesStructurees(contenu({ adressePostale: "3 rue des Ardoises, 22300 Lannion" }), "u", libelles);
    expect(avec.address).toMatchObject({ streetAddress: "3 rue des Ardoises, 22300 Lannion" });
    expect(donneesStructurees(contenu({ metierPrincipal: "painting", metiers: ["painting"] }), "u", libelles)["@type"]).toBe("HousePainter");
    expect(donneesStructurees(contenu({ metierPrincipal: "tiling", metiers: ["tiling"] }), "u", libelles)["@type"]).toBe("HomeAndConstructionBusiness");
  });
});

describe("champs et textes", () => {
  it("site web et téléphone nettoyés ; un faux lien ou numéro est refusé", () => {
    expect(siteWebPropre("toits-martin.fr")).toBe("https://toits-martin.fr");
    expect(siteWebPropre("javascript:alert(1)")).toBeNull();
    expect(siteWebPropre("https://user:mdp@site.fr")).toBeNull();
    expect(siteWebPropre("pas un site")).toBeNull();
    expect(telephonePropre("0296000000")).toBe("02 96 00 00 00");
    expect(telephonePropre("+33 6 12 34 56 78")).toBe("+33612345678");
    expect(telephonePropre("12")).toBeNull();
    expect(lienAppel("02 96 00 00 00")).toBe("tel:0296000000");
  });

  it("un texte de l'IA ne garde ni e-mail, ni numéro, ni lien, et tient dans sa limite", () => {
    const t = texteSur("Appelez le 06 12 34 56 78 ou jean@toits.fr, voir www.toits.fr. Super travail.", 200);
    expect(t).not.toMatch(/06|@|www/);
    expect(t).toContain("Super travail.");
    expect(texteSur("a".repeat(500), 90).length).toBe(90);
  });

  it("proposition sans IA : tirée du profil seul, rien d'inventé", () => {
    const p = proposerTextes({ nom: "Toits Martin", metiers: ["roofing"], zone: "Lannion", creeeEn: 2008, certifications: ["RGE"], verifiee: true }, libelles);
    expect(p.accroche).toBe("Votre toiture entre de bonnes mains à Lannion");
    expect(p.presentation).toContain("Toits Martin intervient en couverture, charpente, zinguerie à Lannion");
    expect(p.presentation).toContain("2008");
    expect(p.presentation).not.toMatch(/\d{2} \d{2} \d{2}|@/);
  });
});
