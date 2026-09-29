"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrderSearch({ initial, statut }: { initial: string; statut: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  return (
    <form
      role="search"
      className="relative mb-4"
      onSubmit={(e) => {
        e.preventDefault();
        const p = new URLSearchParams();
        if (q.trim()) p.set("q", q.trim());
        if (statut) p.set("statut", statut);
        router.push(`/admin/commandes${p.size ? `?${p}` : ""}`);
      }}
    >
      <Search size={18} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-text-2" aria-hidden="true" />
      <label htmlFor="order-search" className="sr-only">
        Rechercher une commande
      </label>
      <input id="order-search" type="search" className="input !pl-10" placeholder="N° de commande, nom ou e-mail…" value={q} onChange={(e) => setQ(e.target.value)} />
    </form>
  );
}
