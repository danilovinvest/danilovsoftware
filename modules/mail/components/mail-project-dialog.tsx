"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { CustomerPicker, ProjectPicker } from "@/modules/customers";
import { errorMessage } from "@/shared/api/errors";
import { plural } from "@/shared/lib/format";
import { ErrorNotice } from "@/shared/ui/feedback";
import * as api from "../lib/api";

/**
 * Dire de quelle affaire parlent des courriels, sans les déplacer.
 *
 * Le devis de Balitrand « ref Coppens » reste sur la fiche de Balitrand — c'est
 * à lui qu'on parle — et désigne le chantier de Coppens. Le CRM le lit seul
 * quand le texte le dit (numéro de devis, nom du client, adresse du chantier) ;
 * ici, on tranche à la main, et ce choix n'est plus relu. « Aucune affaire »
 * est un choix aussi : le courriel ne sera plus proposé à un chantier.
 */
export function MailProjectDialog({
  customerId,
  ids,
  onClose,
  onDone,
}: {
  /** La fiche qui porte les courriels. */
  customerId: string;
  ids: string[];
  onClose: () => void;
  onDone: (updated: number) => void;
}) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [wholeThread, setWholeThread] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(target: string | null) {
    setPending(true);
    setError(null);
    try {
      const result = await api.setCustomerMailProject(customerId, ids, target, wholeThread);
      onDone(result.updated);
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-md" data-demo="mail-project-dialog">
        <DialogHeader>
          <DialogTitle>Chantier de {plural(ids.length, "courriel")}</DialogTitle>
          <DialogDescription>
            Les courriels restent sur cette fiche. Ils diront seulement de quelle affaire ils parlent.
          </DialogDescription>
        </DialogHeader>
        <CustomerPicker
          label="Client du chantier"
          value={clientId}
          valueName={clientName}
          onChange={(id, name) => {
            setClientId(id);
            setClientName(name);
            setProjectId(null);
          }}
        />
        <ProjectPicker
          customerId={clientId}
          value={projectId}
          onChange={setProjectId}
          emptyLabel="Choisir l'affaire…"
        />
        <div className="flex items-center gap-2">
          <Checkbox
            id="mail-project-thread"
            checked={wholeThread}
            onCheckedChange={(value) => setWholeThread(value === true)}
          />
          <Label htmlFor="mail-project-thread" className="text-muted-foreground text-xs">
            Toute la conversation, pas seulement les courriels cochés
          </Label>
        </div>
        {error && <ErrorNotice message={error} />}
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" disabled={pending} onClick={() => void submit(null)}>
            Aucune affaire
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" disabled={pending} onClick={onClose}>
              Annuler
            </Button>
            <Button disabled={pending || projectId === null} onClick={() => void submit(projectId)}>
              {pending ? "Enregistrement…" : "Lier à l'affaire"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
