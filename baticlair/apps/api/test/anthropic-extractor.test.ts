import { describe, expect, it } from "vitest";
import { AnthropicTakeoffExtractor } from "../src/modules/takeoff/infrastructure/anthropic-takeoff-extractor.js";

const output = {
  lines: [{ designation: "Tuile romane", quantity: "1 250", unit: "u", reference: "TUI", sourceRefs: ["1:004"], sourcePages: [], doubt: null }],
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
    expect(attempt.output).toEqual(output);
    const sent = api.requests[0]!;
    expect(sent.url).toContain("/v1/messages");
    expect(sent.body).toMatchObject({ model: "claude-sonnet-5-5", output_config: { effort: "high", format: { type: "json_schema" } } });
    const content = (sent.body.messages as { content: { type: string; text?: string }[] }[])[0]!.content;
    expect(content[0]!.type).toBe("document");
    expect(content[1]!.text).toContain("[1:004]");
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
