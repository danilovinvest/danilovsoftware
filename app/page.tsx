import { redirect } from "next/navigation";

/**
 * La racine d'un CRM de société.
 *
 * Elle a brièvement porté le portail, du temps où l'apex et les deux sociétés
 * étaient servis par le même conteneur. Le portail est désormais une
 * application à lui — dépôt `danilovinvest/panel`, conteneur propre, racine de
 * l'apex — et ce front ne sert plus que `groupe.` et `structure.`. Ici, la
 * racine n'a donc rien à proposer : elle mène au tableau de bord, comme avant.
 *
 * Le retour au portail vit dans l'en-tête (`shell-header.tsx`), à gauche.
 */
export default function HomePage() {
  redirect("/dashboard");
}
