import { Plus } from "lucide-react";
import Link from "next/link";
import { ProductList } from "@/components/admin/product-list";
import { PageTitle } from "@/components/admin/ui";
import { adminProducts, groups } from "@/lib/server/admin-queries";
import { getSettings } from "@/lib/server/cached";

export const metadata = { title: "Produits" };

type SP = Promise<{ q?: string; statut?: string; categorie?: string; stock?: string }>;

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [rows, { categories }, settings] = await Promise.all([
    adminProducts({ q: sp.q, status: sp.statut, categoryId: sp.categorie, stock: sp.stock }),
    groups(),
    getSettings(),
  ]);
  return (
    <>
      <PageTitle
        title="Produits"
        subtitle={`${rows.length} produit${rows.length > 1 ? "s" : ""}`}
        actions={
          <Link href="/admin/produits/nouveau" className="btn btn-primary">
            <Plus size={18} aria-hidden="true" /> Ajouter un produit
          </Link>
        }
      />
      <ProductList
        rows={rows.map((r) => ({ ...r, updated_at: new Date(r.updated_at).toISOString() }))}
        categories={categories.filter((c) => !c.archived).map((c) => ({ id: c.id, name: c.label }))}
        filters={{ q: sp.q ?? "", statut: sp.statut ?? "", categorie: sp.categorie ?? "", stock: sp.stock ?? "" }}
        lowThreshold={settings.lowStockThreshold}
      />
    </>
  );
}
