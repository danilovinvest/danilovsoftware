"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * La racine de l'application mène au tableau de bord.
 *
 * Côté client et non par `redirect()` : l'export statique n'a pas de serveur
 * pour répondre une redirection, et c'est la page d'accueil que la webview
 * ouvre au lancement.
 */
export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return null;
}
