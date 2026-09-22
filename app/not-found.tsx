import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page introuvable" };

/**
 * Une adresse qui ne mène nulle part : un lien ancien, une faute de frappe.
 *
 * Next affichait son 404 anglais, hors du cadre et sans chemin de retour. Ici,
 * on dit ce qui s'est passé et où repartir.
 */
export default function NotFound() {
  return (
    <main className="bg-background flex min-h-svh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-muted-foreground text-sm font-medium">404</p>
      <h1 className="text-lg font-semibold">Cette page n&apos;existe pas</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        Le lien est peut-être ancien, ou l&apos;adresse mal recopiée. La fiche ou l&apos;affaire
        se retrouve par la recherche.
      </p>
      <div className="flex gap-2 pt-2">
        <Button asChild>
          <Link href="/dashboard">Tableau de bord</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/customers">Fiches client</Link>
        </Button>
      </div>
    </main>
  );
}
