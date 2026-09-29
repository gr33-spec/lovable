import { getSettings } from "@/lib/server/cached";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings().catch(() => null);
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center font-serif text-3xl">{s?.shopName ?? "La Bohème en Paillettes"}</p>
        <div className="card p-6 shadow-soft sm:p-8">{children}</div>
      </div>
    </main>
  );
}
