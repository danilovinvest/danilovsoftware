"use client";

import { useState } from "react";
import { usePermission } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorNotice } from "@/shared/ui/feedback";
import { TextField } from "@/shared/ui/form";
import { useDirtyGuard } from "@/shared/lib/dirty-guard";
import { euros, formatDate, todayLocal } from "@/shared/lib/format";
import * as api from "../lib/api";
import { paymentCarrier, type SettlementQuote } from "../lib/settlement";
import { useAction } from "../hooks/use-customers";
import type { Project } from "../lib/types";

/**
 * Terminer un chantier, et le solder.
 *
 * Le CRM savait dire qu'un chantier avait commencé, jamais qu'il était fini :
 * la frise des travaux allait « date réservée » puis « matériaux » puis
 * directement « solde ». Mesuré le 23/09 : zéro affaire sur 535 portait une
 * date de fin, pour 115 déclarées réalisées.
 *
 * **Trois faits, un seul geste.** On réceptionne le chantier, on fait signer le
 * procès-verbal, on encaisse le solde — le même jour, devant le client. Les
 * demander en trois écrans, c'est n'en obtenir qu'un. Le serveur les écrit en
 * une transaction : une coupure ne laisse jamais un chantier terminé dont le
 * solde n'est pas passé.
 *
 * **Le jour est demandé, jamais celui du clic.** On réceptionne le mardi et on
 * saisit le vendredi. C'est la règle de toutes les saisies de règlement du CRM,
 * et la seule qui permette de lire la durée d'un chantier.
 *
 * **Ce qui est déjà su n'est pas redemandé** : un PV déjà daté s'affiche au
 * lieu de proposer une case vide qui l'écraserait. Le PV s'ajoute, il n'efface
 * rien — pour le retirer, c'est l'onglet « Après-signature », qui montre tout.
 */

/**
 * Ce que la boîte a besoin de savoir d'un devis pour proposer le solde, et
 * rien de plus : la fiche client et la fiche latérale d'un chantier ne servent
 * pas exactement les mêmes champs, et exiger ici ce qu'on ne lit pas
 * interdirait l'un des deux écrans sans rien y gagner.
 */
export type ClosureQuote = SettlementQuote & {
  id: string;
  reference: string;
  amount_ttc: string | null;
  deposit_amount: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  project: Pick<Project, "id" | "label" | "started_at" | "finished_at">;
  quotes: ClosureQuote[];
  /** Le PV déjà connu, pour ne pas le redemander. */
  pvSentAt?: string | null;
  pvSignedAt?: string | null;
  /** Le métier nomme le geste : on ne « termine » pas une étude comme un mur. */
  metier?: "travaux" | "etudes";
  onDone: (project: Project) => void;
};

/** Un jour `AAAA-MM-JJ` à midi local, la convention des jalons du module. */
function midi(jour: string): string {
  return new Date(`${jour}T12:00:00`).toISOString();
}

/** Ce qui reste à encaisser : le TTC moins l'acompte déjà reçu. */
function resteAPayer(quote: ClosureQuote | null): string {
  if (!quote?.amount_ttc) return "";
  const ttc = Number(quote.amount_ttc);
  const acompte = quote.deposit_status === "recu" ? Number(quote.deposit_amount ?? 0) : 0;
  if (!Number.isFinite(ttc) || !Number.isFinite(acompte)) return "";
  const reste = ttc - acompte;
  return reste > 0 ? reste.toFixed(2) : "";
}

