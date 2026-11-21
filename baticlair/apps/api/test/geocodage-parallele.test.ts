import { describe, expect, it } from "vitest";
import { DemandeService } from "../src/modules/groupe/application/demande.service.js";
import type { Geocodeur } from "../src/modules/groupe/application/geocodeur.js";

/**
 * DETTE n° 15 (22 octobre) : au dépôt d'un devis négoce, la distance du dépôt à chaque chantier du lot. Les adresses se
 * géocodent par paquets en parallèle, chacune une seule fois ; une adresse introuvable (ou un service en panne) donne une
 * distance inconnue, jamais une erreur. Une à une, 20 chantiers à 5 s chacun dépassaient la durée d'une fonction.
 */
type AvecDistances = { distances(depart: string, besoins: readonly { id: string; adresseLivraison: string }[]): Promise<Record<string, number | null>> };

function service(geocodeur: Geocodeur): AvecDistances {
  const rien = null as never;
  return new DemandeService(rien, rien, rien, null, rien, { choisirLesLotsEnvoyes: async () => undefined }, undefined, geocodeur) as unknown as AvecDistances;
}

describe("distances au dépôt d'un devis négoce", () => {
  it("20 chantiers, 300 ms par adresse : moins de 2 s, une adresse géocodée une fois, une panne donne une distance inconnue", async () => {
    const appels: string[] = [];
    const geocodeur: Geocodeur = {
      async point(adresse) {
        appels.push(adresse);
        await new Promise((r) => setTimeout(r, 300));
        if (adresse.includes("panne")) throw new Error("service muet");
        if (adresse.includes("introuvable")) return null;
        return adresse.startsWith("Dépôt") ? { lat: 48.78, lon: -3.05 } : { lat: 48.73, lon: -3.46 };
      },
    };
    const besoins = Array.from({ length: 20 }, (_, i) => ({ id: `b${i}`, adresseLivraison: i === 18 ? "panne" : i === 19 ? "introuvable" : `${i % 10} rue du Port, 22300 Lannion` }));
    const debut = Date.now();
    const d = await service(geocodeur).distances("Dépôt, 22500 Paimpol", besoins);
    expect(Date.now() - debut).toBeLessThan(2000);
    expect(new Set(appels).size).toBe(appels.length);
    expect(appels).toHaveLength(13);
    expect(d.b0).toBeGreaterThan(30);
    expect(d.b18).toBeNull();
    expect(d.b19).toBeNull();
  });
});
