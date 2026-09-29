"use client";

import { MailIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Contact } from "../lib/types";
import { PhoneLink } from "./customer-list-parts";

/**
 * Le rôle, le numéro et l'adresse d'un interlocuteur, qui s'appellent et
 * s'écrivent d'un geste (issue 60) : au téléphone, le numéro de l'architecte
 * ne doit pas être à recopier.
 */
export function ContactCoordinates({
  contact,
  className,
}: {
  contact: Contact;
  className?: string;
}) {
  const parts = [
    contact.role_label && <span key="role">{contact.role_label}</span>,
    // L'employeur, quand il diffère de la fiche : sur une copropriété, la
    // personne qu'on appelle appartient au cabinet, pas à l'immeuble.
    contact.company_name && <span key="societe">{contact.company_name}</span>,
    // Les autres numéros, comptés plutôt qu'alignés : une carte
    // d'interlocuteur tient sur une ligne, et six numéros la feraient déborder.
    contact.phones.length > 0 && (
      <span key="autres-tel">{`+${contact.phones.length} n° au dossier`}</span>
    ),
    contact.emails.length > 0 && (
      <span key="autres-mails">{`+${contact.emails.length} adresse${contact.emails.length > 1 ? "s" : ""}`}</span>
    ),
    contact.phone && <PhoneLink key="phone" phone={contact.phone} />,
    contact.email && (
      <a
        key="mail"
        href={`mailto:${contact.email}`}
        className="hover:text-foreground inline-flex min-w-0 items-center gap-1 hover:underline"
      >
        <MailIcon className="size-3 shrink-0" />
        <span className="truncate">{contact.email}</span>
      </a>
    ),
  ].filter(Boolean);
  return (
    <span
      className={cn(
        "text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs",
        className,
      )}
    >
      {parts.length > 0 ? parts : "—"}
    </span>
  );
}
