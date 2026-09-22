"use client";

import { useEffect, useState } from "react";
import {
  BuildingIcon,
  CheckIcon,
  MailIcon,
  MapPinIcon,
  PaperclipIcon,
  PhoneIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorNotice, Spinner } from "@/shared/ui/feedback";
import { formatPhone, plural } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import { useAction } from "../hooks/use-customers";
import * as api from "../lib/api";
import type {
  CustomerDetail,
  CustomerPayload,
  EnrichResult,
  Finding,
  FoundContact,
  RetainedMail,
} from "../lib/types";

/**
 * Faire lire les courriels du client par le modèle.
 *
 * Ce que la reprise n'a pas su remplir dort dans neuf mille courriels : une
 * adresse au bas d'une signature, un téléphone donné au fil d'une phrase, la
 * raison sociale d'un syndic. Aucune expression régulière ne le sortira ; un
 * modèle qui lit, si.
 *
 * **Il propose, il n'écrit pas.** Chaque valeur arrive avec sa preuve — le
 * message et sa date — et se coche. Rien n'entre dans la fiche sans que
 * quelqu'un l'ait vu : une adresse inventée dans une proposition se remarque,
 * la même écrite en base enverrait la prochaine relance au mauvais client.
 */

type Champ = keyof Pick<
  CustomerDetail,
  "email" | "phone" | "address_line" | "postal_code" | "city" | "company_name"
>;

const CHAMPS: Array<{ cle: Champ; label: string; icon: LucideIcon }> = [
  { cle: "email", label: "E-mail", icon: MailIcon },
  { cle: "phone", label: "Téléphone", icon: PhoneIcon },
  { cle: "address_line", label: "Adresse", icon: MapPinIcon },
  { cle: "postal_code", label: "Code postal", icon: MapPinIcon },
  { cle: "city", label: "Ville", icon: MapPinIcon },
  { cle: "company_name", label: "Société", icon: BuildingIcon },
];

