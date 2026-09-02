import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { CustomersView } from "@/modules/customers";

export const metadata: Metadata = { title: "Fiches client" };

export default function CustomersPage() {
  return (
    <RequireAuth permission="customers:read">
      <CustomersView />
    </RequireAuth>
  );
}
