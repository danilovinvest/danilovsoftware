import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { ProfilePanel } from "@/modules/settings";

export const metadata: Metadata = { title: "Profil" };

export default function SettingsProfilePage() {
  return (
    <RequireAuth>
      <ProfilePanel />
    </RequireAuth>
  );
}
