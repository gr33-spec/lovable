import Link from "next/link";

/** Une adresse inconnue (audit avant commercialisation, 2026-10-11) : en français, avec le chemin du retour. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-5">
      <h1 className="font-display text-[26px] leading-tight font-extrabold">Page introuvable</h1>
      <p className="text-[15px] text-muted">Ce lien ne mène nulle part : il a peut-être été coupé, ou le chantier a été supprimé.</p>
      <Link href="/" className="inline-flex min-h-13 items-center justify-center rounded-2xl bg-cta px-5 text-base font-extrabold text-white">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
