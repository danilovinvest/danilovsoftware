import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { RequireAuth } from "@/modules/auth";
import { CustomerWizard } from "@/modules/customers";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Nouvelle fiche" };

export default function NewCustomerPage() {
  return (
    <RequireAuth permission="customers:write">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
            <Link href="/customers">
              <ArrowLeftIcon />
              Retour aux fiches
            </Link>
          </Button>
          <h1 className="mt-2 text-xl font-semibold">Nouvelle fiche client</h1>
        </div>
        {/* L'assistant lit l'adresse (`?email=`) : Next exige une frontière. */}
        <Suspense>
          <CustomerWizard />
        </Suspense>
      </div>
    </RequireAuth>
  );
}
