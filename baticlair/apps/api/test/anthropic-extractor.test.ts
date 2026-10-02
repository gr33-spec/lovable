import { describe, expect, it } from "vitest";
import { AnthropicTakeoffExtractor } from "../src/modules/takeoff/infrastructure/anthropic-takeoff-extractor.js";

/** Réponse compacte (prompt v7) : titres une seule fois, un seul champ de source. */
const output = {
  sections: [["TOITURE PRINCIPALE"]],
  lignes: [
    { des: "Tuile romane", qte: "1 250", unite: "u", ref: "TUI", src: ["1:004"], sec: 0, doute: null },
    { des: "Faîtière ronde", qte: "42", unite: "u", ref: null, src: ["2"], sec: null, doute: "Ronde ou angulaire ?" },
  ],
  notes: [],
};

function fakeApi(body: object, status = 200) {
  const requests: { url: string; body: Record<string, unknown> }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    requests.push({ url: String(url), body: JSON.parse(String(init.body)) as Record<string, unknown> });
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
  return { fetchImpl, requests };
}

const message = (text: string, stop_reason = "end_turn") => ({
  id: "msg_1",
  type: "message",
  role: "assistant",
  model: "claude-sonnet-5-5",
  content: [{ type: "text", text }],
  stop_reason,
  stop_sequence: null,
  usage: { input_tokens: 1200, output_tokens: 300, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
});

describe("lecture par l'API Anthropic (réseau simulé)", () => {
  it("envoie le texte numéroté, les pages image et un schéma de sortie imposé", async () => {
    const api = fakeApi(message(JSON.stringify(output)));
    const extractor = new AnthropicTakeoffExtractor("sk-test", "claude-sonnet-5-5", "high", api.fetchImpl);
    const attempt = await extractor.extract({
      tradeLabel: "Couverture",
      materialFamilies: ["Tuile"],
      numberedText: "[1:004] TUI  Tuile romane  1 250 u",
      imagePdf: new Uint8Array([37, 80, 68, 70]),
      imagePages: [2],
    });

    expect(attempt).toMatchObject({ status: "success", model: "claude-sonnet-5-5", usage: { inputTokens: 1200, outputTokens: 300 } });
    // Remise dans la forme complète : rien de perdu, rien d'inventé.
    expect(attempt.output).toEqual({
      lines: [
        { designation: "Tuile romane", quantity: "1 250", unit: "u", reference: "TUI", sourceRefs: ["1:004"], sourcePages: [], doubt: null, section: ["TOITURE PRINCIPALE"] },
        { designation: "Faîtière ronde", quantity: "42", unit: "u", reference: null, sourceRefs: [], sourcePages: [2], doubt: "Ronde ou angulaire ?", section: [] },
      ],
      notes: [],
    });
    const sent = api.requests[0]!;
    expect(sent.url).toContain("/v1/messages");
    expect(sent.body).toMatchObject({ model: "claude-sonnet-5-5", output_config: { effort: "high", format: { type: "json_schema" } } });
    const content = (sent.body.messages as { content: { type: string; text?: string }[] }[])[0]!.content;
    expect(content[0]!.type).toBe("document");
    expect(content[1]!.text).toContain("[1:004]");
    // Devis normal : aucune consigne de découpage.
    expect(content[1]!.text).not.toContain("plusieurs parties");
  });

  it("bloc d'un gros devis : la consigne nomme les pages à lister", async () => {
    const api = fakeApi(message(JSON.stringify(output)));
    await new AnthropicTakeoffExtractor("sk-test", "claude-sonnet-5-5", "high", api.fetchImpl).extract({
      tradeLabel: "Couverture",
      materialFamilies: ["Tuile"],
      numberedText: "[3:001] x\n[4:001] y",
      imagePdf: null,
      imagePages: [],
      scope: { pages: [4] },
    });
    const content = (api.requests[0]!.body.messages as { content: { type: string; text?: string }[] }[])[0]!.content;
    expect(content[0]!.text).toContain("liste UNIQUEMENT les lignes qui commencent sur les pages 4.");
  });

  it("un numéro de section inconnu ne devient jamais un titre inventé", async () => {
    const odd = { ...output, lignes: [{ ...output.lignes[0]!, sec: 7 }] };
    const attempt = await new AnthropicTakeoffExtractor("sk-test", "claude-sonnet-5-5", "high", fakeApi(message(JSON.stringify(odd))).fetchImpl).extract({
      tradeLabel: "Couverture",
      materialFamilies: [],
      numberedText: "[1:004] x",
      imagePdf: null,
      imagePages: [],
    });
    expect(attempt.output!.lines[0]!.section).toEqual([]);
  });

  it("signale une réponse inexploitable ou coupée sans planter", async () => {
    const cut = fakeApi(message('{"lines": [', "max_tokens"));
    const attempt = await new AnthropicTakeoffExtractor("sk-test", "claude-sonnet-5-5", "high", cut.fetchImpl).extract({
      tradeLabel: "Couverture",
      materialFamilies: ["Tuile"],
      numberedText: "[1:001] x",
      imagePdf: null,
      imagePages: [],
    });
    expect(attempt.status).toBe("invalid_output");
    expect(attempt.usage.outputTokens).toBe(300);
  });

  it("rapporte une erreur du fournisseur comme une tentative ratée", async () => {
    const down = fakeApi({ type: "error", error: { type: "overloaded_error", message: "busy" } }, 529);
    const attempt = await new AnthropicTakeoffExtractor("sk-test", "claude-sonnet-5-5", "high", down.fetchImpl).extract({
      tradeLabel: "Couverture",
      materialFamilies: ["Tuile"],
      numberedText: "[1:001] x",
      imagePdf: null,
      imagePages: [],
    });
    expect(attempt).toMatchObject({ status: "provider_error", errorCode: "http_529" });
  });
});

describe("réponse compacte (prompt v7) sur un vrai devis du banc", () => {
  it("Morellec : même information qu'avant, réponse bien plus légère", async () => {
    const { MORELLEC_LINES } = await import("../../../packages/domain/test/devis-reels/electricite-plomberie-morellec.js");
    const full = {
      lines: MORELLEC_LINES.map((l, i) => ({
        designation: l.designation,
        quantity: l.quantity,
        unit: l.unit,
        reference: null,
        sourceRefs: [`${Math.floor(i / 19) + 1}:${String((i % 19) + 1).padStart(3, "0")}`],
        sourcePages: [],
        doubt: null,
        section: [...(l.section ?? [])],
      })),
      notes: [],
    };
    const keys = [...new Set(full.lines.map((l) => JSON.stringify(l.section)).filter((k) => k !== "[]"))];
    const wire = {
      sections: keys.map((k) => JSON.parse(k) as string[]),
      lignes: full.lines.map((l) => ({
        des: l.designation,
        qte: l.quantity,
        unite: l.unit,
        ref: null,
        src: l.sourceRefs,
        sec: l.section.length > 0 ? keys.indexOf(JSON.stringify(l.section)) : null,
        doute: null,
      })),
      notes: [],
    };
    const attempt = await new AnthropicTakeoffExtractor("sk-test", "claude-sonnet-5-5", "high", fakeApi(message(JSON.stringify(wire))).fetchImpl).extract({
      tradeLabel: "Électricité",
      materialFamilies: [],
      numberedText: "[1:001] x",
      imagePdf: null,
      imagePages: [],
    });
    expect(attempt.output).toEqual(full);
    // Avant (v6) : chaque ligne répétait ses titres et ses noms de champ longs.
    const before = JSON.stringify(full).length;
    const after = JSON.stringify(wire).length;
    // Mesuré : environ 40 % de moins.
    expect(after / before).toBeLessThan(0.62);
  });
});
