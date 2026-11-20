import { describe, expect, it } from "vitest";
import { z } from "zod";
import { lignesEnCours, type LectureReader, type LignesEnCours } from "../src/modules/takeoff/application/lecture-reader.js";
import { suiviDesLignes } from "../src/modules/takeoff/application/takeoff.service.js";
import { AnthropicDocumentReader } from "../src/platform/ai/anthropic-document-reader.js";

/**
 * LES LIGNES UNE PAR UNE PENDANT LA LECTURE (Greg, 17 novembre 2026 : « affiche les lignes une par une dès qu'elles sont
 * lues, avec les étapes visibles, pour que l'attente se voie comme une liste qui se construit »).
 * Rien du modèle n'est montré tel quel : seulement les mots que le code retrouve dans le texte du devis.
 */

const DEVIS = [
  "[1] Dépose de la couverture existante",
  "[2] Fourniture et pose d'ardoises naturelles 32 x 22 45,00 m2",
  "[3] Gouttière zinc demi-ronde",
  "[4] développé 33 12,00 ml",
  "[5] Main d'œuvre 2 jours",
].join("\n");

const ligne = (designation: string, role: string, suite = `,"fournitures":[]}`) => `{"ref":"1","designation":${JSON.stringify(designation)},"quantite":"45","unite":"m2","role":"${role}"${suite}`;
const debut = `{"metier":"roofing","lots":[{"metier":"roofing","libelle":"Couverture","lignes":["1","2"]}],"fiche":[],"bref":["Une réfection."],"questions":[],"lignes":[`;

describe("lignesEnCours : ce qui est déjà lu dans une réponse en train de s'écrire", () => {
  it("rien tant qu'aucune ligne n'est écrite jusqu'à son rôle", () => {
    expect(lignesEnCours(debut, DEVIS)).toEqual({ lignes: [], total: 0 });
    expect(lignesEnCours(`${debut}{"ref":"2","designation":"Fourniture et pose d'ardoises nat`, DEVIS)).toEqual({ lignes: [], total: 0 });
  });

  it("une ligne écrite s'affiche avec les mots du devis, dans l'ordre ; la suivante, à moitié écrite, attend", () => {
    const partiel = `${debut}${ligne("Fourniture et pose d'ardoises naturelles 32 x 22", "fourniture_et_pose")},{"ref":"3","designation":"Gouttière zi`;
    expect(lignesEnCours(partiel, DEVIS)).toEqual({ lignes: ["Fourniture et pose d'ardoises naturelles 32 x 22"], total: 1 });
  });

  it("les mots que le devis n'écrit pas ne sont jamais montrés : seul le début retrouvé dans le devis s'affiche", () => {
    const partiel = `${debut}${ligne("Gouttière zinc demi-ronde en zinc naturel de 0,65 mm", "fourniture")}`;
    expect(lignesEnCours(partiel, DEVIS).lignes).toEqual(["Gouttière zinc demi-ronde"]);
  });

  it("une désignation écrite sur deux lignes du devis est retrouvée entière", () => {
    const partiel = `${debut}${ligne("Gouttière zinc demi-ronde développé 33", "fourniture")}`;
    expect(lignesEnCours(partiel, DEVIS).lignes).toEqual(["Gouttière zinc demi-ronde développé 33"]);
  });

  it("une ligne hors quantitatif (main-d'œuvre) n'est ni montrée ni comptée", () => {
    const partiel = `${debut}${ligne("Main d'œuvre 2 jours", "hors_quantitatif")},${ligne("Dépose de la couverture existante", "pose")}`;
    expect(lignesEnCours(partiel, DEVIS)).toEqual({ lignes: ["Dépose de la couverture existante"], total: 1 });
  });

  it("une photo ou un scan (aucun texte à comparer) : les lignes sont comptées, aucune n'est montrée", () => {
    const partiel = `${debut}${ligne("Ardoises 32 x 22", "fourniture")},${ligne("Crochets inox", "fourniture")}`;
    expect(lignesEnCours(partiel, "")).toEqual({ lignes: [], total: 2 });
  });

  it("une ligne inventée, absente du devis, est comptée mais jamais montrée", () => {
    const partiel = `${debut}${ligne("Écran de sous-toiture HPV", "fourniture")}`;
    expect(lignesEnCours(partiel, DEVIS)).toEqual({ lignes: [], total: 1 });
  });
});

