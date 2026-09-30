import { CalendarHeart } from "lucide-react";
import Link from "next/link";
import { ReservationList } from "@/components/admin/reservation-list";
import { PageTitle } from "@/components/admin/ui";
import { getSettings } from "@/lib/server/cached";
import { expireReservations, listReservations, reservationCounts, type ReservationFilter } from "@/lib/server/reservations";
import { RESERVATION_HOURS } from "@/lib/sales-mode";

export const metadata = { title: "Réservations" };

const FILTERS: { v: ReservationFilter; label: string }[] = [
  { v: "pending", label: "En attente" },
  { v: "confirmed", label: "Confirmées" },
  { v: "closed", label: "Annulées / expirées" },
  { v: "all", label: "Toutes" },
];

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.v === sp.statut)?.v ?? "pending";
  // Les réservations non confirmées à temps sont libérées avant l'affichage (si l'option est active).
  await expireReservations(50);
  const [settings, rows, counts] = await Promise.all([getSettings(), listReservations(filter), reservationCounts()]);
  return (
    <>
      <PageTitle
        title="Réservations"
        subtitle={
          settings.reservationAutoExpire
            ? `Les réservations non confirmées sont libérées automatiquement après ${RESERVATION_HOURS} h.`
            : "Les réservations restent bloquées jusqu'à votre décision."
        }
      />
      <nav aria-label="Filtrer les réservations" className="-mx-4 mb-4 overflow-x-auto px-4 no-scrollbar">
        <ul className="flex gap-2">
          {FILTERS.map((f) => (
            <li key={f.v}>
              <Link href={f.v === "pending" ? "/admin/reservations" : `/admin/reservations?statut=${f.v}`} className="chip" aria-current={filter === f.v ? "page" : undefined}>
                {f.label}
                {counts[f.v] > 0 && <span className="ml-1.5 tabular-nums opacity-70">{counts[f.v]}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <CalendarHeart size={32} className="text-text-2" aria-hidden="true" />
          <p className="font-serif text-2xl">{filter === "pending" ? "Aucune réservation en attente" : "Rien ici pour le moment"}</p>
          <p className="max-w-md text-text-2">Dès qu&apos;une cliente réserve un bijou, il apparaît ici et vous recevez un e-mail.</p>
        </div>
      ) : (
        <ReservationList rows={rows} shopName={settings.shopName} autoExpire={settings.reservationAutoExpire} />
      )}
    </>
  );
}
