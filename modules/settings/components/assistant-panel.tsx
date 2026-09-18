"use client";

import { useState } from "react";
import {
  ArrowUpRightIcon,
  CheckIcon,
  CopyIcon,
  PencilIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ClaudeMark, OpenAIMark } from "@/shared/ui/brand-marks";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/shared/api/errors";
import { EmptyState, ErrorNotice, Skeleton, Spinner } from "@/shared/ui/feedback";
import { formatDate, formatRelative } from "@/shared/lib/format";
import { createMcpToken, mcpConnectorUrl, revokeMcpToken } from "../lib/api";
import { useMcpTokens } from "../hooks/use-settings";
import { SettingsPage, SettingsRows, SettingsRow, SettingsSection } from "./settings-page";
import { openExternal } from "@/shared/desktop/links";

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
/*
Les pages où l'on colle une adresse de connecteur.

Écrites en clair et non devinées : ce sont deux adresses stables, et les
recalculer depuis le nom de l'assistant n'apporterait rien qu'une occasion de
se tromper.
*/
const CHATGPT_CONNECTEURS = "https://chatgpt.com/#settings/Connectors";
const CLAUDE_CONNECTEURS = "https://claude.ai/settings/connectors";

export function AssistantPanel() {
  const { tokens, loading, error: loadError, reload } = useMcpTokens();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  /** Le consentement à l'écriture, décidé avant de créer l'adresse. */
  const [canWrite, setCanWrite] = useState(false);

  async function create(): Promise<string | null> {
    setPending(true);
    setError(null);
    setCopied(false);
    try {
      const created = await createMcpToken(name.trim() || "Assistant", canWrite);
      const url = mcpConnectorUrl(created.secret);
      setSecret(url);
      setName("");
      reload();
      return url;
    } catch (cause) {
      setError(errorMessage(cause));
      return null;
    } finally {
      setPending(false);
    }
  }

  /**
   * Le geste complet, en un clic : créer l'adresse, la copier, ouvrir la page
   * des connecteurs de l'assistant.
   *
   * Aucun site ne peut installer un connecteur à la place de l'utilisateur —
   * ce serait une faille, pas un confort. Ce qui reste à faire à la main est
   * donc un collage, et tout le reste est fait ici. Une adresse déjà créée
   * n'est pas recréée : on rebranche celle qu'on a sous les yeux.
   */
  async function brancher(url: string) {
    const adresse = secret ?? (await create());
    if (!adresse) return;
    await copy(adresse);
    // Dans le navigateur du système : la webview n'ouvre pas de nouvel onglet.
    await openExternal(url);
  }

  async function revoke(id: string) {
    setError(null);
    try {
      await revokeMcpToken(id);
      reload();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  /**
   * L'ouverture a lieu même si la copie échoue — un navigateur peut refuser
   * l'accès au presse-papiers : mieux vaut arriver sur la bonne page avec
   * l'adresse à sélectionner à la main que de rester ici.
   */
  async function copy(value?: string) {
    const adresse = value ?? secret;
    if (!adresse) return;
    try {
      await navigator.clipboard.writeText(adresse);
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
      {(error || loadError) && <ErrorNotice message={error ?? loadError ?? ""} />}

      <SettingsSection
        title="Ce que l'assistant peut faire"
        description="Il agit en votre nom, avec vos permissions — jamais davantage."
      >
        <SettingsRows>
          <SettingsRow label="Chercher" hint="Lecture">
            Une question, cinq sources : fiches, affaires, devis, tâches, courriels
          </SettingsRow>
          <SettingsRow label="Fiches et affaires" hint="Lecture">
            Ouvrir une fiche complète, ses devis, ses échanges ; lister ce qu&apos;il
            faut relancer
          </SettingsRow>
          <SettingsRow label="Agenda et tâches" hint="Lecture">
            Ce qui est prévu, ce qui est dû, ce qui est en retard
          </SettingsRow>
          <SettingsRow label="Créer et consigner" hint="Écriture">
            Une fiche, une tâche, un rendez-vous, un échange, une relance
          </SettingsRow>
          <SettingsRow label="Faire avancer" hint="Écriture">
            L&apos;étape d&apos;une affaire, le statut d&apos;une tâche
          </SettingsRow>
        </SettingsRows>

        {/* Le pont des permissions, dit à l'écran parce que c'est exactement la
            question qu'on se pose en branchant un modèle sur son CRM. */}
        <div className="bg-muted/40 flex flex-col gap-1.5 rounded-lg border p-3 text-xs leading-relaxed">
          <p className="font-medium">Les permissions passent le pont</p>
          <p className="text-muted-foreground">
            L&apos;assistant n&apos;a pas d&apos;identité propre : il emprunte la
            vôtre. Un chargé d&apos;affaires branché sur ChatGPT n&apos;obtient
            pas ce que l&apos;interface lui refuse, et un dirigeant y retrouve
            tout ce qu&apos;il a. Les droits sont <strong>relus à chaque
            question</strong>, jamais gravés dans l&apos;adresse : une permission
            retirée l&apos;est aussi dans ChatGPT, immédiatement — alors que
            l&apos;adresse, elle, vit trois mois.
          </p>
        </div>

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
              <Button type="button" variant="outline" onClick={() => copy()}>
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "Copié" : "Copier"}
              </Button>
            </div>
            {/* Les deux boutons copient **puis** ouvrent la page des
                connecteurs de l'assistant. Ni ChatGPT ni Claude n'acceptent
                qu'un site leur pré-remplisse un connecteur — ce serait une
                faille, pas un confort — donc le geste restant est un collage,
                et on le rend aussi court que possible : l'adresse est déjà dans
                le presse-papiers quand la page s'ouvre. */}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => brancher(CHATGPT_CONNECTEURS)}
                className="bg-[#10a37f] text-white hover:bg-[#0e8f6f]"
              >
                <OpenAIMark className="size-4" />
                {copied ? "Adresse copiée — coller dans ChatGPT" : "Ajouter à ChatGPT"}
                <ArrowUpRightIcon className="size-3.5 opacity-70" />
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => brancher(CLAUDE_CONNECTEURS)}
              >
                <ClaudeMark className="size-4 text-[#d97757]" />
                Ajouter à Claude
                <ArrowUpRightIcon className="size-3.5 opacity-70" />
              </Button>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Dans ChatGPT : <strong>Réglages → Applications et connecteurs →
              Avancé → mode développeur</strong>, puis « Créer » et coller
              l&apos;adresse. Elle ne sera plus affichée ici : le CRM n&apos;en
              garde que l&apos;empreinte, comme d&apos;un mot de passe.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="flex flex-wrap gap-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="ChatGPT — poste de Grygoriy"
              className="min-w-48 flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => create()}
              disabled={pending}
              title="Pour un autre assistant : Cursor, Zed, un client MCP quelconque"
            >
              {pending ? <Spinner /> : <PlusIcon />}
              Créer une adresse
            </Button>
          </div>

          {/* L'action principale, avant même qu'une adresse existe : c'est
              « brancher ChatGPT » qu'on vient faire ici, pas « créer un jeton ».
              Le bouton fait tout ce qui peut l'être — créer, copier, ouvrir la
              bonne page — et laisse le collage, seul geste qu'un site ne peut
              pas faire à la place de l'utilisateur. */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => brancher(CHATGPT_CONNECTEURS)}
              disabled={pending}
              className="bg-[#10a37f] text-white hover:bg-[#0e8f6f]"
            >
              {pending ? <Spinner /> : <OpenAIMark className="size-4" />}
              Ajouter à ChatGPT
              <ArrowUpRightIcon className="size-3.5 opacity-70" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => brancher(CLAUDE_CONNECTEURS)}
              disabled={pending}
            >
              <ClaudeMark className="size-4 text-[#d97757]" />
              Ajouter à Claude
              <ArrowUpRightIcon className="size-3.5 opacity-70" />
            </Button>
          </div>

          {/* Le consentement se donne **avant** la création et ne se reprend
              pas : une adresse déjà installée dans ChatGPT ne doit pas changer
              de nature en cours de route. Pour passer de la lecture à
              l'écriture, on en crée une autre et on révoque la première. */}
          <label className="flex cursor-pointer items-start gap-2.5">
            <Switch
              id="mcp-write"
              checked={canWrite}
              onCheckedChange={setCanWrite}
              className="mt-0.5"
            />
            <span className="min-w-0">
              <Label htmlFor="mcp-write" className="cursor-pointer text-xs font-medium">
                Autoriser l&apos;écriture
              </Label>
              <span
                className={cn(
                  "block text-[11px] leading-relaxed",
                  canWrite ? "text-warning" : "text-muted-foreground",
                )}
              >
                {canWrite
                  ? "L'assistant pourra créer des fiches, des tâches, des rendez-vous et faire avancer des affaires — dans la limite de vos permissions."
                  : "L'assistant lira seulement. Il proposera ce qu'il ferait, vous le ferez dans le CRM."}
              </span>
            </span>
          </label>
        </div>

        {loading ? (
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
              <SettingsRow key={token.id} label={token.name || "Assistant"}>
                <span className="flex flex-wrap items-center justify-end gap-2">
                  {/* Lecture ou écriture : c'est la première chose qu'on veut
                      savoir en relisant la liste six semaines plus tard. */}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                      token.can_write
                        ? "bg-warning-soft text-warning"
                        : "bg-neutral-soft text-neutral",
                    )}
                  >
                    {token.can_write ? <PencilIcon className="size-3" /> : null}
                    {token.can_write ? "Écriture" : "Lecture seule"}
                  </span>
                  <span className="text-xs">
                    {token.expired ? (
                      <span className="text-danger">Expirée</span>
                    ) : (
                      <>
                        jusqu&apos;au {formatDate(token.expires_at)} · dernier usage{" "}
                        {token.last_used_at
                          ? formatRelative(token.last_used_at)
                          : "jamais"}
                      </>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => revoke(token.id)}
                    title="Révoquer ce connecteur"
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                </span>
              </SettingsRow>
            ))}
          </SettingsRows>
        )}
      </SettingsSection>
    </SettingsPage>
  );
}
