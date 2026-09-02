import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { ImportView } from "@/modules/customers";

export const metadata: Metadata = { title: "Synchronisation Excel" };

export default function CustomersImportPage() {
  return (
    <RequireAuth permission="imports:run">
      <ImportView />
    </RequireAuth>
  );
}
