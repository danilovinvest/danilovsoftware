"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { interceptExternalLinks, onNavigateRequest } from "./links";

/**
 * Ce que la page doit à la coque, posé une fois pour toute l'application.
 *
 * Deux écoutes, et aucun rendu : les liens externes partent vers le navigateur
 * du système, et un retour du navigateur (`omptcrm://app/…`, après un
 * raccordement Google ou Microsoft) mène à l'écran qu'il désigne.
 */
export function DesktopBridge() {
  const router = useRouter();

  useEffect(() => interceptExternalLinks(), []);
  useEffect(() => onNavigateRequest((path) => router.push(path)), [router]);

  return null;
}
