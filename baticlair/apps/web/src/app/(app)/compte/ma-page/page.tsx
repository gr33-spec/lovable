import { redirect } from "next/navigation";

/** Ancienne adresse (Profil › Ma page) : le site se règle dans l'onglet « Mon site » (Greg, 16 novembre 2026). */
export default function AncienneAdresseMaPage() {
  redirect("/mon-site");
}
