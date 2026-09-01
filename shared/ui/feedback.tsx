import { cn } from "@/shared/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Chargement"
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
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
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
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
        "rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger",
        className,
      )}
    >
      {message}
    </p>
  );
}

/** Bloc de chargement neutre, aux dimensions du contenu attendu. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-surface-muted", className)} />
  );
}
