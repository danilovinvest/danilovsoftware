"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/shared/ui/feedback";
import { useAuth } from "../auth-context";
import type { Permission } from "../lib/types";

/**
 * Garde de rendu côté client. Elle protège l'affichage, pas les données :
 * l'autorisation qui compte reste celle appliquée par l'API sur chaque requête.
 */
export function RequireAuth({
  permission,
  children,
}: {
  permission?: Permission;
  children: React.ReactNode;
}) {
  const { account, loading, can } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !account) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, account, router, pathname]);

  if (loading || !account) {
    return (
      <div className="flex min-h-64 items-center justify-center text-muted-foreground">
        <Spinner />
      </div>
    );
  }

  if (permission && !can(permission)) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface px-6 py-12 text-center">
        <p className="text-sm font-medium text-foreground">Accès refusé</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Votre rôle ne donne pas accès à cette section.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
