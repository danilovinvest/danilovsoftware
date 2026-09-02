"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckIcon, CopyIcon, PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/shared/api/errors";
import { EmptyState, ErrorNotice, Skeleton, Spinner } from "@/shared/ui/feedback";
import { formatDate, formatRelative } from "@/shared/lib/format";
import { createMcpToken, listMcpTokens, mcpConnectorUrl, revokeMcpToken } from "../lib/api";
import type { McpToken } from "../lib/types";
import { SettingsPage, SettingsRows, SettingsRow, SettingsSection } from "./settings-page";

/**
 * Connecter un assistant au CRM.
 *
 * Le CRM parle le Model Context Protocol : un assistant — ChatGPT, Claude,
 * Cursor — s'y branche par une URL et peut alors interroger les fiches, les
 * affaires et les tâches.
 *
 * Le jeton reste attaché au compte qui l'émet : l'assistant hérite exactement
 * de ses permissions. C'est ce qui rend la chose sûre, et c'est pour cela que
 * chacun crée le sien plutôt que d'en partager un.
 */
export function AssistantPanel() {
  const [tokens, setTokens] = useState<McpToken[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reload = useCallback(async () => {
    try {
      setTokens((await listMcpTokens()).items);
    } catch (cause) {
      setError(errorMessage(cause));
      setTokens([]);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function create() {
    setPending(true);
    setError(null);
    setCopied(false);
    try {
      const created = await createMcpToken(name.trim() || "Assistant");
      setSecret(mcpConnectorUrl(created.secret));
      setName("");
      await reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  async function revoke(id: string) {
    setError(null);
    try {
      await revokeMcpToken(id);
      await reload();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function copy() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      setError("Copie impossible : sélectionnez l'adresse et copiez-la à la main.");
    }
  }

  return (
    <SettingsPage
      title="Assistant"
      description="Brancher ChatGPT, Claude ou tout autre assistant sur le CRM."
    >
      {error && <ErrorNotice message={error} />}

      <SettingsSection
        title="Ce que l'assistant peut faire"
        description="Le connecteur est en lecture seule : il ne modifie jamais rien."
      >
        <SettingsRows>
          <SettingsRow label="Fiches client">
            Chercher, ouvrir une fiche complète avec ses affaires, ses devis et ses
            échanges
          </SettingsRow>
          <SettingsRow label="Relances">
            Lister les affaires ouvertes sans contact depuis N jours
          </SettingsRow>
          <SettingsRow label="Tâches">
            Lister les tâches par statut, échéance et assignation
          </SettingsRow>
          <SettingsRow label="Permissions">
            L&apos;assistant hérite des vôtres — ni plus, ni moins
          </SettingsRow>
        </SettingsRows>

        <p className="text-warning bg-warning-soft/50 rounded-lg px-3 py-2 text-xs">
          Ce que l&apos;assistant lit part chez son éditeur. Les fiches contiennent
          des noms, des téléphones et des adresses de vrais clients : ne branchez
          un connecteur que sur un compte et un service dont vous acceptez qu&apos;ils
          voient ces données.
        </p>
      </SettingsSection>

      <SettingsSection
        title="Connecteurs"
        description="Une adresse par assistant. Elle contient un secret : elle vaut mot de passe."
      >
        {secret && (
          <div className="border-success/30 bg-success-soft/40 flex flex-col gap-2 rounded-lg border p-3">
            <p className="text-xs font-medium">Adresse du connecteur</p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={secret}
                onFocus={(event) => event.currentTarget.select()}
                className="font-mono text-xs"
              />
              <Button type="button" variant="outline" onClick={copy}>
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "Copié" : "Copier"}
              </Button>
            </div>
            <p className="text-muted-foreground text-[11px]">
              Dans ChatGPT : Réglages → Apps → activer le mode développeur, puis
              « Ajouter un connecteur personnalisé » et coller cette adresse.
              Elle ne sera plus affichée : seule son empreinte est conservée.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="ChatGPT — poste de Grygoriy"
            className="flex-1"
          />
          <Button type="button" onClick={create} disabled={pending}>
            {pending ? <Spinner /> : <PlusIcon />}
            Créer une adresse
          </Button>
        </div>

        {tokens === null ? (
          <Skeleton className="h-16 w-full" />
        ) : tokens.length === 0 ? (
          <div className="rounded-lg border">
            <EmptyState
              title="Aucun connecteur"
              description="Créez une adresse pour brancher un assistant."
            />
          </div>
        ) : (
          <SettingsRows>
            {tokens.map((token) => (
              <SettingsRow
                key={token.id}
                label={token.name || "Assistant"}
                action={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => revoke(token.id)}
                    title="Révoquer ce connecteur"
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                }
              >
                {token.expired ? (
                  <span className="text-danger">Expirée</span>
                ) : (
                  <>
                    Valide jusqu&apos;au {formatDate(token.expires_at)} · dernier usage{" "}
                    {token.last_used_at ? formatRelative(token.last_used_at) : "jamais"}
                  </>
                )}
              </SettingsRow>
            ))}
          </SettingsRows>
        )}
      </SettingsSection>
    </SettingsPage>
  );
}
