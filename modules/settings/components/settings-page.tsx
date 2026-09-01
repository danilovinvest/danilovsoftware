import { cn } from "@/lib/utils";

/**
 * Gabarit d'une page de réglages.
 *
 * Twenty n'étale pas ses réglages sur toute la largeur : le contenu tient dans
 * une colonne étroite, titre en petit, sections espacées. C'est ce qui
 * distingue une page de configuration d'une page de données.
 */
export function SettingsPage({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header>
        <h1 className="text-base font-semibold">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
        )}
      </header>
      {children}
    </div>
  );
}

export function SettingsSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium">{title}</h2>
          {description && (
            <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Conteneur des lignes de réglage : un bloc bordé, des lignes séparées. */
export function SettingsRows({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("divide-y overflow-hidden rounded-lg border", className)}>
      {children}
    </div>
  );
}

/**
 * Ligne « libellé à gauche, valeur à droite ». La valeur reste alignée à droite
 * et peut être n'importe quoi : du texte, une pastille, un bouton.
 */
export function SettingsRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        {hint && <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>}
      </div>
      <div className="text-muted-foreground shrink-0 text-right text-sm">
        {children}
      </div>
    </div>
  );
}