describe("suiviDesLignes : ce que l'écran peut lire pendant la lecture", () => {
  const banc = (pasMs = 1000) => {
    const notes: LignesEnCours[] = [];
    let t = 10_000;
    const suivi = suiviDesLignes(
      async (lues) => {
        notes.push(lues);
      },
      pasMs,
      () => t,
    );
    return { notes, suivi, avance: (ms: number) => (t += ms) };
  };
  /** Un lecteur dont chaque appel attend qu'on le termine, et dit ce qu'on lui fait dire. */
  const lecteurTenu = () => {
    const appels: { dire: (l: LignesEnCours) => void; finir: () => void }[] = [];
    const lecteur: LectureReader = {
      provider: "test",
      lire: (request) =>
        new Promise((resolve) => {
          appels.push({ dire: (l) => request.surLignes?.(l), finir: () => resolve(null) });
        }),
    };
    return { lecteur, appels };
  };

  it("note les lignes au plus une fois par pas, et seulement quand il y en a de nouvelles", async () => {
    const { notes, suivi, avance } = banc();
    const { lecteur, appels } = lecteurTenu();
    const lu = suivi.lecteur(lecteur).lire({ document: { numberedText: "", imagePdf: null, imagePages: [] }, tradeLabel: "Couverture", referentiel: "" });
    appels[0]!.dire({ lignes: ["a"], total: 1 });
    appels[0]!.dire({ lignes: ["a", "b"], total: 2 });
    avance(1000);
    appels[0]!.dire({ lignes: ["a", "b"], total: 2 });
    appels[0]!.dire({ lignes: ["a", "b", "c"], total: 3 });
    appels[0]!.finir();
    await lu;
    await suivi.fin();
    expect(notes).toEqual([
      { lignes: ["a"], total: 1 },
      { lignes: ["a", "b"], total: 2 },
      { lignes: [], total: 0 },
    ]);
  });

  it("deux appels simultanés (un par métier) s'ajoutent, dans l'ordre où ils sont partis", async () => {
    const { notes, suivi, avance } = banc();
    const { lecteur, appels } = lecteurTenu();
    const suivis = suivi.lecteur(lecteur);
    const requete = { document: { numberedText: "", imagePdf: null, imagePages: [] }, tradeLabel: "Couverture", referentiel: "" };
    const un = suivis.lire(requete);
    const deux = suivis.lire(requete);
    appels[1]!.dire({ lignes: ["zinc"], total: 1 });
    avance(1000);
    appels[0]!.dire({ lignes: ["ardoise"], total: 1 });
    appels.forEach((a) => a.finir());
    await Promise.all([un, deux]);
    expect(notes.at(-1)).toEqual({ lignes: ["ardoise", "zinc"], total: 2 });
    await suivi.fin();
  });

  it("une relecture, partie seule après la première, repart de zéro : jamais deux fois les mêmes lignes", async () => {
    const { notes, suivi, avance } = banc();
    const { lecteur, appels } = lecteurTenu();
    const suivis = suivi.lecteur(lecteur);
    const requete = { document: { numberedText: "", imagePdf: null, imagePages: [] }, tradeLabel: "Couverture", referentiel: "" };
    const un = suivis.lire(requete);
    appels[0]!.dire({ lignes: ["a", "b"], total: 2 });
    appels[0]!.finir();
    await un;
    avance(1000);
    const deux = suivis.lire(requete);
    appels[1]!.dire({ lignes: ["a"], total: 1 });
    appels[1]!.finir();
    await deux;
    expect(notes.at(-1)).toEqual({ lignes: ["a"], total: 1 });
    await suivi.fin();
  });

  it("après la fin, plus rien n'est noté ; une lecture qui n'a rien montré n'écrit rien", async () => {
    const { notes, suivi } = banc();
    const { lecteur, appels } = lecteurTenu();
    const lu = suivi.lecteur(lecteur).lire({ document: { numberedText: "", imagePdf: null, imagePages: [] }, tradeLabel: "Couverture", referentiel: "" });
    await suivi.fin();
    appels[0]!.dire({ lignes: ["a"], total: 1 });
    appels[0]!.finir();
    await lu;
    expect(notes).toEqual([]);
  });
});

