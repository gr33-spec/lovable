"use client";

import { PlansScreen } from "@/components/paywall";
import { BackButton } from "@/components/ui";

export default function FormulesPage() {
  return (
    <>
      <BackButton fallback="/compte" />
      <PlansScreen />
    </>
  );
}
