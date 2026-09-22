"use client";

import { ArrowLeftRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/shared/lib/format";
import { ErrorNotice } from "@/shared/ui/feedback";
import { useAction } from "../hooks/use-customers";
import * as api from "../lib/api";
import type { Customer } from "../lib/types";

/**
 * Client ou prospect, d'un clic et dans les deux sens (issue 113).
 *
 * La qualité de client se déduit des pièces, et un prospect passe client tout
 * seul dès qu'un devis signé ou une facture le prouve. Or la base porte des
 * pièces fausses : une fiche qu'une facture mal rangée disait cliente ne
 * pouvait pas redevenir prospect, la promotion la reclassait au tour suivant.
 *
 * Le bouton pose donc un **choix**, gardé à côté du statut, qui l'emporte sur
 * les pièces partout où la qualité de client se lit. L'écran dit que c'est un
 * choix, qui l'a fait et quand, et offre de rendre la main aux pièces : un
 * choix qui contredit les faits doit pouvoir se relire et se retirer.
 */
export function ClientToggle({
  customer,
  onChanged,
}: {
  customer: Customer;
  onChanged: () => void;
}) {
  const choisir = useAction(
    (client: boolean | null) => api.setCustomerClient(customer.id, client),
    { inline: true },
  );

  // Ce que la fiche est aujourd'hui : le choix s'il existe, sinon les pièces
  // ou le statut saisi — le même « client » que le badge de l'en-tête.
  const client = customer.client_override ?? (customer.is_client || customer.status === "client");

  async function poser(next: boolean | null) {
    if ((await choisir.run(next)) !== null) onChanged();
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1" data-demo="client-toggle">
      <Button
        size="xs"
        variant="outline"
        disabled={choisir.pending}
        title={
          client
            ? "La repasser en prospect, quoi que disent ses pièces — la promotion automatique ne la reclassera plus"
            : "La passer en client, quoi que disent ses pièces"
        }
        onClick={() => void poser(!client)}
      >
        <ArrowLeftRightIcon />
        {client ? "Repasser en prospect" : "Passer en client"}
      </Button>
      {customer.client_override !== null && (
        <span className="text-muted-foreground text-xs" data-demo="client-override">
          {customer.client_override ? "Client" : "Prospect"} choisi à la main
          {customer.client_override_at && ` le ${formatDate(customer.client_override_at)}`}
          {customer.client_override_by_name && ` par ${customer.client_override_by_name}`}
          {" · "}
          <button
            type="button"
            className="hover:text-foreground underline underline-offset-2"
            disabled={choisir.pending}
            onClick={() => void poser(null)}
          >
            laisser les pièces décider
          </button>
        </span>
      )}
      {choisir.error && <ErrorNotice message={choisir.error} />}
    </div>
  );
}
