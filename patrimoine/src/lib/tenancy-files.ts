/** Fichiers propres au dossier d'un locataire (supprimés avec lui). */
export function filesOfTenancy(t: import("./types").Tenancy): string[] {
  return [t.signedLease?.fileId, ...(t.guarantors ?? []).map((g) => g.signedFile?.fileId), ...(t.letters ?? []).map((l) => l.file?.fileId)].filter((x): x is string => !!x);
}

/**
 * Tous les fichiers cités par un ensemble de données (champs `fileId`, photos
 * des états des lieux), où qu'ils soient. Sert à n'ouvrir à un accès restreint
 * que les pièces de son périmètre.
 */
export function referencedFileIds(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const v of value) referencedFileIds(v, out);
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === "fileId" && typeof v === "string") {
        out.add(v);
      } else if (k === "photos" && Array.isArray(v)) {
        for (const p of v) if (typeof p === "string") out.add(p);
      } else {
        referencedFileIds(v, out);
      }
    }
  }
  return out;
}
