import type { Metadata } from "next";
import { PointageScreen } from "@/modules/workers";

export const metadata: Metadata = {
  title: "Pointage",
  // L'écran vit sur une tablette posée au dépôt : rien de tout cela n'a à
  // être indexé, et il n'y a derrière que des prénoms.
  robots: { index: false, follow: false },
};

/**
 * L'écran de pointage, servi sur son sous-domaine.
 *
 * **Hors du groupe `(crm)`**, pour la même raison que `/invitation` et `/cle` :
 * la garde d'authentification renverrait vers une connexion que l'équipe ne
 * peut pas faire — elle n'a pas de compte, seulement un mot de passe partagé.
 *
 * Aucun conteneur de plus : Caddy envoie `ouvrier.…` vers le même front, et
 * `/v1/*` vers la même API. La page appelle donc l'API de sa propre origine,
 * comme les trois autres hôtes.
 */
export default function PointagePage() {
  return <PointageScreen />;
}
