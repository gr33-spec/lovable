/** N'accepte qu'un chemin interne (« /chantiers?q=… ») : pas de redirection vers un autre site. */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
