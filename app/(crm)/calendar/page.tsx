import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { CalendarView } from "@/modules/calendar";

export const metadata: Metadata = { title: "Calendrier" };

export default function CalendarPage() {
  return (
    <RequireAuth permission="customers:read">
      <CalendarView />
    </RequireAuth>
  );
}
