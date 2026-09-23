"use client";

import { useCallback, useEffect, useState } from "react";
import { PlugZapIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { askConfirm } from "@/shared/ui/confirm";
import { notifySuccess } from "@/shared/ui/toaster";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { errorMessage } from "@/shared/api/errors";
import { formatDate, formatDateTime } from "@/shared/lib/format";
import * as api from "../lib/oauth-api";

/**
 * Les assistants branchés en OAuth, et le bouton pour les couper.
 *
 * C'est ce que l'adresse à secret ne savait pas offrir : elle ne disait ni qui
 * s'en servait, ni depuis quand, et la révoquer coupait **tout le monde à la
 * fois** puisque rien ne distinguait deux usages du même secret. Une concession
 * porte un nom, une date et un droit ; la couper ne touche qu'elle.
 *
 * La révocation est immédiate : le jeton est relu en base à chaque appel, il ne
 * vaut donc plus rien dès le clic suivant de l'assistant.
 */
export function ConnectedAssistants() {
  const [grants, setGrants] = useState<api.OAuthGrant[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .listGrants()
      .then((data) => {
        setGrants(data.items);
        setError(null);
      })
      .catch((cause) => setError(errorMessage(cause)));
  }, []);

  useEffect(load, [load]);

  async function couper(grant: api.OAuthGrant) {
    const ok = await askConfirm({
      title: `Couper ${grant.client_name || "cet assistant"} ?`,
      description:
        "Il perdra l'accès au CRM immédiatement. Pour le rebrancher, il faudra " +
        "refaire l'autorisation depuis l'assistant.",
      confirmLabel: "Couper",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.revokeGrant(grant.id);
      notifySuccess("Assistant débranché.");
      load();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  if (error) return <ErrorNotice message={error} onRetry={load} />;
  if (grants === null) return null;

  if (grants.length === 0) {
    return (
      <EmptyState
        title="Aucun assistant branché"
        description="Ajoutez le CRM comme connecteur depuis Claude : il vous renverra ici pour l'autoriser."
      />
    );
  }

  return (
    <ul className="divide-y rounded-lg border" data-demo="oauth-grants">
      {grants.map((grant) => (
        <li key={grant.id} className="flex items-center gap-3 px-3 py-2.5">
          <PlugZapIcon className="text-muted-foreground size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {grant.client_name || "Assistant"}
            </p>
            <p className="text-muted-foreground text-xs">
              Autorisé le {formatDate(grant.created_at)} ·{" "}
              {grant.last_used_at
                ? `dernier appel le ${formatDateTime(grant.last_used_at)}`
                : "jamais utilisé"}
            </p>
          </div>
          <Badge variant={grant.can_write ? "default" : "secondary"}>
            {grant.can_write ? "Lecture et écriture" : "Lecture"}
          </Badge>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void couper(grant)}
            aria-label={`Couper ${grant.client_name || "cet assistant"}`}
          >
            <Trash2Icon />
          </Button>
        </li>
      ))}
    </ul>
  );
}
