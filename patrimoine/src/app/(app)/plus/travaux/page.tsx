import { redirect } from "next/navigation";

// Les travaux se consultent dans Patrimoine › Travaux (ancienne adresse conservée).
export default function TravauxPage() {
  redirect("/patrimoine?vue=travaux");
}
