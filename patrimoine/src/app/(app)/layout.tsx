import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StoreProvider } from "@/lib/store";
import { loadDocument } from "@/lib/server/db";
import { currentSession } from "@/lib/server/guard";
import { scopeForGestion } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await currentSession();
  if (!session) redirect("/connexion");
  const doc = await loadDocument();
  const gestion = session.role === "gestion";
  return (
    <StoreProvider initialData={gestion ? scopeForGestion(doc.data) : doc.data} initialVersion={doc.version} role={session.role}>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
