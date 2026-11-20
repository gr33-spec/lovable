/**
 * « MON SITE », REVUE DU 19 NOVEMBRE 2026 (spécialiste UI/UX, développeur senior, saboteur) : aucune promesse écrite par
 * Mobiiz à la place de l'artisan, un lien Google qui ne mène que chez Google, et les coordonnées déguisées masquées.
 */
import { describe, expect, it } from "vitest";
import { COORDONNEES_MASQUEES, masquerCoordonnees } from "../src/missions/missions.js";
import { lienGooglePropre, proposerTextes } from "../src/page-entreprise/page.js";
import { THEMES_METIER } from "../src/page-entreprise/themes.js";

const PROMESSE = /rapide|rapidement|urgence|24 ?h|48 ?h|gratuit|garanti|nettoyage compris|protection du chantier|sans entretien|sûre et aux normes|sans mauvaise surprise|devis clair|chantier propre/i;

describe("aucune promesse écrite par Mobiiz", () => {
  it("ni dans les prestations proposées, ni dans les accroches et présentations des métiers", () => {
    for (const t of Object.values(THEMES_METIER)) {
      expect(t.accroche, t.metier).not.toMatch(PROMESSE);
      expect(t.presentation, t.metier).not.toMatch(PROMESSE);
      for (const p of t.prestations) expect(`${p.titre} ${p.texte}`, `${t.metier} · ${p.titre}`).not.toMatch(PROMESSE);
    }
  });
  it("ni dans les textes proposés sans IA", () => {
    const { accroche, presentation } = proposerTextes({ nom: "Toitures Le Goff", metiers: ["roofing"], zone: "Lannion", creeeEn: 2008, certifications: ["Qualibat"] } as Parameters<typeof proposerTextes>[0], { roofing: "Couverture" });
    expect(`${accroche} ${presentation}`).not.toMatch(PROMESSE);
  });
});

describe("le lien de la fiche Google", () => {
  it("refuse les redirections et l'ancien raccourcisseur", () => {
    for (const l of ["https://www.google.com/url?q=https://arnaque.example", "google.fr/url?q=https://x.example", "https://goo.gl/abcd", "javascript:alert(1)", "https://google.com.evil.fr/maps"]) expect(lienGooglePropre(l), l).toBeNull();
  });
  it("garde les vrais liens de fiche", () => {
    for (const l of ["https://maps.app.goo.gl/AbCd123", "https://g.page/r/abc", "https://www.google.com/maps/place/Toitures", "https://share.google/xyz"]) expect(lienGooglePropre(l), l).not.toBeNull();
  });
});

describe("les coordonnées déguisées sont masquées", () => {
  it("un « O » à la place du zéro, un e-mail en (at) ou arobase", () => {
    for (const t of ["O6 12 34 56 78", "o6.12.34.56.78", "contact (at) perso . fr", "contact [at] perso [dot] fr", "jean arobase perso point fr"]) expect(masquerCoordonnees(t), t).toContain(COORDONNEES_MASQUEES);
    expect(masquerCoordonnees("Appelle-moi au O6 12 34 56 78 demain")).toBe(`Appelle-moi au ${COORDONNEES_MASQUEES} demain`);
  });
  it("sans toucher aux textes ordinaires", () => {
    for (const t of ["Disponible le 01/03/2026 pour 2 couvreurs", "Octobre 2026, 3 personnes", "OK pour 10 jours", "Toiture 6 pans, 120 m²", "Ouvert 7 jours sur 7", "On se voit à la mairie", "Zinguerie et ardoise, 2 ouvriers"]) expect(masquerCoordonnees(t), t).toBe(t);
  });
});
