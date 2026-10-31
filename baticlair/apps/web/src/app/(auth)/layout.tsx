import { PiedLegal } from "@/components/legal";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { NOM_APP } from "@/lib/nom";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 pt-8 pb-12">
      <Link href="/" className="flex items-center gap-2.5 self-start" aria-label={`${NOM_APP}, accueil`}>
        <Logo hauteur={28} />
      </Link>
      {children}
      <PiedLegal />
    </main>
  );
}
