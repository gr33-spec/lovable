"use client";

import { ListeAdminAchats, PorteAdmin } from "@/components/admin-achat-groupe";
import { BackButton, PageTitle } from "@/components/ui";

/** L'admin des achats groupés par métier (Greg, 27 octobre 2026, 2e message). */
export default function AdminAchatsGroupesPage() {
  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/admin/pilotage" />
      <PageTitle>Achats groupés</PageTitle>
      <PorteAdmin>
        <ListeAdminAchats />
      </PorteAdmin>
    </div>
  );
}
