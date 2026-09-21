"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { followDocumentTheme } from "./appearance";
import { interceptExternalLinks, onNavigateRequest } from "./links";
import { UpdateNotice } from "./update-notice";

/**
 * Ce que la page doit à la coque, posé une fois pour toute l'application.
 *
 * Trois écoutes : les liens externes partent vers le navigateur du système, un
 * retour du navigateur (`omptcrm://app/…`, après un raccordement Google ou
 * Microsoft) mène à l'écran qu'il désigne, et le bandeau de la fenêtre suit le
 * thème du CRM. Un seul rendu : l'avis de mise à jour, quand une version
 * attend.
 */
export function DesktopBridge() {
  const router = useRouter();

  useEffect(() => interceptExternalLinks(), []);
  useEffect(() => onNavigateRequest((path) => router.push(path)), [router]);
  useEffect(() => followDocumentTheme(), []);

  return <UpdateNotice />;
}
