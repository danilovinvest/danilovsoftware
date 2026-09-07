import { Suspense } from "react";
import { MailboxView } from "@/modules/mail";

/*
La borne Suspense n'est pas décorative : l'écran lit `?message=` pour ouvrir le
courriel désigné par la recherche globale, et `useSearchParams` fait basculer
en rendu client tout l'arbre jusqu'à la borne la plus proche. Sans elle, ce
serait la mise en page entière — barre latérale comprise — qui cesserait d'être
préparée à l'avance.
*/
export default function MailPage() {
  return (
    <Suspense>
      <MailboxView />
    </Suspense>
  );
}
