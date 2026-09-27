import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { StoreProvider } from "@/lib/store";
import { loadDocument } from "@/lib/server/db";
import { isAuthenticated } from "@/lib/server/guard";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthenticated())) redirect("/connexion");
  const doc = await loadDocument();
  return (
    <StoreProvider initialData={doc.data} initialVersion={doc.version}>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
