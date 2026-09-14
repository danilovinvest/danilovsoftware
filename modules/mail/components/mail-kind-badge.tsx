import { CornerDownRightIcon, SparkleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MailMessage } from "../lib/types";

/**
 * « Nouveau » ou « Réponse », sur un message reçu.
 *
 * Un premier message est une demande qui arrive — un prospect, un architecte
 * qui ouvre un dossier. Une réponse est la suite d'un échange en cours, souvent
 * celle qu'on attendait. Les deux ne se traitent pas pareil, et dans une liste
 * de sujets rien ne les distinguait.
 *
 * Rien sur un message envoyé : il n'arrive pas, il part.
 *
 * Deux teintes qui ne servent à rien d'autre dans la ligne : le vert y dit déjà
 * « rattaché à une fiche ». La réponse prend l'information, le nouveau l'accent.
 */
export function MailKindBadge({
  message,
  className,
}: {
  message: Pick<MailMessage, "outgoing" | "is_reply">;
  className?: string;
}) {
  if (message.outgoing) return null;

  return message.is_reply ? (
    <span
      title="Réponse dans une conversation déjà ouverte"
      className={cn(
        "bg-info-soft text-info inline-flex shrink-0 items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-[0.65rem] font-medium",
        className,
      )}
    >
      <CornerDownRightIcon className="size-2.5" />
      Réponse
    </span>
  ) : (
    <span
      title="Premier message d'une conversation"
      className={cn(
        "bg-selected text-brand-text inline-flex shrink-0 items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-[0.65rem] font-medium",
        className,
      )}
    >
      <SparkleIcon className="size-2.5" />
      Nouveau
    </span>
  );
}