describe("le lecteur Anthropic au fil de l'eau", () => {
  const evenement = (type: string, data: object) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
  const flux = (morceaux: string[]) => {
    const usage = { input_tokens: 100, output_tokens: 20, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
    const corps = [
      evenement("message_start", { message: { id: "msg_1", type: "message", role: "assistant", model: "claude-sonnet-5-5", content: [], stop_reason: null, stop_sequence: null, usage } }),
      evenement("content_block_start", { index: 0, content_block: { type: "text", text: "" } }),
      ...morceaux.map((text) => evenement("content_block_delta", { index: 0, delta: { type: "text_delta", text } })),
      evenement("content_block_stop", { index: 0 }),
      evenement("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 20 } }),
      evenement("message_stop", {}),
    ].join("");
    return new Response(corps, { status: 200, headers: { "content-type": "text/event-stream" } });
  };
  const schema = z.object({ lignes: z.array(z.string()) });
  const requete = { system: "Lis.", schema, document: { numberedText: "[1] ardoises", imagePdf: null, imagePages: [] }, documentName: "devis", tag: "test-v1" };

  it("donne le texte déjà écrit à chaque morceau, puis la même réponse complète qu'un appel d'un bloc", async () => {
    const corps: unknown[] = [];
    const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
      corps.push(JSON.parse(String(init?.body)));
      return flux(['{"lignes":["ardo', 'ises"', "]}"]);
    }) as typeof fetch;
    const vus: string[] = [];
    const lecteur = new AnthropicDocumentReader("cle-de-test", "claude-sonnet-5-5", "medium", fetchImpl);
    const lu = await lecteur.read({ ...requete, surTexte: (t) => vus.push(t) });
    expect(vus).toEqual(['{"lignes":["ardo', '{"lignes":["ardoises"', '{"lignes":["ardoises"]}']);
    expect(lu.status).toBe("success");
    expect(lu.output).toEqual({ lignes: ["ardoises"] });
    expect(lu.usage.inputTokens).toBe(100);
    expect((corps[0] as { stream?: boolean }).stream).toBe(true);
  });

  it("sans suivi demandé, l'appel reste d'un bloc (rien ne change pour les autres lectures)", async () => {
    const corps: unknown[] = [];
    const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
      corps.push(JSON.parse(String(init?.body)));
      const message = { id: "msg_1", type: "message", role: "assistant", model: "claude-sonnet-5-5", content: [{ type: "text", text: '{"lignes":[]}' }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } };
      return new Response(JSON.stringify(message), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    const lu = await new AnthropicDocumentReader("cle-de-test", "claude-sonnet-5-5", "medium", fetchImpl).read(requete);
    expect(lu.status).toBe("success");
    expect((corps[0] as { stream?: boolean }).stream).toBeUndefined();
  });

  it("un suivi en panne ne casse jamais la lecture", async () => {
    const fetchImpl = (async () => flux(['{"lignes":[]}'])) as typeof fetch;
    const lu = await new AnthropicDocumentReader("cle-de-test", "claude-sonnet-5-5", "medium", fetchImpl).read({
      ...requete,
      surTexte: () => {
        throw new Error("suivi en panne");
      },
    });
    expect(lu.status).toBe("success");
  });
});
