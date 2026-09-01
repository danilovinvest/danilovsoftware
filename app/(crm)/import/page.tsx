import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { ImportView } from "@/modules/imports";

export const metadata: Metadata = { title: "Synchronisation Excel — Danilov CRM" };

export default function ImportPage() {
  return (
    <RequireAuth permission="imports:run">
      <ImportView />
    </RequireAuth>
  );
}
