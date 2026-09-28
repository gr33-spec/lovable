import js from "@eslint/js";
import tseslint from "typescript-eslint";

const INTERNAL_LAYERS = ["domain", "application", "infrastructure", "http"];

export default tseslint.config(
  { ignores: ["dist/**", "src/generated/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      // Frontières de modules (docs/architecture.md, règle 3) : un module
      // n'importe d'un autre module que son index.ts public.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: INTERNAL_LAYERS.flatMap((layer) => [`../../*/${layer}/*`, `../*/${layer}/*`]),
              message: "Importer l'API publique du module (son index.ts), pas ses fichiers internes.",
            },
          ],
        },
      ],
    },
  },
  {
    // Le domaine et les cas d'usage ne dépendent d'aucun framework ni prestataire.
    files: ["src/modules/*/domain/**", "src/modules/*/application/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@nestjs/*", "express", "better-auth", "better-auth/*", "@prisma/*", "**/generated/**", "pg"], message: "Couche métier : passer par un port." },
            { group: INTERNAL_LAYERS.flatMap((layer) => [`../../*/${layer}/*`]), message: "Importer l'API publique du module (son index.ts)." },
            { group: ["../infrastructure/*", "../http/*"], message: "Le métier ne dépend pas des adapters." },
          ],
        },
      ],
    },
  },
);
