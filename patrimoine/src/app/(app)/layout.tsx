import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { VIEW_COOKIE } from "@/lib/view";
import { AppShell } from "@/components/app-shell";
import { ThemeStyle } from "@/components/theme/theme-style";
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
  const view = gestion || (await cookies()).get(VIEW_COOKIE)?.value === "gestion" ? "gestion" : "patrimoine";
  return (
    <StoreProvider initialData={gestion ? scopeForGestion(doc.data) : doc.data} initialVersion={doc.version} role={session.role} view={view}>
      <ThemeStyle />
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
