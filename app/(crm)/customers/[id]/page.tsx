import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { CustomerDetailView } from "@/modules/customers";

// La fiche est chargée côté client : son nom ne peut pas alimenter le titre
// sans un second appel serveur, pour un gain qui ne le vaut pas.
export const metadata: Metadata = { title: "Fiche client" };

export default async function CustomerPage(props: PageProps<"/customers/[id]">) {
  const { id } = await props.params;

  return (
    <RequireAuth permission="customers:read">
      <CustomerDetailView customerId={id} />
    </RequireAuth>
  );
}
