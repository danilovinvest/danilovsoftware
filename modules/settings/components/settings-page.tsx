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
  /*
    Le libellé garde sa colonne, la valeur prend le reste et **passe à la
    ligne**.

    `shrink-0` sur la valeur partait du principe qu'elle est courte — un nombre,
    un interrupteur. Dès qu'elle est une phrase, elle réclamait toute la largeur
    et écrasait le libellé : « À l'ouverture d'un message » se rendait sur
    quatre lignes d'un mot, sous une valeur qui débordait de la carte. C'est
    l'inverse qu'il faut, le libellé étant le seul des deux dont on connaisse la
    longueur.

    En dessous de `sm`, les deux s'empilent : côte à côte sur un téléphone, il
    ne resterait ni l'un ni l'autre.
  */
  return (
    <div className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <div className="min-w-0 sm:w-56 sm:shrink-0">
        <p className="text-sm">{label}</p>
        {hint && <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>}
      </div>
      <div className="text-muted-foreground min-w-0 text-sm sm:flex-1 sm:text-right">
        {children}
      </div>
    </div>
  );
}
