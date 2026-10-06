import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { AgendaWithDeadlines } from "./agenda-with-deadlines";

export const metadata: Metadata = { title: "Agenda" };

export default function CalendarPage() {
  return (
    <RequireAuth permission="customers:read">
      <AgendaWithDeadlines />
    </RequireAuth>
  );
}
