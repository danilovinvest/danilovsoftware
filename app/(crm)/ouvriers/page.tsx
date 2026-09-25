import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { WorkersView } from "@/modules/workers";

export const metadata: Metadata = { title: "Ouvriers" };

/*
La garde reprend la permission de l'entrée de navigation. Sans elle, un compte
sans `workers:read` qui suivait un lien arrivait sur l'écran et le voyait se
remplir d'erreurs, une par appel refusé — c'est le défaut nommé et corrigé sur
`/onedrive` (issue 95), et l'oublier ici l'aurait reproduit à la lettre.
*/
export default function WorkersPage() {
  return (
    <RequireAuth permission="workers:read">
      <WorkersView />
    </RequireAuth>
  );
}
