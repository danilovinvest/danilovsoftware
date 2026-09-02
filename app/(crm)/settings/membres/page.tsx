import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { MembersPanel } from "@/modules/settings";

export const metadata: Metadata = { title: "Membres" };

export default function SettingsMembersPage() {
  return (
    <RequireAuth permission="users:read">
      <MembersPanel />
    </RequireAuth>
  );
}
