import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { CompanyPortal } from "@/modules/group";

export const metadata: Metadata = { title: "OMPT CRM" };

/**
 * La racine du domaine principal : le portail.
 *
 * Elle redirigeait vers le tableau de bord, du temps où il n'y avait qu'un CRM.
 * Il y en a deux — un par société, chacun sur son sous-domaine — et cette page
 * est l'endroit où l'on s'authentifie une fois avant de choisir.
 *
 * Elle vit **hors du groupe `(crm)`** : elle n'a ni barre latérale ni fil
 * d'Ariane, parce qu'elle n'appartient à aucune société. `RequireAuth` suffit,
 * et renvoie vers la connexion en gardant la destination.
 */
export default function PortalPage() {
  return (
    <RequireAuth>
      <div className="grid min-h-dvh place-items-center px-6 py-10">
        <CompanyPortal />
      </div>
    </RequireAuth>
  );
}
