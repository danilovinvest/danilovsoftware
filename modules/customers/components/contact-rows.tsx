"use client";

import { CheckIcon, MailIcon, PhoneIcon, SplitIcon, StarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { formatPhone } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import type { Contact } from "../lib/types";
import { RowMenu } from "./row-menu";

/** Ce qu'une ligne d'interlocuteur sait faire ; chaque geste est facultatif. */
export type ContactGestures = {
  onEdit?: () => void;
  onRemove?: () => void;
  onMakePrimary?: () => void;
  /** Déclarer l'adresse partagée, ou la rendre à la fiche. */
  onToggleShared?: () => void;
  busy?: boolean;
};

/** Le numéro principal d'abord, puis les autres, sans doublon. */
export function phonesOf(contact: Contact): string[] {
  return unique([contact.phone, ...contact.phones]);
}

export function emailsOf(contact: Contact): string[] {
  return unique([contact.email, ...contact.emails]);
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

/** Ce qu'est la personne, en une phrase : « Syndic · Foncia Cannes ». */
function describe(contact: Contact): string {
  return [contact.role_label, contact.company_name].filter(Boolean).join(" · ");
}

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/**
 * Une ligne de l'en-tête : qui, en quelle qualité, et de quoi l'appeler.
 *
 * Tout tient sur une ligne et rien n'y passe à la ligne : le rôle se tronque
 * (en entier au survol), le numéro et l'adresse sont des icônes alignées à
 * droite — le numéro s'écrit à côté de la sienne dès qu'il y a la place. Les
 * notes de la personne n'y sont pas : elles vivent dans l'onglet Fiche.
 *
 * La ligne est une sous-grille de la liste : les noms, les rôles et les
 * icônes tombent en colonnes d'une personne à l'autre.
 */
export function CompactContactRow({
  contact,
  gestures,
}: {
  contact: Contact;
  gestures: ContactGestures;
}) {
  const role = describe(contact);
  const phone = phonesOf(contact)[0];
  const email = emailsOf(contact)[0];
  return (
    <li className="col-span-4 grid min-h-7 grid-cols-subgrid items-center">
      <span className="flex min-w-0 items-center gap-1.5">
        <ContactName contact={contact} onEdit={gestures.onEdit} className="max-w-40 sm:max-w-56" />
        {contact.is_primary && <PrimaryBadge />}
        {contact.shared_address && <SharedBadge />}
      </span>
      <span className="text-muted-foreground truncate text-xs" title={role || undefined}>
        {role}
      </span>
      <span className="text-muted-foreground flex items-center justify-end gap-0.5 text-xs">
        {phone && (
          <a
            href={telHref(phone)}
            title={`Appeler ${formatPhone(phone)}`}
            aria-label={`Appeler ${contact.full_name}`}
            className="hover:bg-muted hover:text-foreground inline-flex h-6 items-center gap-1 rounded-md px-1.5"
          >
            <PhoneIcon className="size-3.5 shrink-0" />
            <span className="hidden whitespace-nowrap tabular-nums sm:inline">
              {formatPhone(phone)}
            </span>
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            title={`Écrire à ${email}`}
            aria-label={`Écrire à ${contact.full_name}`}
            className="hover:bg-muted hover:text-foreground inline-flex size-6 items-center justify-center rounded-md"
          >
            <MailIcon className="size-3.5" />
          </a>
        )}
      </span>
      <ContactMenu contact={contact} gestures={gestures} />
    </li>
  );
}

/**
 * Une ligne de l'onglet Fiche : la personne en entier — tous ses numéros,
 * toutes ses adresses, et ses notes, qui n'ont leur place que là.
 */
export function FullContactRow({
  contact,
  gestures,
  demo,
}: {
  contact: Contact;
  gestures: ContactGestures;
  /** `data-demo` du « … », posé sur la première ligne seulement. */
  demo?: string;
}) {
  const role = describe(contact);
  const phones = phonesOf(contact);
  const emails = emailsOf(contact);
  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <ContactName contact={contact} onEdit={gestures.onEdit} />
          {contact.is_primary && <PrimaryBadge />}
          {contact.shared_address && <SharedBadge />}
        </div>
        {role && <p className="text-muted-foreground text-xs">{role}</p>}
        {(phones.length > 0 || emails.length > 0) && (
          <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {phones.map((phone) => (
              <a
                key={phone}
                href={telHref(phone)}
                className="hover:text-foreground inline-flex items-center gap-1.5 tabular-nums hover:underline"
              >
                <PhoneIcon className="size-3.5 shrink-0" />
                {formatPhone(phone)}
              </a>
            ))}
            {emails.map((email) => (
              <a
                key={email}
                href={`mailto:${email}`}
                className="hover:text-foreground inline-flex min-w-0 items-center gap-1.5 hover:underline"
              >
                <MailIcon className="size-3.5 shrink-0" />
                <span className="break-all">{email}</span>
              </a>
            ))}
          </div>
        )}
        {contact.notes && (
          <p className="text-muted-foreground bg-muted/50 mt-1 rounded-md px-2 py-1.5 text-xs whitespace-pre-line">
            {contact.notes}
          </p>
        )}
      </div>
      <ContactMenu contact={contact} gestures={gestures} demo={demo} />
    </li>
  );
}

function ContactName({
  contact,
  onEdit,
  className,
}: {
  contact: Contact;
  onEdit?: () => void;
  className?: string;
}) {
  if (!onEdit) {
    return (
      <span className={cn("truncate text-sm font-medium", className)} title={contact.full_name}>
        {contact.full_name}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={cn("truncate text-left text-sm font-medium hover:underline", className)}
      title={`Modifier ${contact.full_name}`}
      onClick={onEdit}
    >
      {contact.full_name}
    </button>
  );
}

function PrimaryBadge() {
  return (
    <Badge variant="secondary" className="h-4 shrink-0 px-1.5 text-[10px]">
      Principal
    </Badge>
  );
}

/**
 * L'adresse ne rattache aucun courriel à elle seule : la personne écrit pour
 * plusieurs dossiers. Dit sur la ligne, sans quoi on se demanderait pourquoi
 * ses courriels n'arrivent pas sur la fiche.
 */
function SharedBadge() {
  return (
    <Badge
      variant="outline"
      className="h-4 shrink-0 px-1.5 text-[10px]"
      title="Adresse partagée : ses courriels sont rangés par indice, ou dans « À classer »"
    >
      Partagée
    </Badge>
  );
}

/** Un seul « … » par ligne, comme les devis et l'historique. */
function ContactMenu({
  contact,
  gestures,
  demo,
}: {
  contact: Contact;
  gestures: ContactGestures;
  demo?: string;
}) {
  const makePrimary = contact.is_primary ? undefined : gestures.onMakePrimary;
  // Sans adresse, il n'y a rien à partager.
  const toggleShared = emailsOf(contact).length > 0 ? gestures.onToggleShared : undefined;
  if (!gestures.onEdit && !gestures.onRemove && !makePrimary && !toggleShared) {
    // La colonne reste là, vide : la grille de l'en-tête ne se décale pas.
    return <span aria-hidden />;
  }
  return (
    <RowMenu
      label={`Actions sur ${contact.full_name}`}
      demo={demo}
      disabled={gestures.busy}
      onEdit={gestures.onEdit}
      editLabel="Modifier l'interlocuteur…"
      onDelete={gestures.onRemove}
      deleteLabel="Supprimer l'interlocuteur…"
    >
      {makePrimary && (
        <DropdownMenuItem onSelect={makePrimary}>
          <StarIcon />
          Définir comme principal
        </DropdownMenuItem>
      )}
      {toggleShared && (
        <DropdownMenuItem onSelect={toggleShared} data-demo="contact-shared-address">
          {contact.shared_address ? <CheckIcon /> : <SplitIcon />}
          Adresse partagée : ne rattache pas les courriels
        </DropdownMenuItem>
      )}
    </RowMenu>
  );
}
