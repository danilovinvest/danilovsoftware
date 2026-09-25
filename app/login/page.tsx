import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/modules/auth";
import { Wordmark } from "@/shared/ui/logo";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="bg-card w-full max-w-sm rounded-xl border p-6 shadow-sm">
        <Suspense fallback={<FormeDuFormulaire />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * Ce qu'on voit pendant que le formulaire descend.
 *
 * Le repli était `null`, c'est-à-dire **rien** : une carte vide. `LoginForm`
 * lit `useSearchParams`, donc il suspend, donc ce repli est ce que la page
 * montre tant que son morceau de JavaScript n'est pas arrivé. Sur un poste
 * c'est invisible ; sur un téléphone en données mobiles cela dure, et l'on
 * arrive ici depuis la garde du CRM qui affichait déjà un rond — au bout du
 * compte, une connexion qui « charge à l'infini » sans qu'aucune requête ne
 * parte, ce que le journal du serveur confirmait : pas un seul
 * `POST /v1/auth/login` pendant que le défaut durait.
 *
 * La silhouette a la forme de ce qui vient — marque, deux champs, un bouton —
 * pour qu'aucune ligne ne saute quand le formulaire prend sa place.
 */
function FormeDuFormulaire() {
  return (
    <div className="flex w-full flex-col gap-4" aria-busy>
      <Wordmark className="h-9 self-start" />
      <p className="text-muted-foreground text-sm">
        Connectez-vous pour accéder aux fiches client.
      </p>
      <div className="mt-2 flex flex-col gap-3" aria-hidden>
        <div className="bg-muted h-3 w-24 animate-pulse rounded" />
        <div className="bg-muted h-9 animate-pulse rounded-md" />
        <div className="bg-muted h-3 w-20 animate-pulse rounded" />
        <div className="bg-muted h-9 animate-pulse rounded-md" />
        <div className="bg-muted mt-1 h-9 animate-pulse rounded-md" />
      </div>
      <span className="sr-only">Chargement du formulaire de connexion…</span>
    </div>
  );
}
