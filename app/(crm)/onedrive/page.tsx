import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { OneDriveView } from "@/modules/files";

export const metadata: Metadata = { title: "OneDrive" };

/*
La garde reprend la permission de l'entrée de navigation. Sans elle, un compte
sans `system:admin` qui suivait un lien arrivait sur l'écran et le voyait se
remplir d'erreurs, une par appel refusé (issue 95).
*/
export default function OneDrivePage() {
  return (
    <RequireAuth permission="system:admin">
      <OneDriveView />
    </RequireAuth>
  );
}
