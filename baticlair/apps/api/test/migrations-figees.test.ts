import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * UNE MIGRATION POUSSÉE NE SE MODIFIE PLUS (dette n° 3, décision du 20 octobre 2026) : `prisma migrate deploy` n'applique
 * que les migrations nouvelles ; une migration déjà appliquée puis modifiée laisse les bases en ligne sans ses nouveaux
 * objets (la page de dépôt des négoces a répondu 500 en prévisualisation pour cette raison). Chaque migration a son
 * empreinte figée dans `prisma/migrations/empreintes.json` ; une nouvelle migration s'y ajoute par
 * `node scripts/empreintes-migrations.mjs`.
 */
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../prisma/migrations");

describe("migrations figées", () => {
  it("chaque migration a l'empreinte enregistrée, et chaque empreinte enregistrée a sa migration", () => {
    const figees = JSON.parse(readFileSync(path.join(dir, "empreintes.json"), "utf8")) as Record<string, string>;
    const presentes = readdirSync(dir).filter((n) => /^\d{14}_/.test(n)).sort();
    const modifiees: string[] = [];
    const nouvelles: string[] = [];
    for (const nom of presentes) {
      const e = createHash("sha256").update(readFileSync(path.join(dir, nom, "migration.sql"))).digest("hex");
      if (!figees[nom]) nouvelles.push(nom);
      else if (figees[nom] !== e) modifiees.push(nom);
    }
    expect(modifiees, "migration modifiée après avoir été figée : écris-en une nouvelle au lieu de changer celle-ci").toEqual([]);
    expect(nouvelles, "migration non figée : lance `node scripts/empreintes-migrations.mjs`").toEqual([]);
    expect(Object.keys(figees).filter((n) => !presentes.includes(n)), "empreinte sans migration").toEqual([]);
  });
});
