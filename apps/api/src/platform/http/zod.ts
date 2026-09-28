import type { PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";

/** Valide et convertit une entrée (body, query, param) avec un schéma Zod. */
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}
  transform(value: unknown): T {
    return this.schema.parse(value);
  }
}
