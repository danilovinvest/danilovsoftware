import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireAuth } from "@/modules/auth";
import { CustomerDetailView } from "@/modules/customers";

// La fiche est chargée côté client : son nom ne peut pas alimenter le titre
// sans un second appel serveur, pour un gain qui ne le vaut pas.
export const metadata: Metadata = { title: "Fiche client" };

export default async function CustomerPage(props: PageProps<"/customers/[id]">) {
  const { id } = await props.params;

  return (
    <RequireAuth permission="customers:read">
      {/* La fiche lit `?affaire=&onglet=&vue=` : Next exige une frontière. */}
      <Suspense>
        {/* Une fiche par identifiant : aller de A à B par un lien interne ne
            doit rien garder de A — les échanges chargés en plus, un panneau
            déplié. Même clé que l'application de bureau. */}
        <CustomerDetailView key={id} customerId={id} />
      </Suspense>
    </RequireAuth>
  );
}
