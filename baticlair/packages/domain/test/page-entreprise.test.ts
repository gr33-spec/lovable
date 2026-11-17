/**
 * MA PAGE MOBIIZ (Greg, 16 novembre 2026 ; refonte du même jour : un seul modèle, un vrai site d'artisan) : le moteur. Un
 * thème par métier du catalogue (quatre teintes, prestations proposées) ; contraste garanti ; l'adresse de la page ; jamais
 * une rubrique vide ; le grand titre « métier à ville » ; données structurées sans adresse exacte ni note inventée.
 */
import { describe, expect, it } from "vitest";
import {
  accrocheParDefaut,
  adresseDepuis,
  adressesCandidates,
  COULEURS_PAGE,
  contraste,
  descriptionDeLaPage,
  donneesStructurees,
  lienAppel,
  menuDeLaPage,
  photoAccueil,
  preuvesCourtes,
  proposerTextes,
  refusAdresse,
  rubriquesVisibles,
  siteWebPropre,
  teinteDe,
  TEINTES,
  telephonePropre,
  texteSur,
  THEMES_METIER,
  themeDuMetier,
  titreAccueil,
  titreDeLaPage,
  TRADES,
  villeDeLaZone,
  type ContenuPage,
  type PhotoPublique,
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
    couleur: null,
    logo: null,
    couverture: null,
    prestations: [],
    realisations: [],
    photoEquipe: null,
    majLe: "2026-11-16T10:00:00.000Z",
    ...partiel,
  };
}

const photo = (id: string): PhotoPublique => ({ id, legende: null, largeur: 1600, hauteur: 1000, variantes: [], partage: `/photos/${id}/partage.jpg` });

