import { NotFoundContent } from "@/components/shop/not-found-content";
import { ShopShell } from "@/components/shop/shell";

// Adresse inconnue hors de la boutique : page complète (en-tête et pied de page).
export default function NotFound() {
  return (
    <ShopShell>
      <NotFoundContent />
    </ShopShell>
  );
}
