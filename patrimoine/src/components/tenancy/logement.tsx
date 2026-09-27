"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowRightLeft, ClipboardCheck, DoorOpen, FileSignature, Pencil, ReceiptText, UserPlus } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Tenancy } from "@/lib/types";
import { dateFr, eur } from "@/lib/format";
import { activeTenancy, draftTenancy, inspectionsOf, landlordCompany, lastExitInspection, leavingTenancy, tenanciesOf, tenancyFromUnit, tenantsName, depositDue } from "@/lib/tenancy";
import { leaseTermEnd } from "@/lib/legal/lease";
import { newEntryInspection } from "@/lib/legal/inspection";
import { depositSettlement, leaseYears } from "@/lib/legal/rules";
import { todayIso } from "@/lib/engine/leases";
import { UnitForm } from "../forms";
import { PaymentStrip } from "../leases";
import { Button, Card, ConfirmDelete, Empty, Grid2, NumberField, Page, PageHeader, SectionTitle, Sheet, Stack, TextField, DateField } from "../ui";
import { DocRow, LegalBadge, SignaturePad, documentUrl } from "./common";
import { ReceiptPicker } from "./receipts";

export function LogementDetail({ id }: { id: string }) {
  return (
    <Suspense>
      <Detail id={id} />
    </Suspense>
  );
}

