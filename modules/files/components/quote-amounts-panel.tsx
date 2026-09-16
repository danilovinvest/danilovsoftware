"use client";

import { useEffect, useState } from "react";
import { FileSearchIcon, RefreshCwIcon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { SettingsRow, SettingsRows, SettingsSection } from "@/modules/settings";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/shared/api/errors";
import { ErrorNotice } from "@/shared/ui/feedback";
import { formatRelative } from "@/shared/lib/format";
import { quoteAmountsProgress, readQuoteAmounts } from "../lib/api";
import type { QuoteAmountsProgress } from "../lib/types";

/**
 * La lecture des montants dans les devis PDF.
 *
 * Mesuré le 16/09 : 531 devis, **136 montants**, et 382 devis dont le PDF est
 * dans OneDrive sans qu'aucun montant soit en base — 5 sur 155 chez STRUCTURE.
 * Le chiffre est écrit dans une pièce que le CRM sait ouvrir, et personne ne le
 * recopiait.
 *
 * L'écran dit ce que la passe a fait, parce qu'une lecture automatique qu'on ne
 * peut pas relire ne se vérifie qu'en rouvrant trois cents PDF : combien de
 * montants viennent d'un humain, combien du document, combien restent, et
 * combien ont échoué — avec la raison du dernier échec.
 *
 * **Un montant saisi par quelqu'un n'est jamais écrasé.** C'est la seule
 * garantie qui compte ici, et elle vit dans la clause `WHERE` de l'écriture,
 * pas dans du code Go.
 */
export function QuoteAmountsPanel() {
  const canRead = usePermission("system:admin");
  const [progress, setProgress] = useState<QuoteAmountsProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    quoteAmountsProgress(controller.signal)
      .then((data) => setProgress(data))
      .catch((cause) => {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      });
    return () => controller.abort();
  }, [version]);

  async function relire() {
    setPending(true);
    setError(null);
    try {
      await readQuoteAmounts(20);
      // La passe est détachée : on relit l'état, elle avancera derrière.
      setTimeout(() => setVersion((value) => value + 1), 4000);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsSection
      title="Montants des devis"
      description="Le montant est écrit dans le PDF du devis. Le CRM le lit, sans jamais écraser un montant saisi à la main."
    >
      {error && <ErrorNotice message={error} />}
      <SettingsRows>
        <SettingsRow label="Montants connus">
          {progress ? (
            <span className="tabular-nums">
              {progress.with_amount} sur {progress.total}
              <span className="text-muted-foreground">
                {" "}
                · {progress.manual} saisis à la main, {progress.from_pdf} lus du PDF
              </span>
            </span>
          ) : (
            "…"
          )}
        </SettingsRow>
        <SettingsRow label="Reste à lire">
          {progress ? (
            <span className="tabular-nums">
              {progress.pending} devis
              {progress.failed > 0 && (
                <span className="text-warning"> · {progress.failed} illisibles</span>
              )}
            </span>
          ) : (
            "…"
          )}
        </SettingsRow>
        <SettingsRow label="Dernière lecture">
          {progress?.last_read_at ? formatRelative(progress.last_read_at) : "jamais"}
        </SettingsRow>
        {progress?.last_error && (
          <SettingsRow label="Dernier échec">
            <span className="text-warning">{progress.last_error}</span>
          </SettingsRow>
        )}
        <SettingsRow label="Rythme">
          Vingt devis à chaque tour de copie, toutes les cinq minutes
        </SettingsRow>
      </SettingsRows>

      {canRead && (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled={pending} onClick={() => void relire()}>
            <FileSearchIcon />
            Lire vingt devis maintenant
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setVersion((value) => value + 1)}
            aria-label="Rafraîchir"
          >
            <RefreshCwIcon />
          </Button>
        </div>
      )}
    </SettingsSection>
  );
}
