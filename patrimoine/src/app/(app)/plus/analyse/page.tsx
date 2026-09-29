import { Suspense } from "react";
import { AnalysisView } from "@/components/analysis/view";

export default function AnalysePage() {
  return (
    <Suspense>
      <AnalysisView />
    </Suspense>
  );
}
