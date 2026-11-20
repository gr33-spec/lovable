/**
 * MA PAGE MOBIIZ : les pages publiques des entreprises (`/e/…`) n'ont pas l'habillage de la landing de Mobiiz (police de
 * titre étroite) : rien d'autre que la page de l'entreprise, et une police de moins à charger sur téléphone.
 */
export default function VitrineLayout({ children }: { children: React.ReactNode }) {
  return children;
}
