import type { ArtisanRound, SupplierReply, SupplierRound } from "@baticlair/domain";
import { AnthropicDocumentReader } from "../../../platform/ai/anthropic-document-reader.js";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";
import {
  artisanBrief,
  artisanSystem,
  artisanWire,
  replyBrief,
  replySystem,
  replyWire,
  REVIEW_PROMPT,
  supplierSystem,
  supplierWire,
  type ReviewInput,
  type TakeoffReviewer,
} from "../application/takeoff-reviewer.js";

/** Les deux voix de la relecture, par Claude (Sonnet) : trois tours courts sur le dossier en texte. */
export class AnthropicTakeoffReviewer implements TakeoffReviewer {
  readonly provider = "anthropic";
  private readonly reader: AnthropicDocumentReader;

  constructor(apiKey: string, model: string, fetchImpl?: typeof fetch) {
    this.reader = new AnthropicDocumentReader(apiKey, model, "medium", fetchImpl);
  }

  private ask<T>(system: string, schema: Parameters<AnthropicDocumentReader["read"]>[0]["schema"], input: ReviewInput, extra?: string): Promise<ReadAttempt<T>> {
    return this.reader.read({
      system,
      schema,
      document: { numberedText: input.dossier, imagePdf: null, imagePages: [] },
      documentName: "dossier",
      ...(extra ? { extra } : {}),
      tag: `${REVIEW_PROMPT.id}-v${REVIEW_PROMPT.version}`,
    }) as Promise<ReadAttempt<T>>;
  }

  supplier(input: ReviewInput): Promise<ReadAttempt<SupplierRound>> {
    return this.ask(supplierSystem(input.tradeLabel), supplierWire, input);
  }

  artisan(input: ReviewInput & { supplier: SupplierRound }): Promise<ReadAttempt<ArtisanRound>> {
    return this.ask(artisanSystem(input.tradeLabel), artisanWire, input, artisanBrief(input.supplier));
  }

  reply(input: ReviewInput & { supplier: SupplierRound; artisan: ArtisanRound }): Promise<ReadAttempt<SupplierReply>> {
    return this.ask(replySystem(input.tradeLabel), replyWire, input, replyBrief(input.supplier, input.artisan));
  }
}
