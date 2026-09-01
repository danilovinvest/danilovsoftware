import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { TasksView } from "@/modules/tasks";

export const metadata: Metadata = { title: "Tâches — Danilov CRM" };

export default function TasksPage() {
  return (
    <RequireAuth permission="tasks:read">
      <TasksView />
    </RequireAuth>
  );
}
