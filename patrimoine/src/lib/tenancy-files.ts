import type { AppData } from "./types";

/** Fichiers rattachés aux baux : exemplaires signés du bail et des actes de caution. */
export function tenancyFileIds(data: AppData): Set<string> {
  const ids = new Set<string>();
  for (const t of data.tenancies) {
    if (t.signedLease?.fileId) ids.add(t.signedLease.fileId);
    for (const g of t.guarantors ?? []) if (g.signedFile?.fileId) ids.add(g.signedFile.fileId);
    for (const l of t.letters ?? []) if (l.file?.fileId) ids.add(l.file.fileId);
  }
  return ids;
}

/** Fichiers propres au dossier d'un locataire (supprimés avec lui). */
export function filesOfTenancy(t: import("./types").Tenancy): string[] {
  return [t.signedLease?.fileId, ...(t.guarantors ?? []).map((g) => g.signedFile?.fileId), ...(t.letters ?? []).map((l) => l.file?.fileId)].filter((x): x is string => !!x);
}
