const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Un identifiant mal formé est traité comme « introuvable », jamais comme une erreur SQL. */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}
