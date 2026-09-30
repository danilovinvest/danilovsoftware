import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { ErrorNotice } from "@/shared/ui/feedback";
import { ListSkeleton } from "@/shared/ui/loading";
import type { Live } from "../hooks/use-live";

/** Le titre d'une section de l'écran : discret, c'est le contenu qui parle. */
export function SectionTitle({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {children}
      </h2>
      {aside}
    </div>
  );
}

/** Le lien d'en-tête d'un panneau vers l'écran qui en dit plus. */
export function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1 text-xs"
    >
      {children}
      <ArrowRightIcon className="size-3" />
    </Link>
  );
}

/** « et 4 autres » : une liste bornée le dit plutôt que de s'arrêter en silence. */
export function PanelMore({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground block border-t px-4 py-2 text-xs"
    >
      {children}
    </Link>
  );
}

/** Le mot d'un panneau qui n'a rien à montrer — une bonne nouvelle, le plus souvent. */
export function PanelEmpty({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground px-4 py-6 text-center text-xs">{children}</p>;
}

/**
 * Le corps d'un panneau vivant : son attente, son erreur, puis son contenu.
 *
 * L'erreur n'efface pas ce qu'on lisait : si le cache tient encore une
 * réponse, elle reste affichée sous le message, qui propose de réessayer.
 */
export function PanelState<T>({
  live,
  rows = 4,
  children,
}: {
  live: Live<T>;
  rows?: number;
  children: (data: T) => React.ReactNode;
}) {
  return (
    <>
      {live.error && (
        <div className="p-3">
          <ErrorNotice message={live.error} onRetry={live.reload} />
        </div>
      )}
      {live.loading ? (
        <ListSkeleton rows={rows} hue="violet" />
      ) : (
        live.data !== null && children(live.data)
      )}
    </>
  );
}
