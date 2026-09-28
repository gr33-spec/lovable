"use client";

import { goBack } from "@/lib/nav";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCheck, ChevronDown, Gauge, KeyRound, MessageSquarePlus, Minus, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Inspection, InspectionItem, InspectionRoom, ItemState } from "@/lib/types";
import { ITEM_STATES, compareInspections, itemsFor, missingMentions, newRoom, stateLabel } from "@/lib/legal/inspection";
import { unitAddress } from "@/lib/legal/doc";
import { dateFr } from "@/lib/format";
import { Button, Card, DateField, Empty, Page, PageHeader, SectionTitle, Stack, TextField, cx } from "../ui";
import { DocRow, PhotoStrip, SignaturePad, documentUrl } from "./common";

export function InspectionEditor({ unitId, inspectionId }: { unitId: string; inspectionId: string }) {
  return (
    <Suspense>
      <Editor unitId={unitId} inspectionId={inspectionId} />
    </Suspense>
  );
}

const uid = () => crypto.randomUUID();

function Editor({ unitId, inspectionId }: { unitId: string; inspectionId: string }) {
  const { data, upsert } = useStore();
  const router = useRouter();
  const back = useSearchParams().get("retour") || `/patrimoine/logement/${unitId}`;
  const insp = data.inspections.find((i) => i.id === inspectionId);
  const unit = data.units.find((u) => u.id === unitId);
  const tenancy = data.tenancies.find((t) => t.id === insp?.tenancyId);
  const [open, setOpen] = useState<string | null>(null);
  if (!insp || !unit || !tenancy) {
    return (
      <>
        <PageHeader title="État des lieux" back={back} />
        <Empty title="État des lieux introuvable" />
      </>
    );
  }
  const exit = insp.kind === "sortie";
  const entry = exit ? data.inspections.find((i) => i.id === insp.entryId) : undefined;
  const building = data.buildings.find((b) => b.id === unit.buildingId);
  const company = data.companies.find((c) => c.id === building?.companyId);
  const set = (patch: Partial<Inspection>) => upsert("inspections", { ...insp, ...patch });
  const setRoom = (roomId: string, patch: Partial<InspectionRoom>) => set({ rooms: insp.rooms.map((r) => (r.id === roomId ? { ...r, ...patch } : r)) });
  const setItem = (room: InspectionRoom, itemId: string, patch: Partial<InspectionItem>) => setRoom(room.id, { items: room.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) });

  const total = insp.rooms.reduce((n, r) => n + r.items.length, 0);
  const done = insp.rooms.reduce((n, r) => n + r.items.filter((i) => i.state).length, 0);
  const cmp = exit ? compareInspections(entry, insp) : undefined;
  const missing = missingMentions(insp, {
    tenantNames: tenancy.tenants.map((p) => [p.firstName, p.lastName].filter(Boolean).join(" ")).filter(Boolean),
    landlordName: company?.name ?? data.settings.ownerName,
    address: unitAddress(unit, building) || undefined,
    tenantNewAddress: tenancy.tenants.map((p) => p.address).filter(Boolean).join(" ") || undefined,
  });

  const finish = () => {
    set({ completedAt: new Date().toISOString() });
    // Les clés sont en principe remises le jour de l'état des lieux de sortie.
    if (exit && !tenancy.keysReturnedDate && insp.date) upsert("tenancies", { ...tenancy, keysReturnedDate: insp.date });
    upsert("units", { ...unit, rooms: insp.rooms.map((r) => r.name) });
    goBack(router, back);
  };

  return (
    <>
      <PageHeader title={exit ? "État des lieux de sortie" : "État des lieux d'entrée"} subtitle={`${building?.name ?? ""} · ${unit.name}`} back={back} />
      <Page>
        <Card>
          <DateField label="Date de l'état des lieux" value={insp.date} onChange={(v) => set({ date: v })} />
          <div className="mt-4">
            <div className="flex justify-between text-[13px] text-ink-2">
              <span>{done} / {total} éléments renseignés</span>
              {exit && cmp && <span className={cmp.conform ? "text-pos" : "text-warn"}>{cmp.conform ? "Conforme à l'entrée" : `${cmp.changes.filter((c) => c.worse).length} dégradation(s)`}</span>}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-soft">
              <div className="h-full rounded-full bg-series-1" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </div>
          </div>
          {exit && !entry && <p className="mt-3 text-[13px] text-warn">État des lieux d&apos;entrée absent de l&apos;application : renseignez chaque élément ; la comparaison se fera avec l&apos;exemplaire papier.</p>}
          {!exit && insp.rooms.some((r) => r.items.some((i) => i.state)) && !insp.completedAt && (
            <p className="mt-3 text-[13px] text-muted">Pré-rempli avec l&apos;état constaté à la sortie du précédent locataire : ne corrigez que ce qui a changé.</p>
          )}
        </Card>

        <SectionTitle>Compteurs</SectionTitle>
        <Card className="space-y-3">
          {insp.meters.map((m) => {
            const em = entry?.meters.find((x) => x.kind === m.kind);
            return (
              <div key={m.id} className="grid grid-cols-[1fr_1fr] gap-2">
                <div className="col-span-2 flex items-center gap-2 text-[14px] font-semibold text-ink">
                  <Gauge size={15} className="text-muted" /> {m.kind}
                  <button type="button" aria-label="Retirer" onClick={() => set({ meters: insp.meters.filter((x) => x.id !== m.id) })} className="ml-auto text-muted">
                    <Trash2 size={14} />
                  </button>
                </div>
                <TextField label="N° du compteur" value={m.number} onChange={(v) => set({ meters: insp.meters.map((x) => (x.id === m.id ? { ...x, number: v } : x)) })} />
                <TextField label={exit && em?.value ? `Relevé (entrée : ${em.value})` : "Relevé"} value={m.value} onChange={(v) => set({ meters: insp.meters.map((x) => (x.id === m.id ? { ...x, value: v } : x)) })} />
              </div>
            );
          })}
          <AddLine placeholder="Autre compteur (ex. électricité heures creuses)" onAdd={(kind) => set({ meters: [...insp.meters, { id: uid(), kind }] })} />
        </Card>

        <SectionTitle>{exit ? "Clés restituées" : "Clés remises"}</SectionTitle>
        <Card className="py-1">
          <div className="divide-y divide-line">
            {insp.keys.map((k) => {
              const ek = entry?.keys.find((x) => x.kind === k.kind);
              return (
                <div key={k.id} className="flex items-center gap-3 py-2.5">
                  <KeyRound size={16} className="text-muted" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] text-ink">{k.kind}</div>
                    {exit && ek?.count !== undefined && <div className="text-xs text-muted">Remis à l&apos;entrée : {ek.count}</div>}
                  </div>
                  <button type="button" aria-label="Moins" onClick={() => set({ keys: insp.keys.map((x) => (x.id === k.id ? { ...x, count: Math.max(0, (x.count ?? 0) - 1) } : x)) })} className="flex h-8 w-8 items-center justify-center rounded-full bg-soft">
                    <Minus size={14} />
                  </button>
                  <span className="tabular w-6 text-center text-[16px] font-bold">{k.count ?? 0}</span>
                  <button type="button" aria-label="Plus" onClick={() => set({ keys: insp.keys.map((x) => (x.id === k.id ? { ...x, count: (x.count ?? 0) + 1 } : x)) })} className="flex h-8 w-8 items-center justify-center rounded-full bg-soft">
                    <Plus size={14} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="pb-3">
            <AddLine placeholder="Autre clé ou accès" onAdd={(kind) => set({ keys: [...insp.keys, { id: uid(), kind, count: 1 }] })} />
          </div>
        </Card>

        <SectionTitle>Pièces</SectionTitle>
        <div className="space-y-3">
          {insp.rooms.map((room) => {
            const er = entry?.rooms.find((r) => r.name === room.name);
            const rated = room.items.filter((i) => i.state).length;
            const isOpen = open === room.id;
            const worse = cmp?.changes.filter((c) => c.room === room.name && c.worse).length ?? 0;
            return (
              <div key={room.id} className="soft-card overflow-hidden rounded-[22px]">
                <button type="button" onClick={() => setOpen(isOpen ? null : room.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="text-[16px] font-semibold text-ink">{room.name}</div>
                    <div className="text-[12px] text-muted">
                      {rated}/{room.items.length} renseignés{worse ? <span className="font-semibold text-warn"> · {worse} dégradation(s)</span> : ""}
                    </div>
                  </div>
                  {rated === room.items.length && room.items.length > 0 && <CheckCheck size={18} className="text-pos" />}
                  <ChevronDown size={18} className={cx("text-muted transition", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="border-t border-line px-4 pb-4">
                    <div className="flex flex-wrap gap-2 py-3">
                      <button
                        type="button"
                        onClick={() => setRoom(room.id, { items: room.items.map((i) => ({ ...i, state: i.state ?? (exit ? er?.items.find((x) => x.name === i.name)?.state ?? "bon" : "bon") })) })}
                        className="rounded-full bg-pos/10 px-3 py-1.5 text-[13px] font-semibold text-pos"
                      >
                        {exit ? "Rien à signaler" : "Tout en bon état"}
                      </button>
                    </div>
                    <div className="divide-y divide-line">
                      {room.items.map((it) => (
                        <ItemRow
                          key={it.id}
                          item={it}
                          entryState={exit ? er?.items.find((x) => x.name === it.name)?.state : undefined}
                          exit={exit}
                          onChange={(patch) => setItem(room, it.id, patch)}
                          onRemove={() => setRoom(room.id, { items: room.items.filter((x) => x.id !== it.id) })}
                        />
                      ))}
                    </div>
                    <AddLine placeholder="Ajouter un élément" onAdd={(name) => setRoom(room.id, { items: [...room.items, { id: uid(), name }] })} />
                    <div className="mt-3">
                      <TextField label="Observations sur la pièce" value={room.note} onChange={(v) => setRoom(room.id, { note: v })} />
                    </div>
                    <button type="button" onClick={() => set({ rooms: insp.rooms.filter((r) => r.id !== room.id) })} className="mt-3 text-[13px] font-medium text-neg">
                      Retirer cette pièce
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <Card>
            <AddLine placeholder="Ajouter une pièce (ex. Chambre 2, Cave, Balcon)" onAdd={(name) => { const r = newRoom(name); set({ rooms: [...insp.rooms, r] }); setOpen(r.id); }} suggestions={["Chambre", "Salle d'eau", "Buanderie", "Cave", "Balcon", "Garage"].filter((n) => !insp.rooms.some((r) => r.name === n))} />
            {insp.rooms.length === 0 && <p className="mt-2 text-xs text-muted">Éléments proposés automatiquement : {itemsFor("Chambre").slice(0, 4).join(", ")}…</p>}
          </Card>
        </div>

        <SectionTitle>Chauffage, eau chaude, observations</SectionTitle>
        <Card>
          <Stack>
            <TextField label="Chauffage (état, entretien)" value={insp.heating} placeholder="Ex. radiateurs électriques en état de marche" onChange={(v) => set({ heating: v })} />
            <TextField label="Eau chaude sanitaire" value={insp.hotWater} placeholder="Ex. ballon électrique 150 L, fonctionnel" onChange={(v) => set({ hotWater: v })} />
            <TextField label="Observations et réserves" value={insp.observations} multiline onChange={(v) => set({ observations: v })} />
          </Stack>
        </Card>

        {exit && cmp && entry && (
          <>
            <SectionTitle>Comparaison avec l&apos;entrée</SectionTitle>
            <Card>
              {cmp.changes.filter((c) => c.worse).length === 0 && cmp.keysMissing.length === 0 ? (
                <p className="text-[14px] text-pos">Aucune dégradation par rapport à l&apos;état des lieux d&apos;entrée ({dateFr(entry.date)}).</p>
              ) : (
                <ul className="space-y-1.5 text-[14px]">
                  {cmp.changes.filter((c) => c.worse).map((c, i) => (
                    <li key={i}>
                      <b>{c.room}</b> — {c.item} : {stateLabel(c.entry)} → <span className="font-semibold text-neg">{stateLabel(c.exit)}</span>
                    </li>
                  ))}
                  {cmp.keysMissing.map((k) => (
                    <li key={k.kind}>
                      <b>{k.kind}</b> : {k.missing} non restitué(s)
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}

        <SectionTitle>Signatures</SectionTitle>
        <Card>
          <Stack>
            <SignaturePad label="Le bailleur" value={insp.signatures?.landlord} onChange={(v) => set({ signatures: { ...insp.signatures, landlord: v, signedAt: new Date().toISOString() } })} />
            {tenancy.tenants.map((p, i) => (
              <SignaturePad
                key={i}
                label={[p.firstName, p.lastName].filter(Boolean).join(" ") || `Locataire ${i + 1}`}
                value={insp.signatures?.tenants?.[i]}
                onChange={(v) => {
                  const tenants = [...(insp.signatures?.tenants ?? [])];
                  tenants[i] = v;
                  set({ signatures: { ...insp.signatures, tenants, signedAt: new Date().toISOString() } });
                }}
              />
            ))}
          </Stack>
        </Card>

        {missing.length > 0 && (
          <div className="mt-4 rounded-2xl bg-warn/10 px-4 py-3 text-[13px] text-warn">
            <b>Mentions encore manquantes (décret n° 2016-382) :</b> {missing.join(" · ")}
          </div>
        )}

        <Card className="mt-4 py-1">
          <DocRow title="Aperçu PDF" subtitle="Document prêt à imprimer, signer ou envoyer" url={documentUrl({ type: "edl", tenancy: tenancy.id, inspection: insp.id })} fileName={`etat-des-lieux-${insp.kind}.pdf`} />
        </Card>
        <div className="mt-4">
          <Button full onClick={finish}>
            {insp.completedAt ? "Enregistrer et revenir" : "Terminer l'état des lieux"}
          </Button>
        </div>
      </Page>
    </>
  );
}

function ItemRow({ item, entryState, exit, onChange, onRemove }: { item: InspectionItem; entryState?: ItemState; exit: boolean; onChange: (p: Partial<InspectionItem>) => void; onRemove: () => void }) {
  const [more, setMore] = useState(!!item.note || (item.photos?.length ?? 0) > 0);
  const rankOf = (s?: ItemState) => ITEM_STATES.find((x) => x.value === s)?.rank ?? 99;
  const worse = exit && entryState && item.state && rankOf(item.state) < rankOf(entryState);
  return (
    <div className={cx("py-3", worse && "-mx-2 rounded-xl bg-neg/[0.05] px-2")}>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 text-[14px] font-medium text-ink">{item.name}</div>
        {exit && entryState && <span className="shrink-0 text-[11px] text-muted">Entrée : {stateLabel(entryState)}</span>}
        <button type="button" aria-label="Note ou photo" onClick={() => setMore(!more)} className="text-muted">
          <MessageSquarePlus size={16} />
        </button>
      </div>
      <div className="mt-2 flex gap-1">
        {ITEM_STATES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange({ state: item.state === s.value ? undefined : s.value })}
            className={cx(
              "flex-1 rounded-lg px-1 py-1.5 text-[11.5px] font-semibold transition",
              item.state === s.value
                ? s.rank >= 3
                  ? "bg-pos text-white"
                  : s.rank === 2
                    ? "bg-series-1 text-white"
                    : "bg-neg text-white"
                : "bg-soft text-ink-2",
            )}
          >
            {s.value === "usage" ? "Usage" : s.value === "mauvais" ? "Mauvais" : s.value === "bon" ? "Bon" : s.label}
          </button>
        ))}
      </div>
      {more && (
        <div className="mt-2 space-y-2">
          <TextField label="Précisions" value={item.note} placeholder="Ex. rayure 10 cm près de la fenêtre" onChange={(v) => onChange({ note: v })} />
          <PhotoStrip ids={item.photos ?? []} onChange={(photos) => onChange({ photos })} />
          <button type="button" onClick={onRemove} className="text-[12px] text-neg">
            Retirer cet élément
          </button>
        </div>
      )}
    </div>
  );
}

function AddLine({ placeholder, onAdd, suggestions = [] }: { placeholder: string; onAdd: (v: string) => void; suggestions?: string[] }) {
  const [v, setV] = useState("");
  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3 py-2 text-[14px] outline-none focus:border-series-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && v.trim()) {
              onAdd(v.trim());
              setV("");
            }
          }}
        />
        <button type="button" disabled={!v.trim()} onClick={() => { onAdd(v.trim()); setV(""); }} className="rounded-xl bg-navy px-3 text-white disabled:opacity-30" aria-label="Ajouter">
          <Plus size={16} />
        </button>
      </div>
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => onAdd(s)} className="rounded-full bg-soft px-2.5 py-1 text-[12px] text-ink-2">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
