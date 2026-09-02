import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { ExperiencePanel } from "@/modules/settings";

export const metadata: Metadata = { title: "Expérience" };

export default function SettingsExperiencePage() {
  return (
    <RequireAuth>
      <ExperiencePanel />
    </RequireAuth>
  );
}
