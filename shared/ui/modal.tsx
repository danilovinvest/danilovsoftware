"use client";

import { useEffect, useRef } from "react";

/**
 * Boîte de dialogue bâtie sur <dialog> natif : la gestion du focus, de la
 * touche Échap et du fond modal est déléguée au navigateur.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-xl border border-border-subtle bg-surface p-0 text-foreground backdrop:bg-black/40"
    >
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="rounded-md px-2 text-lg leading-none text-muted-foreground hover:bg-surface-muted"
        >
          ×
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
      {footer && (
        <div className="flex justify-end gap-2 border-t border-border-subtle px-5 py-3">
          {footer}
        </div>
      )}
    </dialog>
  );
}
