import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireAuth } from "@/modules/auth";
import { TasksView } from "@/modules/tasks";

export const metadata: Metadata = { title: "Tâches" };

export default function TasksPage() {
  return (
    <RequireAuth permission="tasks:read">
      {/* L'écran lit `?tache=` et `?assignee=` : Next exige une frontière. */}
      <Suspense>
        <TasksView />
      </Suspense>
    </RequireAuth>
  );
}
