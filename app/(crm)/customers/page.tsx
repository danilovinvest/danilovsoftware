import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireAuth } from "@/modules/auth";
import { CustomersView } from "@/modules/customers";

export const metadata: Metadata = { title: "Fiches client" };

export default function CustomersPage() {
  return (
    <RequireAuth permission="customers:read">
      {/* Les filtres vivent dans l'adresse : Next exige une frontière. */}
      <Suspense>
        <CustomersView />
      </Suspense>
    </RequireAuth>
  );
}
