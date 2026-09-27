import { redirect } from "next/navigation";

// Ancienne adresse : les loyers ont désormais leur propre onglet.
export default function OldLoyers() {
  redirect("/loyers");
}