function Detail({ id }: { id: string }) {
  const { data, upsert, remove, role } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const [sheet, setSheet] = useState<null | "edit" | "quittance" | "import" | "sign">(null);
  const fromGestion = params.get("action") === "quittance";
  const [autoOpened, setAutoOpened] = useState(false);
  const unit = data.units.find((u) => u.id === id);
  if (!unit) {
    return (
      <>
        <PageHeader title="Logement" back="/patrimoine" />
        <Empty title="Logement introuvable" />
      </>
    );
  }
  const building = data.buildings.find((b) => b.id === unit.buildingId);
  const company = landlordCompany(data, unit);
  const active = activeTenancy(data, id);
  const leaving = leavingTenancy(data, id);
  const draft = draftTenancy(data, id);
  const history = tenanciesOf(data, id).filter((t) => t.status === "clos");
  const knownTenant = !active && unit.status !== "vacant" && (unit.tenantLastName || unit.tenantFirstName);

  /** Dossier du bail en cours reconstitué à partir des informations du logement (rien n'est redemandé). */
  const ensureTenancy = (): Tenancy => {
    if (active) return active;
    const t = tenancyFromUnit(unit, company, leaseYears(data.settings));
    upsert("tenancies", t);
    return t;
  };

  // Ouverture directe de « Obtenir une quittance » depuis l'onglet Gestion.
  if (fromGestion && !autoOpened && (active || knownTenant)) {
    queueMicrotask(() => {
      setAutoOpened(true);
      ensureTenancy();
      setSheet("quittance");
    });
  }

  const startEntry = (t: Tenancy) => {
    const existing = inspectionsOf(data, t.id).entry;
    if (existing) return router.push(`/patrimoine/logement/${id}/edl/${existing.id}`);
    const insp = newEntryInspection(unit, t, lastExitInspection(data, id));
    upsert("inspections", insp);
    router.push(`/patrimoine/logement/${id}/edl/${insp.id}`);
  };

  return (
    <>
      <PageHeader
        title={unit.name}
        subtitle={[building?.name, company?.name].filter(Boolean).join(" · ")}
        back={role === "gestion" || fromGestion || params.get("depuis") === "gestion" ? "/gestion?vue=locataires" : building ? `/patrimoine/immeuble/${building.id}` : "/patrimoine"}
        action={
          <button onClick={() => setSheet("edit")} className="flex h-10 items-center gap-1.5 rounded-full bg-soft px-4 text-sm font-semibold text-navy">
            <Pencil size={15} /> Modifier
          </button>
        }
      />
      <Page>
        <div className="hero-card rounded-[28px] p-5 text-white">
          {active ? (
            <>
              <div className="text-[13px] text-white/60">Locataire{active.tenants.length > 1 ? "s" : ""}</div>
              <div className="text-[24px] font-extrabold leading-tight tracking-[-0.02em]">{tenantsName(active) || "Nom à compléter"}</div>
              <div className="mt-1 text-[13px] text-white/60">
                {active.startDate ? `Depuis le ${dateFr(active.startDate)}` : "Date d'entrée à compléter"}
                {leaseTermEnd(active) ? ` · échéance ${dateFr(leaseTermEnd(active))}` : ""}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <HeroTile label="Loyer" value={eur(active.rent)} />
                <HeroTile label="Charges" value={eur(active.charges)} />
                <HeroTile label="Dépôt" value={eur(active.deposit)} />
              </div>
            </>
          ) : knownTenant ? (
            <>
              <div className="text-[13px] text-white/60">Locataire</div>
              <div className="text-[24px] font-extrabold leading-tight">{[unit.tenantFirstName, unit.tenantLastName].filter(Boolean).join(" ")}</div>
              <div className="mt-1 text-[13px] text-white/60">Bail signé hors de l&apos;application · loyer {eur(unit.rent)} + charges {eur(unit.charges)}</div>
            </>
          ) : (
            <>
              <div className="text-[13px] text-white/60">Logement</div>
              <div className="text-[24px] font-extrabold leading-tight">{unit.status === "vacant" ? "Vacant" : "Sans locataire enregistré"}</div>
              <div className="mt-1 text-[13px] text-white/60">Loyer de référence : {eur(unit.rent)} + charges {eur(unit.charges)}</div>
            </>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Link href={`/patrimoine/logement/${id}/changement`} className="soft-card flex flex-col gap-2 rounded-[22px] p-4 active:scale-[0.98]">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-navy text-gold">{active || knownTenant || leaving ? <ArrowRightLeft size={19} /> : <UserPlus size={19} />}</span>
            <span className="text-[15px] font-semibold text-ink">{active || knownTenant || leaving ? "Changer de locataire" : "Nouveau locataire"}</span>
            <span className="text-[12px] text-muted">Départ, état des lieux, dépôt, nouveau bail</span>
          </Link>
          <button
            disabled={!active && !knownTenant}
            onClick={() => {
              ensureTenancy();
              setSheet("quittance");
            }}
            className="soft-card flex flex-col gap-2 rounded-[22px] p-4 text-left active:scale-[0.98] disabled:opacity-40"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pos/10 text-pos">
              <ReceiptText size={19} />
            </span>
            <span className="text-[15px] font-semibold text-ink">Obtenir une quittance</span>
            <span className="text-[12px] text-muted">Un mois, ou loyers à jour à une date</span>
          </button>
        </div>

        {leaving && (
          <Link href={`/patrimoine/logement/${id}/changement`} className="mt-4 flex items-center gap-3 rounded-2xl bg-warn/10 px-4 py-3 text-[14px] text-warn">
            <DoorOpen size={18} />
            <span className="flex-1">
              Départ de {tenantsName(leaving) || "l'ancien locataire"} en cours
              {leaving.depositReturnedDate ? "" : depositDue(data, leaving) ? ` · dépôt de garantie à restituer avant le ${dateFr(depositDue(data, leaving))} (${eur(depositSettlement(leaving).toReturn)})` : ""}
            </span>
          </Link>
        )}
        {draft && (
          <Link href={`/patrimoine/logement/${id}/changement`} className="mt-3 flex items-center gap-3 rounded-2xl bg-series-1/10 px-4 py-3 text-[14px] text-series-1">
            <FileSignature size={18} />
            <span className="flex-1">Nouveau bail en préparation{tenantsName(draft) ? ` pour ${tenantsName(draft)}` : ""} — continuer</span>
          </Link>
        )}

        {active && (
          <>
            <SectionTitle>Documents</SectionTitle>
            <Card className="py-1">
              <div className="divide-y divide-line">
                {active.imported ? (
                  <DocRow
                    title="Bail"
                    status="Signé hors application"
                    subtitle="Complétez le dossier pour les quittances et le départ"
                    action={
                      <button onClick={() => setSheet("import")} className="rounded-full bg-soft px-3 py-1.5 text-[13px] font-semibold text-navy">
                        Compléter
                      </button>
                    }
                  />
                ) : (
                  <DocRow
                    title="Bail"
                    status={active.signatures?.landlord ? "Signé" : "À signer"}
                    tone={active.signatures?.landlord ? "pos" : "warn"}
                    subtitle={active.signDate ? `Conclu le ${dateFr(active.signDate)}` : undefined}
                    url={documentUrl({ type: "bail", tenancy: active.id })}
                    fileName={`bail-${unit.name}.pdf`}
                    action={
                      <button onClick={() => setSheet("sign")} className="rounded-full bg-soft px-3 py-1.5 text-[13px] font-semibold text-navy">
                        Signer
                      </button>
                    }
                  />
                )}
                {(active.guarantors ?? [])
                  .filter((g) => g.kind === "personne")
                  .map((g, i) => (
                    <DocRow key={i} title="Acte de cautionnement" subtitle={[g.firstName, g.lastName].filter(Boolean).join(" ")} url={documentUrl({ type: "caution", tenancy: active.id, index: i })} fileName={`caution-${i + 1}.pdf`} />
                  ))}
                <InspectionRow tenancyId={active.id} kind="entree" onStart={() => startEntry(active)} unitId={id} />
              </div>
            </Card>
            {!active.imported && <div className="mt-3"><LegalBadge refDate={active.signDate || active.startDate} /></div>}
          </>
        )}

        {unit.status !== "vacant" && (
          <Card className="mt-4">
            <PaymentStrip unit={unit} />
          </Card>
        )}

        {(history.length > 0 || leaving) && (
          <>
            <SectionTitle>Anciens locataires</SectionTitle>
            <Card className="py-1">
              <div className="divide-y divide-line">
                {[...(leaving ? [leaving] : []), ...history].map((t) => (
                  <div key={t.id} className="py-3">
                    <div className="text-[15px] font-semibold text-ink">{tenantsName(t) || "Locataire"}</div>
                    <div className="text-[13px] text-muted">
                      {dateFr(t.startDate)} → {dateFr(t.endDate)}
                      {t.status === "clos" ? " · dossier clos" : " · départ en cours"}
                    </div>
                    <div className="mt-1 divide-y divide-line">
                      {!t.imported && <DocRow title="Bail" url={documentUrl({ type: "bail", tenancy: t.id })} fileName="bail.pdf" />}
                      <InspectionRow tenancyId={t.id} kind="entree" unitId={id} />
                      <InspectionRow tenancyId={t.id} kind="sortie" unitId={id} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </Page>

      <Sheet
        open={sheet === "edit"}
        onClose={() => setSheet(null)}
        title="Modifier le logement"
        footer={
          <div className="space-y-2">
            <Button full onClick={() => setSheet(null)}>Terminé</Button>
            {role === "owner" && <ConfirmDelete
              label="Supprimer le logement"
              message="Supprimer ce logement ? Une sauvegarde automatique permet de revenir en arrière."
              onConfirm={() => {
                remove("units", unit.id);
                router.push(building ? `/patrimoine/immeuble/${building.id}` : "/patrimoine");
              }}
            />}
          </div>
        }
      >
        <UnitForm unit={unit} />
      </Sheet>
      <Sheet open={sheet === "quittance"} onClose={() => setSheet(null)} title="Obtenir une quittance">
        {activeTenancy(data, id) && <ReceiptPicker unit={unit} tenancy={activeTenancy(data, id)!} />}
      </Sheet>
      <Sheet open={sheet === "import"} onClose={() => setSheet(null)} title="Bail en cours" footer={<Button full onClick={() => setSheet(null)}>Terminé</Button>}>
        {active && <ImportedLeaseForm tenancy={active} />}
      </Sheet>
      <Sheet open={sheet === "sign"} onClose={() => setSheet(null)} title="Signer le bail" footer={<Button full onClick={() => setSheet(null)}>Terminé</Button>}>
        {active && <LeaseSignatures tenancy={active} />}
      </Sheet>
    </>
  );
}

function HeroTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.07] px-3 py-2.5 ring-1 ring-white/10">
      <div className="text-[11px] text-white/60">{label}</div>
      <div className="tabular text-[16px] font-bold">{value}</div>
    </div>
  );
}

function InspectionRow({ tenancyId, kind, onStart, unitId }: { tenancyId: string; kind: "entree" | "sortie"; onStart?: () => void; unitId: string }) {
  const { data } = useStore();
  const insp = inspectionsOf(data, tenancyId)[kind === "entree" ? "entry" : "exit"];
  const title = kind === "entree" ? "État des lieux d'entrée" : "État des lieux de sortie";
  if (!insp) {
    if (!onStart) return null;
    return (
      <DocRow
        title={title}
        status="À réaliser"
        tone="warn"
        action={
          <button onClick={onStart} className="flex items-center gap-1 rounded-full bg-navy px-3 py-1.5 text-[13px] font-semibold text-white">
            <ClipboardCheck size={14} /> Commencer
          </button>
        }
      />
    );
  }
  return (
    <DocRow
      title={title}
      status={insp.completedAt ? "Terminé" : "En cours"}
      tone={insp.completedAt ? "pos" : "warn"}
      subtitle={insp.date ? dateFr(insp.date) : undefined}
      url={documentUrl({ type: "edl", tenancy: tenancyId, inspection: insp.id })}
      fileName={`etat-des-lieux-${kind}.pdf`}
      action={
        <Link href={`/patrimoine/logement/${unitId}/edl/${insp.id}`} className="rounded-full bg-soft px-3 py-1.5 text-[13px] font-semibold text-navy">
          Ouvrir
        </Link>
      }
    />
  );
}

/** Bail signé hors application : seules les informations utiles aux quittances et au départ. */
function ImportedLeaseForm({ tenancy }: { tenancy: Tenancy }) {
  const { upsert } = useStore();
  const set = (patch: Partial<Tenancy>) => upsert("tenancies", { ...tenancy, ...patch });
  const p = tenancy.tenants[0] ?? {};
  const setP = (patch: Partial<typeof p>) => set({ tenants: [{ ...p, ...patch }, ...tenancy.tenants.slice(1)] });
  return (
    <Stack>
      <p className="text-[13px] text-muted">Repris automatiquement du logement. Complétez seulement ce qui manque.</p>
      <Grid2>
        <TextField label="Prénom" value={p.firstName} onChange={(v) => setP({ firstName: v })} />
        <TextField label="Nom" value={p.lastName} onChange={(v) => setP({ lastName: v })} />
      </Grid2>
      <Grid2>
        <TextField label="E-mail" type="email" value={p.email} onChange={(v) => setP({ email: v })} />
        <TextField label="Portable" type="tel" value={p.phone} onChange={(v) => setP({ phone: v })} />
      </Grid2>
      <DateField label="Date d'entrée" value={tenancy.startDate} onChange={(v) => set({ startDate: v, signDate: tenancy.signDate ?? v })} />
      <Grid2>
        <NumberField label="Loyer hors charges" value={tenancy.rent} onChange={(v) => set({ rent: v })} />
        <NumberField label="Charges" value={tenancy.charges} onChange={(v) => set({ charges: v })} />
      </Grid2>
      <Grid2>
        <NumberField label="Dépôt de garantie versé" value={tenancy.deposit} onChange={(v) => set({ deposit: v })} />
        <NumberField label="Jour de paiement" suffix="" integer value={tenancy.paymentDay} onChange={(v) => set({ paymentDay: v })} />
      </Grid2>
    </Stack>
  );
}

function LeaseSignatures({ tenancy }: { tenancy: Tenancy }) {
  const { upsert } = useStore();
  const set = (patch: Partial<Tenancy>) => upsert("tenancies", { ...tenancy, ...patch });
  return (
    <Stack>
      <p className="text-[13px] text-muted">Signatures manuscrites numérisées, reportées sur le PDF. Vous pouvez aussi imprimer le bail et le signer sur papier.</p>
      <DateField label="Date de signature" value={tenancy.signDate} onChange={(v) => set({ signDate: v ?? todayIso() })} hint="Détermine le modèle de bail applicable (2015 ou 2026)." />
      <TextField label="Lieu de signature" value={tenancy.signPlace} onChange={(v) => set({ signPlace: v })} />
      <SignaturePad label="Le bailleur" value={tenancy.signatures?.landlord} onChange={(v) => set({ signatures: { ...tenancy.signatures, landlord: v, signedAt: new Date().toISOString() } })} />
      {tenancy.tenants.map((p, i) => (
        <SignaturePad
          key={i}
          label={[p.firstName, p.lastName].filter(Boolean).join(" ") || `Locataire ${i + 1}`}
          value={tenancy.signatures?.tenants?.[i]}
          onChange={(v) => {
            const tenants = [...(tenancy.signatures?.tenants ?? [])];
            tenants[i] = v;
            set({ signatures: { ...tenancy.signatures, tenants, signedAt: new Date().toISOString() } });
          }}
        />
      ))}
    </Stack>
  );
}
