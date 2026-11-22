import { describe, expect, it } from "vitest";
import { versionEnLigne } from "../src/modules/health/http/version.controller.js";

describe("/version : le commit en ligne, rien d'autre", () => {
  it("donne le commit posé par l'hébergeur et l'environnement, jamais une autre variable", () => {
    const v = versionEnLigne({ VERCEL_GIT_COMMIT_SHA: "9CEAC7D0A1B2", VERCEL_ENV: "preview", BATICLAIR_ANTHROPIC_KEY: "secret", DATABASE_URL: "postgres://x" });
    expect(v).toEqual({ commit: "9ceac7d0a1b2", environnement: "test" });
    expect(JSON.stringify(v)).not.toMatch(/secret|postgres/);
  });
  it("sans hébergeur, ou une valeur qui n'est pas un commit : rien", () => {
    expect(versionEnLigne({})).toEqual({ commit: null, environnement: "local" });
    expect(versionEnLigne({ VERCEL_GIT_COMMIT_SHA: "pas un commit", VERCEL_ENV: "production" })).toEqual({ commit: null, environnement: "production" });
  });
});
