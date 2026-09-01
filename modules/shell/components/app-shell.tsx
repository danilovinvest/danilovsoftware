"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, UserMenu } from "@/modules/auth";
import { cn } from "@/shared/lib/cn";
import { NAVIGATION } from "../lib/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { can } = useAuth();

  const items = NAVIGATION.filter((item) => can(item.permission));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-surface/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-3">
          <div className="flex items-center gap-8">
            <Link href="/customers" className="text-sm font-semibold tracking-tight">
              Danilov <span className="text-muted-foreground">CRM</span>
            </Link>
            <nav className="flex gap-1" aria-label="Modules">
              {items.map((item) => {
                const active = pathname.startsWith(item.href);
                if (item.comingSoon) {
                  return (
                    <span
                      key={item.href}
                      title="Module à venir"
                      className="cursor-not-allowed rounded-lg px-3 py-1.5 text-sm text-muted-foreground/50"
                    >
                      {item.label}
                    </span>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-accent-soft font-medium text-accent"
                        : "text-muted-foreground hover:bg-surface-muted",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
