"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorNotice, Skeleton } from "@/shared/ui/feedback";
import { useTasks } from "../hooks/use-tasks";
import { useColleagues } from "../hooks/use-colleagues";
import { TaskDialog } from "./task-dialog";
import { TaskRow } from "./task-row";
import type { Task } from "../lib/types";

/** Onglet « Tâches » d'une fiche client : uniquement ce qui la vise. */
export function CustomerTasksPanel({ customerId }: { customerId: string }) {
  const canWrite = usePermission("tasks:write");
  const colleagues = useColleagues();
  const { data, loading, error, reload } = useTasks({
    customer_id: customerId,
    sort: "due",
    per_page: 100,
  });
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {canWrite && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
            <PlusIcon />
            Nouvelle tâche
          </Button>
        </div>
      )}

      <Card className="gap-0 py-0">
        {error ? (
          <div className="p-5">
            <ErrorNotice message={error} />
          </div>
        ) : loading && !data ? (
          <div className="flex flex-col gap-2 p-5">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : data?.items.length === 0 ? (
          <EmptyState
            title="Aucune tâche"
            description="Les rappels et actions à mener sur cette fiche apparaîtront ici."
          />
        ) : (
          <ul className="divide-y">
            {data?.items.map((task) => (
              <TaskRow key={task.id} task={task} onChanged={reload} onOpen={setEditing} />
            ))}
          </ul>
        )}
      </Card>

      {creating && (
        <TaskDialog
          task={null}
          open
          onOpenChange={(open) => !open && setCreating(false)}
          onSaved={reload}
          colleagues={colleagues}
          defaultTarget={{ customer_id: customerId }}
        />
      )}
      {editing && (
        <TaskDialog
          key={editing.id}
          task={editing}
          open
          colleagues={colleagues}
          onOpenChange={(open) => !open && setEditing(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}
