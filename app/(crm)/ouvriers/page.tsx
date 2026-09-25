import type { Metadata } from "next";
import { WorkersView } from "@/modules/workers";

export const metadata: Metadata = { title: "Ouvriers" };

export default function WorkersPage() {
  return <WorkersView />;
}
