"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LockIcon, WifiOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/shared/ui/feedback";
import { useAuth } from "../auth-context";
import type { Permission } from "../lib/types";
import { useOnline } from "@/shared/hooks/use-online";
import { loginHref } from "../lib/safe-next";
import { loginHrefWithReason } from "../lib/sign-out-reason";

/**
 * Garde de rendu côté client. Elle protège l'affichage, pas les données :
 * l'autorisation qui compte reste celle appliquée par l'API sur chaque requête.
 */
export function RequireAuth({
  permission,
  offlineBanner = false,
  children,
}: {
  permission?: Permission;
  /**
   * Afficher le bandeau « connexion perdue ». Une seule garde le fait — celle
   * de la mise en page du CRM : les gardes des pages s'y imbriquent, et le
   * bandeau s'afficherait autant de fois.
   */
  offlineBanner?: boolean;
  children: React.ReactNode;
}) {
  const { account, loading, offline, retry, can, signOutReason } = useAuth();
  const online = useOnline();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Hors ligne, la session n'est pas perdue : on ne renvoie pas à la connexion.
    if (!loading && !account && !offline) {
      // Les paramètres voyagent avec le chemin : un lien vers une affaire
      // (`?affaire=…&onglet=…`) doit rouvrir l'affaire, pas la liste. Ils sont
      // lus ici, dans l'effet, plutôt que par `useSearchParams` : cette garde
      // enveloppe tout le CRM, et le crochet imposerait une frontière Suspense
      // au-dessus de chaque page.
      // Une session fermée exprès (mot de passe changé, « Tout fermer ») dit
      // pourquoi plutôt que de ramener ici : revenir aux réglages après s'être
      // déconnecté de partout n'a pas de sens.
      router.replace(
        signOutReason
          ? loginHrefWithReason(signOutReason)
          : loginHref(pathname, window.location.search),
      );
    }
  }, [loading, account, offline, signOutReason, router, pathname]);

  if (!account && offline) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-2 px-6 text-center">
        <WifiOffIcon className="text-muted-foreground size-5" />
        <p className="text-sm font-medium">Le serveur est injoignable</p>
        <p className="text-muted-foreground max-w-sm text-xs">
          Vérifiez la connexion internet. Le CRM réessaie tout seul et s&apos;ouvrira dès que le
          serveur répondra.
        </p>
        <Button size="sm" variant="outline" className="mt-2" onClick={retry}>
          Réessayer
        </Button>
      </div>
    );
  }

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

  return (
    <>
      {(offline || !online) && offlineBanner && (
        <div
          role="status"
          className="bg-warning-soft text-warning flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium"
        >
          <WifiOffIcon className="size-3.5" />
          {online
            ? "Connexion perdue — vos données restent affichées, le CRM réessaie tout seul."
            : "Hors ligne — ce poste n'a plus de réseau. Les données affichées peuvent dater."}
          <button type="button" className="underline" onClick={retry}>
            Réessayer
          </button>
        </div>
      )}
      {children}
    </>
  );
}
