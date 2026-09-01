"use client";

import { useRouter } from "next/navigation";
import { initials } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { useAuth } from "../auth-context";
import { ROLE_LABELS } from "../lib/types";

export function UserMenu() {
  const { account, logout } = useAuth();
  const router = useRouter();

  if (!account) return null;

  const name = [account.first_name, account.last_name].filter(Boolean).join(" ");

  return (
    <div className="flex items-center gap-3">
      <div
        aria-hidden
        className="grid size-8 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
      >
        {initials(name || account.email)}
      </div>
      <div className="hidden leading-tight sm:block">
        <p className="text-xs font-medium text-foreground">{name || account.email}</p>
        <p className="text-xs text-muted-foreground">{ROLE_LABELS[account.role]}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          await logout();
          router.replace("/login");
        }}
      >
        Déconnexion
      </Button>
    </div>
  );
}
