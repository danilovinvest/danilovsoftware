"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LockIcon } from "lucide-react";
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
      <div className="text-muted-foreground flex min-h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (permission && !can(permission)) {
    return (
      <div className="bg-card flex flex-col items-center gap-2 rounded-xl border px-6 py-12 text-center">
        <LockIcon className="text-muted-foreground size-5" />
        <p className="text-sm font-medium">Accès refusé</p>
        <p className="text-muted-foreground text-xs">
          Votre rôle ne donne pas accès à cette section.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
