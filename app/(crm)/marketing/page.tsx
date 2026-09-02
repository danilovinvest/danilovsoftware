import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { MarketingView } from "@/modules/marketing";

export const metadata: Metadata = { title: "Marketing — Danilov CRM" };

export default function MarketingPage() {
  return (
    <RequireAuth permission="customers:read">
      <MarketingView />
    </RequireAuth>
  );
}
