import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TASK_STATUS, type Tone } from "../lib/labels";
import type { TaskStatus } from "../lib/types";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-neutral-soft text-neutral",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function TaskStatusBadge({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) {
  const entry = TASK_STATUS[status];
  return (
    <Badge className={cn(TONE_CLASSES[entry?.tone ?? "neutral"], className)}>
      {entry?.label ?? status}
    </Badge>
  );
}
