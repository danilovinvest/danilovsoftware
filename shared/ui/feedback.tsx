import { AlertCircleIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Chargement"
      className={cn("size-4 animate-spin", className)}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="text-muted-foreground max-w-sm text-xs">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorNotice({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <p
      role="alert"
      className={cn(
        "text-destructive bg-destructive/10 flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
        className,
      )}
    >
      <AlertCircleIcon className="size-3.5 shrink-0" />
      {message}
    </p>
  );
}

export { Skeleton } from "@/components/ui/skeleton";