describe("thèmes par métier (un seul modèle, quatre teintes, prestations proposées)", () => {
  it("chaque métier du catalogue a son thème, une des quatre teintes, et (sauf « Autre ») des prestations avec une phrase", () => {
    for (const t of TRADES) {
      const th = THEMES_METIER[t.id];
      expect(th, t.id).toBeDefined();
      expect(TEINTES.map((x) => x.id)).toContain(th!.teinte);
      if (t.id !== "other") expect(th!.prestations.length, t.id).toBeGreaterThanOrEqual(2);
      for (const p of th!.prestations) {
        expect(p.titre.length).toBeLessThanOrEqual(60);
        expect(p.texte.length).toBeLessThanOrEqual(200);
        expect(p.texte).toMatch(/\.$/);
      }
    }
  });

  it("neuf teintes bien différentes, toutes lisibles en texte blanc et sur l'ivoire ; « Appeler » jaune à texte noir", () => {
    expect(TEINTES.map((t) => t.nom)).toEqual(["Ardoise", "Anthracite", "Bleu nuit", "Vert sapin", "Bleu roi", "Pétrole", "Bordeaux", "Rouge brique", "Prune"]);
    // Bien différentes (Greg, 17 novembre 2026) : jamais deux teintes du même code.
    expect(new Set(TEINTES.map((t) => t.hex.toLowerCase())).size).toBe(TEINTES.length);
    for (const t of TEINTES) {
      expect(contraste("#FFFFFF", t.hex), t.nom).toBeGreaterThanOrEqual(7);
      expect(contraste(t.hex, COULEURS_PAGE.ivoire), t.nom).toBeGreaterThanOrEqual(7);
    }
    expect(contraste(COULEURS_PAGE.encre, COULEURS_PAGE.jaune)).toBeGreaterThanOrEqual(10);
    expect(contraste(COULEURS_PAGE.doux, COULEURS_PAGE.ivoire)).toBeGreaterThanOrEqual(4.5);
  });

  it("la teinte : celle choisie si elle fait partie des quatre, sinon celle du métier (changer de métier la change)", () => {
    expect(teinteDe(contenu())).toBe("#3E5163");
    expect(teinteDe(contenu({ metierPrincipal: "painting" }))).toBe("#1F4D3A");
    expect(teinteDe(contenu({ metierPrincipal: "painting", couleur: "#1D3557" }))).toBe("#1D3557");
    expect(teinteDe(contenu({ couleur: "#FF00FF" }))).toBe("#3E5163");
  });

  it("le grand titre : le métier et la ville de la zone ; l'accroche d'exemple reste une suggestion", () => {
    expect(titreAccueil(contenu({ zone: "Lannion" }))).toBe("Couvreur à Lannion");
    expect(titreAccueil(contenu({ zone: "Lannion, Perros-Guirec et le Trégor" }))).toBe("Couvreur à Lannion");
    expect(titreAccueil(contenu())).toBe("Couvreur");
    expect(titreAccueil(contenu({ metierPrincipal: "painting", zone: "Saint-Brieuc" }))).toBe("Peintre à Saint-Brieuc");
    expect(villeDeLaZone("Brest (29)")).toBe("Brest");
    expect(accrocheParDefaut(themeDuMetier("roofing"), "Lannion")).toBe("Votre toiture entre de bonnes mains à Lannion");
    expect(themeDuMetier("inconnu").metier).toBe("other");
  });

  it("la ligne de preuves : seulement ce qui est vrai, trois au plus", () => {
    expect(preuvesCourtes(contenu({ verifiee: true, certifications: ["Assurance décennale", "RGE"], creeeEn: 2011 }), 2026)).toEqual(["Entreprise vérifiée", "Décennale", "15 ans d'expérience"]);
    expect(preuvesCourtes(contenu({ certifications: ["RGE", "Responsabilité civile pro"] }), 2026)).toEqual(["RGE"]);
    expect(preuvesCourtes(contenu({ creeeEn: 2026 }), 2026)).toEqual([]);
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

describe("rubriques : jamais une rubrique vide, ni dans la page ni dans le menu", () => {
  it("une page sans rien n'a que le contact", () => {
    expect(rubriquesVisibles(contenu())).toEqual(["contact"]);
    expect(menuDeLaPage(contenu()).map((m) => m.libelle)).toEqual(["Contact"]);
  });

  it("chaque rubrique apparaît avec son contenu seulement ; la zone n'est pas dans le menu", () => {
    const plein = contenu({ presentation: "Bonjour", zone: "Lannion", prestations: [{ titre: "Zinguerie", texte: "Gouttières." }], realisations: [{ id: "r", titre: "Toiture · Paimpol", photos: [photo("a")] }] });
    expect(rubriquesVisibles(plein)).toEqual(["prestations", "realisations", "a-propos", "zone", "contact"]);
    expect(menuDeLaPage(plein).map((m) => m.libelle)).toEqual(["Prestations", "Réalisations", "À propos", "Contact"]);
    expect(rubriquesVisibles(contenu({ presentation: "   " }))).not.toContain("a-propos");
    expect(rubriquesVisibles(contenu({ certifications: ["RGE"] }))).toContain("a-propos");
  });

  it("la photo d'accueil : la couverture, sinon le premier chantier, sinon aucune (jamais un dessin)", () => {
    expect(photoAccueil(contenu())).toBeNull();
    expect(photoAccueil(contenu({ realisations: [{ id: "r", titre: "x", photos: [photo("a"), photo("b")] }] }))?.id).toBe("a");
    expect(photoAccueil(contenu({ couverture: photo("c"), realisations: [{ id: "r", titre: "x", photos: [photo("a")] }] }))?.id).toBe("c");
  });
});

describe("Google et partage", () => {
  it("titre « métier à ville – nom »", () => {
    expect(titreDeLaPage(contenu({ zone: "Lannion" }))).toBe("Couvreur à Lannion – Toits Martin");
    expect(titreDeLaPage(contenu())).toBe("Couvreur – Toits Martin");
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
    const offres = donneesStructurees(contenu({ prestations: [{ titre: "Zinguerie", texte: "Gouttières." }], realisations: [{ id: "r", titre: "x", photos: [photo("a")] }] }), "u", libelles);
    expect(offres.makesOffer).toEqual([{ "@type": "Offer", itemOffered: { "@type": "Service", name: "Zinguerie", description: "Gouttières." } }]);
    expect(offres.image).toBe("/photos/a/partage.jpg");
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

describe("la ville du grand titre se lit (Greg, 17 novembre 2026 : « PLOUBAZLANEC » criait)", () => {
  it("une ville en capitales passe en minuscules avec ses majuscules ; une ville déjà écrite reste telle quelle", async () => {
    const { villeLisible, titreAccueil } = await import("../src/page-entreprise/page");
    expect(villeLisible("PLOUBAZLANEC")).toBe("Ploubazlanec");
    expect(villeLisible("SAINT-QUAY-PORTRIEUX")).toBe("Saint-Quay-Portrieux");
    expect(villeLisible("BOURG-EN-BRESSE")).toBe("Bourg-en-Bresse");
    expect(villeLisible("LE MANS")).toBe("Le Mans");
    expect(villeLisible("Perros-Guirec")).toBe("Perros-Guirec");
    expect(titreAccueil({ metierPrincipal: "roofing", zone: "PLOUBAZLANEC" })).toBe("Couvreur à Ploubazlanec");
  });
});