export function EnrichDialog({
  customer,
  open,
  onOpenChange,
  onSaved,
}: {
  customer: CustomerDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [result, setResult] = useState<EnrichResult | null>(null);
  const [choisis, setChoisis] = useState<Set<Champ>>(new Set());
  // Les courriels et les interlocuteurs se cochent séparément des champs : ce
  // ne sont pas les mêmes gestes, et on peut vouloir l'un sans l'autre.
  const [mails, setMails] = useState<Set<string>>(new Set());
  const [gens, setGens] = useState<Set<number>>(new Set());

  const chercher = useAction(() => api.enrichFromMail(customer.id), { inline: true });
  const rattacher = useAction((input: { message_ids: string[]; contacts: FoundContact[] }) =>
    api.applyEnrichment(customer.id, input),
    { inline: true },
  );
  const appliquer = useAction((patch: Partial<CustomerPayload>) =>
    // Seules les valeurs retenues partent : le serveur garde le reste de la fiche.
    api.updateCustomer(customer.id, patch),
    { inline: true },
  );

  // La recherche part à l'ouverture : c'est le geste attendu, et demander un
  // second clic pour lancer ce qu'on vient de demander serait une formalité.
  useEffect(() => {
    if (!open) return;
    let vivant = true;
    chercher.run().then((found) => {
      if (!vivant || !found) return;
      setResult(found);
      // Ce qui comble un champ vide est coché d'office ; ce qui écraserait une
      // valeur existante ne l'est pas, et c'est la seule différence.
      const proposes = new Set<Champ>();
      for (const { cle } of CHAMPS) {
        const trouve = found.proposal[cle];
        if (trouve?.value && !customer[cle]) proposes.add(cle);
      }
      setChoisis(proposes);
      // Tout ce qui n'est pas déjà en place est coché : c'est ce qu'on vient
      // chercher, et décocher est plus rapide que cocher trente lignes.
      setMails(new Set(found.retained.filter((m) => !m.linked).map((m) => m.id)));
      setGens(new Set(found.proposal.contacts.map((_, index) => index)));
    });
    return () => {
      vivant = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customer.id]);

  function bascule(cle: Champ) {
    setChoisis((actuel) => {
      const suivant = new Set(actuel);
      if (suivant.has(cle)) suivant.delete(cle);
      else suivant.add(cle);
      return suivant;
    });
  }

  function basculeMail(id: string) {
    setMails((actuel) => {
      const suivant = new Set(actuel);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  }

  function basculeGens(index: number) {
    setGens((actuel) => {
      const suivant = new Set(actuel);
      if (suivant.has(index)) suivant.delete(index);
      else suivant.add(index);
      return suivant;
    });
  }

  const proposition = result?.proposal;
  const aRattacher = (result?.retained ?? []).filter((m) => !m.linked);
  const total = choisis.size + mails.size + gens.size;
  const trouvailles = proposition
    ? CHAMPS.map((c) => ({ ...c, trouve: proposition[c.cle] })).filter(
        (c): c is typeof c & { trouve: Finding } => Boolean(c.trouve?.value),
      )
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" data-demo="chercher-messagerie">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="text-info size-4" />
            Chercher dans la messagerie
          </DialogTitle>
          <DialogDescription>
            {result
              ? `${plural(result.messages_examined, "courriel")} lus par ${result.model} en ${result.seconds} s.`
              : `Le modèle lit les courriels qui concernent ${customer.display_name}.`}
          </DialogDescription>
        </DialogHeader>

        {chercher.pending && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Spinner />
            {/* « Une minute » est la bonne promesse, et elle est mesurée : un
                dossier réel de vingt-cinq courriels demande environ soixante-dix
                secondes de génération. J'avais écrit « quelques secondes » sur
                la foi d'un test à cinq mots — mesurer la mauvaise chose donne
                une promesse fausse, et une attente qu'on croit bloquée se ferme
                avant la réponse. */}
            <p className="text-muted-foreground text-sm">
              Lecture des courriels en cours, comptez une minute…
            </p>
          </div>
        )}

        {chercher.error && <ErrorNotice message={chercher.error} />}
        {appliquer.error && <ErrorNotice message={appliquer.error} />}
        {rattacher.error && <ErrorNotice message={rattacher.error} />}

        {proposition && !chercher.pending && (
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
            {trouvailles.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Le modèle n&apos;a rien trouvé de vérifiable dans ces courriels.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {trouvailles.map(({ cle, label, icon: Icon, trouve }) => {
                  const actuel = customer[cle];
                  const coche = choisis.has(cle);
                  return (
                    <li key={cle}>
                      <button
                        type="button"
                        onClick={() => bascule(cle)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
                          coche ? "border-primary bg-primary/5" : "hover:bg-muted/40",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border",
                            coche ? "bg-primary border-primary" : "border-border",
                          )}
                        >
                          {coche && (
                            <CheckIcon className="text-primary-foreground size-3" strokeWidth={3} />
                          )}
                        </span>

                        <Icon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-muted-foreground text-xs">{label}</span>
                            <span className="text-sm font-medium">
                              {cle === "phone" ? formatPhone(trouve.value) : trouve.value}
                            </span>
                            {actuel && (
                              <span className="text-warning text-xs">
                                remplace « {actuel} »
                              </span>
                            )}
                          </div>
                          <p className="text-muted-foreground/70 mt-0.5 text-xs">
                            {trouve.evidence}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {proposition.summary && (
              <div className="bg-muted/40 rounded-md px-3 py-2.5">
                <p className="text-muted-foreground text-xs whitespace-pre-line">
                  {proposition.summary}
                </p>
              </div>
            )}

            {/*
              Les courriels que le modèle a reconnus. La recherche par adresse
              ne trouve que ce qui porte l'adresse : un fil où le client est en
              copie, ou signé d'une autre boîte, lui échappe. Le modèle, lui,
              l'a lu.
            */}
            {aRattacher.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                  <PaperclipIcon className="size-3.5" />
                  Courriels à rattacher à la fiche
                </span>
                <ul className="flex flex-col gap-1">
                  {aRattacher.map((message) => (
                    <MailRow
                      key={message.id}
                      message={message}
                      coche={mails.has(message.id)}
                      onToggle={() => basculeMail(message.id)}
                    />
                  ))}
                </ul>
              </div>
            )}

            {/*
              Les intervenants du chantier : ingénieur béton, architecte,
              syndic. Ils écrivent dans le fil, portent une part de l'affaire,
              et n'existent nulle part dans le CRM. Les nommer, c'est pouvoir
              les retrouver au chantier suivant.
            */}
            {proposition.contacts.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                  <UsersIcon className="size-3.5" />
                  Interlocuteurs à ajouter
                </span>
                <ul className="flex flex-col gap-1">
                  {proposition.contacts.map((contact, index) => (
                    <ContactRow
                      key={index}
                      contact={contact}
                      coche={gens.has(index)}
                      onToggle={() => basculeGens(index)}
                    />
                  ))}
                </ul>
              </div>
            )}

            {proposition.questions.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs font-medium">
                  Ce que le modèle n&apos;a pas su trancher
                </span>
                <ul className="text-muted-foreground/70 list-inside list-disc text-xs">
                  {proposition.questions.map((q, index) => (
                    <li key={index}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
          <Button
            disabled={total === 0 || appliquer.pending || rattacher.pending}
            onClick={async () => {
              if (!proposition) return;

              // Les champs d'abord : renseigner l'adresse rattache d'elle-même
              // le courrier qui la porte, et le rattachement explicite se
              // limite alors à ce qui lui échappait.
              if (choisis.size > 0) {
                const patch: Record<string, string> = {};
                for (const cle of choisis) {
                  const trouve = proposition[cle];
                  if (trouve?.value) patch[cle] = trouve.value;
                }
                if (!(await appliquer.run(patch))) return;
              }

              if (mails.size > 0 || gens.size > 0) {
                const ok = await rattacher.run({
                  message_ids: [...mails],
                  contacts: proposition.contacts.filter((_, index) => gens.has(index)),
                });
                if (!ok) return;
              }

              onOpenChange(false);
              onSaved();
            }}
          >
            <CheckIcon />
            Appliquer {total > 0 && `(${total})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Une case à cocher partagée : même geste, même aspect, deux contenus. */
function Coche({ coche }: { coche: boolean }) {
  return (
    <span
      className={cn(
        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border",
        coche ? "bg-primary border-primary" : "border-border",
      )}
    >
      {coche && <CheckIcon className="text-primary-foreground size-3" strokeWidth={3} />}
    </span>
  );
}

function MailRow({
  message,
  coche,
  onToggle,
}: {
  message: RetainedMail;
  coche: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left transition-colors",
          coche ? "border-primary bg-primary/5" : "hover:bg-muted/40",
        )}
      >
        <Coche coche={coche} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium">
            {message.subject || "(sans objet)"}
          </div>
          <div className="text-muted-foreground/70 truncate text-[0.7rem]">
            {message.from} · {new Date(message.sent_at).toLocaleDateString("fr-FR")}
          </div>
        </div>
      </button>
    </li>
  );
}

function ContactRow({
  contact,
  coche,
  onToggle,
}: {
  contact: FoundContact;
  coche: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left transition-colors",
          coche ? "border-primary bg-primary/5" : "hover:bg-muted/40",
        )}
      >
        <Coche coche={coche} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-xs font-medium">{contact.name || contact.email}</span>
            {contact.role && (
              <span className="text-muted-foreground text-[0.7rem]">{contact.role}</span>
            )}
          </div>
          <div className="text-muted-foreground/70 truncate text-[0.7rem]">
            {[contact.email, contact.phone && formatPhone(contact.phone)]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
      </button>
    </li>
  );
}
