/** État de chargement générique pendant la navigation entre écrans (§2.6). */
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div
        className="h-12 w-12 animate-spin rounded-full border-4 border-line border-t-blue"
        aria-hidden="true"
      />
      <p className="font-sans text-sm text-muted">Chargement…</p>
    </div>
  );
}
