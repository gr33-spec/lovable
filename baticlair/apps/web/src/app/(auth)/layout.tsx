import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4 pt-8 pb-12">
      <Link href="/" className="flex items-center gap-2.5 self-start" aria-label="BatiClair, accueil">
        <span className="flex size-9 items-center justify-center rounded-full bg-ink" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12 12 4l9 8" />
            <path d="M7 20h10" />
          </svg>
        </span>
        <span className="text-base font-extrabold">BatiClair</span>
      </Link>
      {children}
    </main>
  );
}
