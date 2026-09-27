"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, Building2, Landmark, Sparkles, Trash2, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import { newId } from "@/lib/ops";
import { demoData } from "@/lib/demo";
import type { Company } from "@/lib/types";
import { eurCompact } from "@/lib/format";
import { QuickBuilding, QuickLoan } from "@/components/quick-add";
import { Button, Card, Grid2, NumberField, TextField, cx } from "@/components/ui";

const SUGGESTED = ["GES INVEST", "DU PORT", "ARMOR IMMO", "DU TRÉGOR", "PASO IMMO", "DU LEFF", "MANSARDE"];

export default function BienvenuePage() {
  return (
    <Suspense>
      <Onboarding />
    </Suspense>
  );
}

function Onboarding() {
  const params = useSearchParams();
  const router = useRouter();
  const { data, replaceAll, setSettings, upsert, remove } = useStore();
  const [step, setStep] = useState(Number(params.get("etape") ?? 0));
  const [busy, setBusy] = useState(false);
  const [holdingName, setHoldingName] = useState<string | undefined>(data.companies.find((c) => c.kind === "holding")?.name ?? "SC DU GOELO");
  const [newCompany, setNewCompany] = useState<string>();
  const [formKey, setFormKey] = useState(0);

  const finish = () => {
    setSettings({ onboardingDone: true });
    router.push("/");
  };
  const next = () => (step >= 4 ? finish() : setStep(step + 1));

  const holding = data.companies.find((c) => c.kind === "holding");
  const ensureHolding = (): string | null => {
    if (holding) {
      if (holdingName && holdingName !== holding.name) upsert("companies", { ...holding, name: holdingName });
      return holding.id;
    }
    if (!holdingName) return null;
    const h: Company = { id: newId(), name: holdingName, kind: "holding" };
    upsert("companies", h);
    return h.id;
  };
  const addCompany = (name: string) => {
    const parentId = ensureHolding();
    upsert("companies", { id: newId(), name, kind: "SCI", parentId } satisfies Company);
  };

  const loadDemo = async () => {
    setBusy(true);
    await replaceAll(demoData(), "chargement démo");
    router.push("/");
  };

  const steps = [
    { icon: <Briefcase size={20} />, label: "Structure" },
    { icon: <Building2 size={20} />, label: "Immeubles" },
    { icon: <Landmark size={20} />, label: "Crédits" },
    { icon: <Wallet size={20} />, label: "Revenus" },
  ];
  const sci = data.companies.filter((c) => c.kind !== "holding");

  return (
    <main className="safe-top mx-auto min-h-dvh w-full max-w-lg px-5 pb-16 pt-8">
      {step === 0 ? (
        <div className="flex min-h-[80dvh] flex-col justify-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] bg-navy text-gold">
            <Sparkles size={28} />
          </div>
          <h1 className="text-[32px] font-bold leading-tight tracking-tight text-navy">Votre patrimoine sur 30 ans</h1>
          <p className="mt-3 text-[17px] text-ink-2">
            Ce que vous possédez, ce que vous devez, ce que ça rapporte — et ce qui va se passer dans les prochaines années.
          </p>
          <div className="mt-10 space-y-3">
            <Button full onClick={() => setStep(1)}>
              Saisir mes données
            </Button>
            <Button full variant="secondary" onClick={loadDemo} disabled={busy}>
              Découvrir avec un exemple
            </Button>
          </div>
          <p className="mt-4 text-center text-xs text-muted">L&apos;exemple se supprime en un clic depuis « Plus ».</p>
        </div>
      ) : (
        <>
          <div className="mb-6 flex gap-2">
            {steps.map((s, i) => (
              <button
                key={s.label}
                onClick={() => setStep(i + 1)}
                className={cx("flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-medium", step === i + 1 ? "bg-navy text-white" : step > i + 1 ? "bg-pos/10 text-pos" : "bg-card text-muted")}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>

          {step === 1 && (
            <>
              <StepTitle n={1} title="Ma structure" text="La holding et les sociétés qui détiennent vos biens." />
              <Card>
                <TextField label="Holding" value={holdingName} onChange={setHoldingName} placeholder="Ex. SC DU GOELO" />
              </Card>
              <Card className="mt-3">
                <div className="mb-2 text-[13px] font-medium text-ink-2">Sociétés</div>
                {sci.length > 0 && (
                  <div className="mb-3 divide-y divide-line">
                    {sci.map((c) => (
                      <div key={c.id} className="flex items-center justify-between py-2">
                        <span className="text-[15px] font-medium">{c.name}</span>
                        <button onClick={() => remove("companies", c.id)} aria-label={`Retirer ${c.name}`} className="p-1 text-muted">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <TextField label="Nouvelle société" value={newCompany} onChange={setNewCompany} placeholder="Ex. SCI DU PORT" />
                  </div>
                  <button
                    onClick={() => {
                      if (newCompany) addCompany(newCompany);
                      setNewCompany(undefined);
                    }}
                    className="mt-6 h-[50px] rounded-2xl bg-navy px-4 text-sm font-semibold text-white"
                  >
                    Ajouter
                  </button>
                </div>
                {SUGGESTED.some((n) => !data.companies.some((c) => c.name === n)) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SUGGESTED.filter((n) => !data.companies.some((c) => c.name === n)).map((n) => (
                      <button key={n} onClick={() => addCompany(n)} className="rounded-full bg-soft px-3 py-1.5 text-sm font-medium text-navy">
                        + {n}
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}

          {step === 2 && (
            <>
              <StepTitle n={2} title="Mes immeubles" text="Un nom et une valeur suffisent. Les détails pourront être ajoutés plus tard." />
              <ExistingList items={data.buildings.map((b) => ({ id: b.id, title: b.name, right: eurCompact(b.value) }))} />
              <Card>
                <QuickBuilding key={formKey} onDone={() => setFormKey(formKey + 1)} />
              </Card>
            </>
          )}

          {step === 3 && (
            <>
              <StepTitle n={3} title="Mes crédits" text="Capital restant dû, mensualité et date de fin : cela suffit pour la projection." />
              <ExistingList
                items={data.loans.map((l) => ({ id: l.id, title: l.name || l.bank || "Crédit", right: eurCompact(l.remaining) }))}
              />
              <Card>
                <QuickLoan key={formKey} onDone={() => setFormKey(formKey + 1)} />
              </Card>
            </>
          )}

          {step === 4 && (
            <>
              <StepTitle n={4} title="Mes revenus" text="Loyers et principales charges de chaque immeuble." />
              {data.buildings.length === 0 ? (
                <Card className="text-sm text-muted">Ajoutez d&apos;abord un immeuble à l&apos;étape 2.</Card>
              ) : (
                <div className="space-y-3">
                  {data.buildings.map((b) => (
                    <Card key={b.id}>
                      <div className="mb-3 text-[16px] font-semibold text-navy">{b.name}</div>
                      <Grid2>
                        <NumberField label="Loyers / mois" value={b.rentMonthly} onChange={(v) => upsert("buildings", { ...b, rentMonthly: v })} />
                        <NumberField label="Taxe foncière / an" value={b.propertyTax} onChange={(v) => upsert("buildings", { ...b, propertyTax: v })} />
                        <NumberField label="Assurance / an" value={b.insurance} onChange={(v) => upsert("buildings", { ...b, insurance: v })} />
                        <NumberField label="Autres charges / an" value={b.otherCharges} onChange={(v) => upsert("buildings", { ...b, otherCharges: v })} />
                      </Grid2>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="mt-8 space-y-2">
            <Button
              full
              onClick={() => {
                if (step === 1) ensureHolding();
                next();
              }}
            >
              {step === 4 ? "Ouvrir le tableau de bord" : "Continuer"}
            </Button>
            <Button full variant="ghost" onClick={next}>
              Je compléterai plus tard
            </Button>
          </div>
        </>
      )}
    </main>
  );
}

function StepTitle({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="mb-4">
      <div className="text-sm font-semibold text-gold">Étape {n} sur 4</div>
      <h1 className="text-[28px] font-bold tracking-tight text-navy">{title}</h1>
      <p className="mt-1 text-[15px] text-ink-2">{text}</p>
    </div>
  );
}

function ExistingList({ items }: { items: { id: string; title: string; right?: string }[] }) {
  if (items.length === 0) return null;
  return (
    <Card className="mb-3 py-1">
      <div className="divide-y divide-line">
        {items.map((i) => (
          <div key={i.id} className="flex justify-between py-2.5 text-[15px]">
            <span className="font-medium">{i.title}</span>
            <span className="tabular text-ink-2">{i.right}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
