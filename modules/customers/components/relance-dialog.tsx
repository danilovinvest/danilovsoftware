"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, InfoIcon, MailIcon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextAreaField, TextField } from "@/shared/ui/form";
import { ErrorNotice } from "@/shared/ui/feedback";
import { formatAmount, formatDate } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import { useAction } from "../hooks/use-customers";
import * as api from "../lib/api";
import { daysSince, leadQuote } from "../lib/cycle";
import {
  RELANCE_TEMPLATES,
  RELANCE_VARIABLES,
  TEMPLATE_BY_MOTIVE,
  render,
  type RelanceMotive,
} from "../lib/templates";
import type { Customer, Project, Quote } from "../lib/types";
import { useDirtyGuard } from "@/shared/lib/dirty-guard";

/**
 * Relancer un client qui ne signe pas.
 *
 * Le bouton précédent ne faisait qu'horodater : on savait qu'on avait relancé,
 * jamais pourquoi le client hésitait. Ici le **motif vient d'abord**, il
 * choisit le texte, et il est enregistré avec la relance — c'est ce qui permet,
 * au troisième message, de dire « il bloque sur le prix depuis juin ».
 *
 * Le texte est toujours modifiable. Un gabarit qui partirait tel quel serait
 * un publipostage, et se verrait comme tel.
 *
 * **Rien ne part encore.** L'envoi est simulé et l'écran le dit. Ce qui est
 * réel, en revanche, c'est l'enregistrement : `logReminder` crée une vraie
 * interaction de type relance, avec le motif en résumé et le message en
 * détail. Le jour où le CRM enverra, seule la ligne d'envoi s'ajoutera ici.
 */
export function RelanceDialog({
  customer,
  project,
  quotes,
  open,
  onOpenChange,
  onSaved,
}: {
  customer: Customer;
  project: Project;
  quotes: Quote[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  // L'instant est figé à l'ouverture : « relancé il y a 12 jours » ne doit pas
  // changer pendant qu'on rédige, et le compilateur React refuse une horloge
  // lue au rendu.
  const [now] = useState(() => Date.now());

  const quote = leadQuote(quotes);
  const values = {
    client: customer.display_name,
    affaire: project.label,
    devis: quote?.reference || quote?.label || "notre devis",
    montant: formatAmount(quote?.amount_ttc ?? quote?.amount_ht),
    date_devis: formatDate(quote?.issued_at),
    jours: String(daysSince(now, quote?.issued_at ?? null) ?? 0),
    signature: "OMPT Structure",
  };

  const [motive, setMotive] = useState<RelanceMotive>("sans_reponse");
  const [subject, setSubject] = useState(() =>
    render(TEMPLATE_BY_MOTIVE.get("sans_reponse")!.subject, values),
  );
  const [body, setBody] = useState(() =>
    render(TEMPLATE_BY_MOTIVE.get("sans_reponse")!.body, values),
  );
  const [touched, setTouched] = useState(false);
  // Un message retouché ne se perd pas sur Échap ou un clic à côté.
  const close = useDirtyGuard(touched, onOpenChange);

  /*
    Le texte rédigé part avec la relance.

    Seul le motif partait : l'écran affirmait « enregistrée avec son motif et
    son texte » et jetait le texte. C'est pourtant lui qui permet au troisième
    message de dire « il bloque sur le prix depuis juin ».
  */
  const send = useAction(() =>
    api.logReminder(
      project.id,
      `Relance — ${TEMPLATE_BY_MOTIVE.get(motive)!.label.toLowerCase()}`,
      `Objet : ${subject.trim()}\n\n${body.trim()}`,
    ),
    { inline: true },
  );
  const [copie, setCopie] = useState(false);

  /*
    L'envoi direct n'est pas branché : le CRM lit la boîte, il n'y écrit pas.
    En attendant, le message s'ouvre dans la messagerie du poste, prérempli,
    ou se copie — plus de texte à retaper dans Gmail.
  */
  const mailto = `mailto:${encodeURIComponent(customer.email ?? "")}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;

  async function copier() {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      setCopie(true);
    } catch {
      setCopie(false);
    }
  }

  /**
   * Changer de motif réécrit le message — sauf s'il a été retouché. Écraser
   * trois paragraphes qu'on vient d'écrire parce qu'on corrige le motif serait
   * la pire surprise que cet écran puisse faire.
   */
  function pick(next: RelanceMotive) {
    setMotive(next);
    if (touched) return;
    const template = TEMPLATE_BY_MOTIVE.get(next)!;
    setSubject(render(template.subject, values));
    setBody(render(template.body, values));
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Relancer {customer.display_name}</DialogTitle>
          <DialogDescription>
            {quote?.reference ? `Devis ${quote.reference} · ` : ""}
            {project.label}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">
              Pourquoi ne signe-t-il pas ?
            </span>
            <div className="grid gap-1.5 sm:grid-cols-3">
              {RELANCE_TEMPLATES.map((template) => (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => pick(template.key)}
                  className={cn(
                    "rounded-md border px-2.5 py-2 text-left transition-colors",
                    motive === template.key
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50 border-border",
                  )}
                >
                  <div className="text-xs font-medium">{template.label}</div>
                  <div className="text-muted-foreground mt-0.5 text-[0.7rem] leading-tight">
                    {template.hint}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <TextField
            label="Objet"
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value);
              setTouched(true);
            }}
          />

          <TextAreaField
            label="Message"
            className="min-h-64 font-normal"
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              setTouched(true);
            }}
            hint={`Variables : ${RELANCE_VARIABLES.map((v) => `{{${v.name}}}`).join(" · ")}`}
          />

          <div className="text-muted-foreground flex items-start gap-2 rounded-md bg-info-soft px-3 py-2 text-xs">
            <InfoIcon className="text-info mt-0.5 size-3.5 shrink-0" />
            <span>
              Le CRM n&apos;envoie pas encore lui-même : ouvrez le message dans votre
              messagerie, déjà rempli, ou copiez-le. « Enregistrer » garde le motif, l&apos;objet
              et le texte dans les échanges — c&apos;est ce qui remet le compteur
              d&apos;attente à zéro.
            </span>
          </div>

          {send.error && <ErrorNotice message={send.error} />}
        </div>

        <DialogFooter className="sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href={mailto} data-demo="relance-mailto">
                <MailIcon />
                Ouvrir dans la messagerie
              </a>
            </Button>
            <Button variant="outline" disabled={!body.trim()} onClick={copier}>
              {copie ? <CheckIcon /> : <CopyIcon />}
              {copie ? "Copié" : "Copier"}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => close(false)}>
              Annuler
            </Button>
            <Button
              disabled={send.pending || !body.trim()}
              onClick={async () => {
                if (!(await send.run())) return;
                onOpenChange(false);
                onSaved();
              }}
            >
              <SendIcon />
              Enregistrer la relance
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
