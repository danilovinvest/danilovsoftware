import type { Metadata } from "next";
import { PasskeyEnrollForm } from "@/modules/auth";

export const metadata: Metadata = { title: "Créer votre clé d'accès" };

/**
 * Page publique, hors du groupe `(crm)`.
 *
 * La personne n'a pas de session — c'est tout l'objet du lien — et la garde
 * d'authentification la renverrait vers une connexion qu'elle ne peut
 * précisément pas faire : elle n'a pas encore de clé, et peut-être pas de mot
 * de passe. Même raison que la page d'invitation, et même emplacement.
 *
 * Le chemin est court (`/cle/<jeton>`) parce qu'il est parfois retapé à la main
 * depuis un message : chaque segment de plus est une occasion de faute.
 */
export default async function PasskeyEnrollPage(props: PageProps<"/cle/[token]">) {
  const { token } = await props.params;

  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="bg-card w-full max-w-sm rounded-xl border p-6 shadow-sm">
        <PasskeyEnrollForm token={token} />
      </div>
    </div>
  );
}
