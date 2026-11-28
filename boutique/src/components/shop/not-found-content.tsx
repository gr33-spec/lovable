import Link from "next/link";

export function NotFoundContent() {
  return (
    <div className="container-page flex flex-col items-center py-20 text-center">
      <p className="eyebrow">Page introuvable</p>
      <h1 className="mt-3 text-5xl">Oups, cette page s&apos;est envolée</h1>
      <p className="mt-4 max-w-md text-text-2">Le lien est peut-être ancien, ou la création n&apos;est plus en ligne. Les autres bijoux vous attendent !</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/boutique" className="btn btn-primary">
          Voir les créations
        </Link>
        <Link href="/" className="btn btn-outline">
          Accueil
        </Link>
      </div>
    </div>
  );
}
