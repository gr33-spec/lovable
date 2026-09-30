import { randomUUID } from "node:crypto";
import { ProductEditor } from "@/components/admin/product-editor";
import { attributeSuggestions, groups } from "@/lib/server/admin-queries";

export const metadata = { title: "Nouvelle création" };

export default async function NewProductPage() {
  const [{ categories, collections }, suggestions] = await Promise.all([groups(), attributeSuggestions()]);
  return (
    <ProductEditor
      isNew
      // Identifiant créé dès l'ouverture : un double clic sur « Publier » ne peut pas créer deux produits.
      initial={{
        id: randomUUID(),
        version: 0,
        name: "",
        slug: "",
        sku: "",
        description: "",
        categoryId: categories.filter((c) => !c.archived).length === 1 ? categories.find((c) => !c.archived)!.id : "",
        collectionId: null,
        priceCents: null,
        compareAtCents: null,
        stock: 1,
        status: "draft",
        colors: [],
        tags: [],
        features: [],
        seoTitle: "",
        seoDescription: "",
        images: [],
        orderCount: 0,
      }}
      categories={categories.map((c) => ({ id: c.id, parentId: c.parentId, name: c.name, depth: c.depth, archived: c.archived, isVisible: c.isVisible }))}
      suggestions={suggestions}
      collections={collections.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
