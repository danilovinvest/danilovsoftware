import type { Metadata } from "next";
import Link from "next/link";
import { RequireAuth } from "@/modules/auth";
import { CustomerForm } from "@/modules/customers";

export const metadata: Metadata = { title: "Nouvelle fiche — Danilov CRM" };

export default function NewCustomerPage() {
  return (
    <RequireAuth permission="customers:write">
      <div className="flex flex-col gap-6">
        <div>
          <Link href="/customers" className="text-xs text-muted-foreground hover:text-accent">
            ← Retour aux fiches
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-foreground">Nouvelle fiche client</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Les projets, devis et échanges s'ajoutent ensuite depuis la fiche.
          </p>
        </div>
        <CustomerForm />
      </div>
    </RequireAuth>
  );
}
