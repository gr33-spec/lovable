import { GroupManager } from "@/components/admin/group-manager";
import { PageTitle } from "@/components/admin/ui";
import { groups } from "@/lib/server/admin-queries";

export const metadata = { title: "Catégories" };

export default async function CategoriesPage() {
  const { categories, collections } = await groups();
  const map = (rows: typeof categories) => rows.map((r) => ({ id: r.id, name: r.name, slug: r.slug, description: r.description, isVisible: r.is_visible, count: Number(r.product_count) }));
  return (
    <>
      <PageTitle title="Catégories et collections" subtitle="Les catégories organisent la boutique (menu). Les collections regroupent des créations d'une même série." />
      <div className="space-y-10">
        <GroupManager table="category" title="Catégories" rows={map(categories)} />
        <GroupManager table="collection" title="Collections (facultatif)" rows={map(collections)} />
      </div>
    </>
  );
}
