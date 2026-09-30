import { CategoryTree } from "@/components/admin/category-tree";
import { GroupManager } from "@/components/admin/group-manager";
import { PageTitle } from "@/components/admin/ui";
import { groups } from "@/lib/server/admin-queries";

export const metadata = { title: "Catégories" };

export default async function CategoriesPage() {
  const { categories, collections } = await groups();
  return (
    <>
      <PageTitle title="Catégories et collections" subtitle="Les catégories structurent la boutique et son menu. Les collections regroupent des créations d'une même série." />
      <div className="space-y-12">
        <CategoryTree rows={categories} />
        <GroupManager
          table="collection"
          title="Collections (facultatif)"
          rows={collections.map((r) => ({ id: r.id, name: r.name, slug: r.slug, description: r.description, isVisible: r.is_visible, count: Number(r.product_count) }))}
        />
      </div>
    </>
  );
}
