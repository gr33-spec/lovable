import { Suspense } from "react";
import { DocumentsLibrary } from "@/components/documents/library";

export default function DocumentsPage() {
  return (
    <Suspense>
      <DocumentsLibrary />
    </Suspense>
  );
}