export function ProjectClosureDialog({
  open,
  onClose,
  project,
  quotes,
  pvSentAt = null,
  pvSignedAt = null,
  metier = "travaux",
  onDone,
}: Props) {
  const clos = Boolean(project.finished_at);
  const porteur = paymentCarrier(quotes);
  const dejaSolde = porteur?.balance_status === "recu";
  // Terminer un chantier et encaisser sont deux droits distincts : le serveur
  // refuse le solde sans `quotes:write`, et l'écran ne propose donc pas un
  // champ dont l'envoi serait rejeté. Relevé par la relecture du 23/09.
  const peutSolder = usePermission("quotes:write");

  const [fin, setFin] = useState(project.finished_at ?? todayLocal());
  const [pvEnvoye, setPVEnvoye] = useState<string | null>(null);
  const [pvSigne, setPVSigne] = useState<string | null>(null);
  const [solde, setSolde] = useState<string | null>(null);
  const [montant, setMontant] = useState(() => resteAPayer(porteur));

  const modifie = fin !== (project.finished_at ?? todayLocal()) || !!pvEnvoye || !!pvSigne || !!solde;
  // Le garde rend le gestionnaire d'ouverture : fermer une boîte modifiée
  // demande confirmation, comme partout ailleurs dans le CRM.
  const close = useDirtyGuard(open && !clos && modifie, (next) => {
    if (!next) onClose();
  });

  const nomDuGeste = metier === "etudes" ? "Clôturer l'étude" : "Terminer le chantier";

  const terminer = useAction(
    () =>
      api.closeProject(project.id, {
        closed: true,
        finished_at: fin,
        // Midi **local** converti, comme la frise, les jalons et les preuves :
        // midi UTC en dur donnait la même journée en France mais divergeait de
        // la convention du module, et se serait vu ailleurs.
        pv_sent_at: pvEnvoye ? midi(pvEnvoye) : null,
        pv_signed_at: pvSigne ? midi(pvSigne) : null,
        balance:
          peutSolder && solde && porteur
            ? { quote_id: porteur.id, amount: montant || null, paid_at: solde }
            : null,
      }),
    { inline: true, success: metier === "etudes" ? "Étude clôturée." : "Chantier terminé." },
  );

  const rouvrir = useAction(() => api.closeProject(project.id, { closed: false }), {
    inline: true,
    success: "Chantier rouvert.",
  });


  async function valider() {
    const action = clos ? rouvrir : terminer;
    const updated = await action.run();
    if (!updated) return;
    onDone(updated);
    onClose();
  }

  const erreur = clos ? rouvrir.error : terminer.error;
  const champs = clos ? rouvrir.fields : terminer.fields;
  const occupe = terminer.pending || rouvrir.pending;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md" data-demo="project-closure">
        <DialogHeader>
          <DialogTitle>{clos ? "Rouvrir le chantier" : nomDuGeste}</DialogTitle>
          <DialogDescription>
            {clos ? (
              <>
                Terminé le {formatDate(project.finished_at)}. Rouvrir retire cette date et rend
                l&apos;affaire à « gagné ». Le procès-verbal et le solde restent : ils ont eu lieu.
              </>
            ) : (
              <>
                {project.label} · l&apos;affaire passera « réalisée » et quittera la liste des
                chantiers.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {!clos && (
          <div className="space-y-4">
            <TextField
              label={metier === "etudes" ? "Mission rendue le" : "Travaux terminés le"}
              type="date"
              value={fin}
              min={project.started_at ?? undefined}
              onChange={(event) => setFin(event.target.value)}
              error={champs.finished_at}
              hint={
                project.started_at
                  ? `Chantier démarré le ${formatDate(project.started_at)}.`
                  : "Le jour réel de la fin, pas celui de la saisie."
              }
            />

            {metier === "travaux" && (
              <Champ titre="Procès-verbal de réception" note="Facultatif.">
                <Jour
                  label="envoyé"
                  deja={pvSentAt}
                  value={pvEnvoye}
                  onChange={setPVEnvoye}
                  defaut={fin}
                />
                <Jour
                  label="signé"
                  deja={pvSignedAt}
                  value={pvSigne}
                  onChange={setPVSigne}
                  defaut={fin}
                />
              </Champ>
            )}

            <Champ
              titre="Solde"
              note={
                !peutSolder
                  ? "Votre rôle ne permet pas d'écrire sur les devis."
                  : !porteur
                    ? "Aucun devis ne porte le règlement."
                    : dejaSolde
                      ? `Déjà encaissé sur ${porteur.reference}.`
                      : `Ira sur ${porteur.reference}.`
              }
            >
              {peutSolder && porteur && !dejaSolde && (
                <>
                  <Jour label="encaissé" deja={null} value={solde} onChange={setSolde} defaut={fin} />
                  {solde && (
                    <TextField
                      label="Montant encaissé"
                      inputMode="decimal"
                      value={montant}
                      onChange={(event) => setMontant(event.target.value)}
                      hint={
                        porteur.amount_ttc
                          ? `Devis ${euros(Number(porteur.amount_ttc))} TTC.`
                          : "Le devis ne porte pas de montant."
                      }
                    />
                  )}
                </>
              )}
            </Champ>
          </div>
        )}

        {erreur && <ErrorNotice message={erreur} />}

        <DialogFooter>
          <Button variant="outline" onClick={() => void close(false)} disabled={occupe}>
            Annuler
          </Button>
          <Button onClick={() => void valider()} disabled={occupe || (!clos && !fin)}>
            {clos ? "Rouvrir" : "Terminer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Champ({
  titre,
  note,
  children,
}: {
  titre: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">{titre}</p>
        <p className="text-muted-foreground text-xs">{note}</p>
      </div>
      {children}
    </div>
  );
}

/**
 * Une case et son jour.
 *
 * Cocher pose le jour proposé plutôt que d'ouvrir un champ vide : dans la
 * grande majorité des cas c'est celui de la fin des travaux, et le corriger
 * reste à portée. Un fait déjà daté ne se recoche pas — il s'affiche.
 */
function Jour({
  label,
  deja,
  value,
  onChange,
  defaut,
}: {
  label: string;
  deja: string | null;
  value: string | null;
  onChange: (value: string | null) => void;
  defaut: string;
}) {
  if (deja) {
    return (
      <p className="text-muted-foreground text-xs">
        Déjà {label} le {formatDate(deja)}.
      </p>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={`closure-${label}`}
        checked={value !== null}
        onCheckedChange={(next) => onChange(next ? defaut : null)}
      />
      <label htmlFor={`closure-${label}`} className="text-sm">
        {label} le
      </label>
      <input
        type="date"
        className="border-input bg-background h-8 rounded-md border px-2 text-sm disabled:opacity-50"
        value={value ?? ""}
        disabled={value === null}
        onChange={(event) => onChange(event.target.value || defaut)}
        aria-label={`Jour où le document a été ${label}`}
      />
    </div>
  );
}
