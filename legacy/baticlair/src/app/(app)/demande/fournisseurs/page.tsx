import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupplier, deleteSupplier, getSuppliers } from "@/lib/suppliers";
import { getCurrentUserId } from "@/lib/current-user";

// Données propres à l'utilisateur : jamais de cache statique.
export const dynamic = "force-dynamic";

async function addSupplier(formData: FormData) {
  "use server";
  const userId = await getCurrentUserId();
  const nom = String(formData.get("nom") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const telephone = String(formData.get("telephone") ?? "").trim();
  const metier = String(formData.get("metier") ?? "").trim();

  if (!nom || !email) return;

  await createSupplier(userId, {
    nom,
    email,
    telephone: telephone || undefined,
    metier: metier || undefined,
  });
  revalidatePath("/demande/fournisseurs");
}

async function removeSupplier(formData: FormData) {
  "use server";
  const userId = await getCurrentUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await deleteSupplier(userId, id);
  revalidatePath("/demande/fournisseurs");
}

/** Carnet d'adresses fournisseurs de l'artisan (étape 7). */
export default async function FournisseursPage() {
  const userId = await getCurrentUserId();
  const suppliers = await getSuppliers(userId);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/demande" className="inline-flex items-center gap-1 font-sans text-sm text-blue">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour
      </Link>
      <h1 className="font-display text-2xl font-black">Fournisseurs</h1>

      {suppliers.length > 0 ? (
        <div className="flex flex-col gap-2">
          {suppliers.map((supplier) => (
            <Card key={supplier.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-sm font-semibold">{supplier.nom}</p>
                <p className="truncate font-sans text-xs text-muted">
                  {supplier.email}
                  {supplier.metier ? ` · ${supplier.metier}` : ""}
                  {supplier.telephone ? ` · ${supplier.telephone}` : ""}
                </p>
              </div>
              <form action={removeSupplier}>
                <input type="hidden" name="id" value={supplier.id} />
                <button
                  type="submit"
                  aria-label={`Supprimer ${supplier.nom}`}
                  className="tap-target flex items-center justify-center text-red"
                >
                  <Trash2 className="h-5 w-5" aria-hidden="true" />
                </button>
              </form>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <p className="font-sans text-sm text-muted">
            Ajoute tes fournisseurs habituels pour leur envoyer des demandes de devis en un clic.
          </p>
        </Card>
      )}

      <Card className="flex flex-col gap-3">
        <p className="font-display text-base font-bold">Ajouter un fournisseur</p>
        <form action={addSupplier} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <label htmlFor="nom" className="font-sans text-sm font-semibold">
              Nom
            </label>
            <Input id="nom" name="nom" required placeholder="Ex : Sanitaire Plus" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="font-sans text-sm font-semibold">
              E-mail
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="contact@fournisseur.fr"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="metier" className="font-sans text-sm font-semibold">
              Métier (facultatif)
            </label>
            <Input id="metier" name="metier" placeholder="Ex : Plomberie" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="telephone" className="font-sans text-sm font-semibold">
              Téléphone (facultatif)
            </label>
            <Input id="telephone" name="telephone" type="tel" placeholder="06 12 34 56 78" />
          </div>
          <Button type="submit" fullWidth>
            <Plus className="h-5 w-5" aria-hidden="true" />
            Ajouter
          </Button>
        </form>
      </Card>
    </div>
  );
}
