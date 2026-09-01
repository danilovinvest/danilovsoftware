import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { RequireAuth } from "@/modules/auth";
import { CustomerForm } from "@/modules/customers";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Nouvelle fiche — Danilov CRM" };

export default function NewCustomerPage() {
  return (
    <RequireAuth permission="customers:write">
      <div className="flex w-full max-w-4xl flex-col gap-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
            <Link href="/customers">
              <ArrowLeftIcon />
              Retour aux fiches
            </Link>
          </Button>
          <h1 className="mt-2 text-xl font-semibold">Nouvelle fiche client</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Les projets, devis et échanges s&apos;ajoutent ensuite depuis la fiche.
          </p>
        </div>
        <CustomerForm />
      </div>
    </RequireAuth>
  );
}
