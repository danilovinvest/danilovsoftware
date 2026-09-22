"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth, type Permission } from "@/modules/auth";
import { useScope } from "@/modules/group";
import { Spinner } from "@/shared/ui/feedback";
import { firstAllowedHref } from "../lib/navigation";

/**
 * La page d'arrivée cède la place quand le compte ne peut pas la lire.
 *
 * Le tableau de bord est l'arrivée de tout le CRM : la racine, la connexion, le
 * logo, l'invitation y mènent. Il exige `customers:read`, et un rôle sur mesure
 * qui ne l'a pas — une secrétaire limitée aux tâches, un comptable limité à la
 * facturation — tombait sur « Accès refusé » à chaque connexion (issue 95).
 * Plutôt que de corriger une dizaine de liens, l'arrivée elle-même renvoie vers
 * le premier écran de la colonne que ce compte peut ouvrir.
 *
 * Rien n'est permis ? La garde laisse passer, et le refus s'affiche : c'est la
 * vérité, et un refuge inventé ferait un second refus plus loin.
 */
export function LandingGuard({
  permission,
  children,
}: {
  permission: Permission;
  children: React.ReactNode;
}) {
  const { account, loading, can } = useAuth();
  const scope = useScope();
  const router = useRouter();
  const target =
    !loading && account && !can(permission) ? firstAllowedHref(can, scope) : null;

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  if (target) {
    return (
      <div className="text-muted-foreground flex min-h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  return <>{children}</>;
}
