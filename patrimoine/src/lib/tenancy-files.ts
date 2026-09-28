import type { AppData } from "./types";

/** Fichiers rattachés aux baux : exemplaires signés du bail et des actes de caution. */
export function tenancyFileIds(data: AppData): Set<string> {
  const ids = new Set<string>();
  for (const t of data.tenancies) {
    if (t.signedLease?.fileId) ids.add(t.signedLease.fileId);
    for (const g of t.guarantors ?? []) if (g.signedFile?.fileId) ids.add(g.signedFile.fileId);
  }
  return ids;
}
