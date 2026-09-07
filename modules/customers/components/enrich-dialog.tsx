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

  const chercher = useAction(() => api.enrichFromMail(customer.id));
  const appliquer = useAction((patch: Partial<CustomerDetail>) =>
    api.updateCustomer(customer.id, {
      display_name: customer.display_name,
      kind: customer.kind,
      status: customer.status,
      source: customer.source,
      company_name: customer.company_name,
      email: customer.email,
      phone: customer.phone,
      address_line: customer.address_line,
      postal_code: customer.postal_code,
      city: customer.city,
      country: customer.country || "France",
      requested_at: customer.requested_at,
      notes: customer.notes,
      owner_id: customer.owner_id,
      ...patch,
    }),
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
  const trouvailles = proposition
    ? CHAMPS.map((c) => ({ ...c, trouve: proposition[c.cle] })).filter(
        (c): c is typeof c & { trouve: Finding } => Boolean(c.trouve?.value),
      )
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
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
            <p className="text-muted-foreground text-sm">
              Lecture des courriels en cours, cela prend une minute…
            </p>
          </div>
        )}

        {chercher.error && <ErrorNotice message={chercher.error} />}
        {appliquer.error && <ErrorNotice message={appliquer.error} />}

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
                            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[3px] border",
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
              Les autres personnes du dossier — architecte, syndic, conjoint.
              Elles sont montrées mais pas créées : un contact se rattache à une
              fiche, et deviner laquelle en poserait de faux.
            */}
            {proposition.contacts.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                  <UsersIcon className="size-3.5" />
                  Autres personnes citées
                </span>
                <ul className="divide-y rounded-md border text-xs">
                  {proposition.contacts.map((contact, index) => (
                    <li key={index} className="flex flex-wrap gap-x-3 px-3 py-2">
                      <span className="font-medium">{contact.name || contact.email}</span>
                      {contact.role && (
                        <span className="text-muted-foreground">{contact.role}</span>
                      )}
                      {contact.email && (
                        <span className="text-muted-foreground">{contact.email}</span>
                      )}
                      {contact.phone && (
                        <span className="text-muted-foreground">{formatPhone(contact.phone)}</span>
                      )}
                    </li>
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
            disabled={choisis.size === 0 || appliquer.pending}
            onClick={async () => {
              if (!proposition) return;
              const patch: Record<string, string> = {};
              for (const cle of choisis) {
                const trouve = proposition[cle];
                if (trouve?.value) patch[cle] = trouve.value;
              }
              if (!(await appliquer.run(patch))) return;
              onOpenChange(false);
              onSaved();
            }}
          >
            <CheckIcon />
            Appliquer {choisis.size > 0 && `(${choisis.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
