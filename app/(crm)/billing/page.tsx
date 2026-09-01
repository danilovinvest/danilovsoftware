import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { BillingView } from "@/modules/billing";

export const metadata: Metadata = { title: "Facturation — Danilov CRM" };

export default function BillingPage() {
  return (
    <RequireAuth permission="quotes:read">
      <BillingView />
    </RequireAuth>
  );
}
