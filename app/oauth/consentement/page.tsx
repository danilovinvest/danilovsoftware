import { RequireAuth } from "@/modules/auth";
import { ConsentView } from "@/modules/settings";

/**
 * L'écran de consentement d'un connecteur d'assistant.
 *
 * Il vit **hors du groupe `(crm)`**, sans barre latérale ni fil d'Ariane : on
 * y arrive depuis Claude, pour répondre à une seule question, et on en repart
 * aussitôt. Y poser la chrome de l'application inviterait à naviguer ailleurs
 * au milieu d'une autorisation.
 *
 * La garde d'authentification est donc déclarée ici plutôt qu'héritée : on ne
 * peut accorder au nom d'un compte qu'en étant ce compte, et l'arrivant qui
 * n'a pas de session passe par la connexion puis revient — c'est `?next=` qui
 * le ramène, avec la demande intacte.
 */
export default function ConsentementPage() {
  return (
    <RequireAuth>
      <ConsentView />
    </RequireAuth>
  );
}
