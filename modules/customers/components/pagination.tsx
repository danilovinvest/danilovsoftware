"use client";

import { Button } from "@/shared/ui/button";

export function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between border-t border-border-subtle px-5 py-3 text-xs text-muted-foreground">
      <span>
        {total} fiche{total > 1 ? "s" : ""} · page {page} sur {Math.max(totalPages, 1)}
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Précédent
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}
