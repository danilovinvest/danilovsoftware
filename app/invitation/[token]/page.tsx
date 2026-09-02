import type { Metadata } from "next";
import { InvitationForm } from "@/modules/auth";

export const metadata: Metadata = { title: "Invitation — Danilov CRM" };

/**
 * Page publique, hors du groupe `(crm)` : l'invité n'a pas encore de compte,
 * et la garde d'authentification le renverrait vers la connexion.
 */
export default async function InvitationPage(props: PageProps<"/invitation/[token]">) {
  const { token } = await props.params;

  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="bg-card w-full max-w-sm rounded-xl border p-6 shadow-sm">
        <InvitationForm token={token} />
      </div>
    </div>
  );
}
