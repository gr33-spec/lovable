"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Truck, Warehouse, X } from "lucide-react";
import { useEffect, useRef } from "react";

/**
 * Le bouton « + » : un seul endroit pour ajouter quelque chose (PD-021).
 * On y crée un chantier ou un fournisseur ; le devis se dépose ensuite
 * depuis le chantier, qui reste le centre de tout (PD-032).
 */
export function AddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  // Fermer en changeant de page.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
      aria-labelledby="add-title"
      className="mt-auto mb-0 w-full max-w-none rounded-t-[28px] bg-ground p-0 backdrop:bg-ink/55 lg:m-auto lg:max-w-md lg:rounded-[28px]"
    >
      <div className="flex flex-col gap-3.5 px-4.5 pt-3 pb-8">
        <span className="mx-auto h-1.25 w-10 rounded-full bg-[#d1d5db] lg:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between">
          <h2 id="add-title" className="font-display text-[26px] font-extrabold tracking-[-0.02em]">
            Ajouter
          </h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="flex size-11 items-center justify-center rounded-full bg-surface">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <Link href="/chantiers/nouveau" className="flex min-h-18 items-center gap-3.5 rounded-[20px] bg-ink px-4 text-white">
          <span className="flex size-11 items-center justify-center rounded-[14px] bg-accent">
            <Warehouse size={22} aria-hidden="true" />
          </span>
          <span className="flex flex-col">
            <span className="text-base font-extrabold">Nouveau chantier</span>
            <span className="text-[13px] text-[#c9ced6]">Nom, client, adresse</span>
          </span>
        </Link>
        <Link href="/fournisseurs?nouveau" className="flex min-h-18 items-center gap-3.5 rounded-[20px] bg-surface px-4 shadow-card">
          <span className="flex size-11 items-center justify-center rounded-[14px] bg-ground">
            <Truck size={22} aria-hidden="true" />
          </span>
          <span className="flex flex-col">
            <span className="text-base font-extrabold">Nouveau fournisseur</span>
            <span className="text-[13px] text-muted">Société, e-mail, téléphone</span>
          </span>
        </Link>
      </div>
    </dialog>
  );
}
