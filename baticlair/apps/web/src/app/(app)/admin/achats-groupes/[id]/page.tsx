"use client";

import { useParams } from "next/navigation";
import { PorteAdmin, ValidationAchat } from "@/components/admin-achat-groupe";
import { BackButton } from "@/components/ui";

/** La validation d'un achat groupé par l'admin avant publication (point 14). */
export default function ValidationAchatPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/admin/achats-groupes" />
      <PorteAdmin>
        <ValidationAchat id={id} />
      </PorteAdmin>
    </div>
  );
}
