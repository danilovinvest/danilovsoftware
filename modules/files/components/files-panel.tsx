"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  CloudIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/shared/api/errors";
import { formatAgo, formatDateTime } from "@/shared/lib/format";
import { ErrorNotice, Skeleton, Spinner } from "@/shared/ui/feedback";
import { Switch } from "@/components/ui/switch";
import { SettingsPage, SettingsRow, SettingsRows, SettingsSection } from "@/modules/settings";
import { useDrive, useDriveRuns } from "../hooks/use-drive";
import * as api from "../lib/api";

/**
 * Réglages → Fichiers : le raccordement OneDrive.
 *
 * Même forme que l'agenda Google, pour la même raison — c'est le même geste :
 * un consentement OAuth sur un compte que toute l'entreprise partage.
 *
 * L'écran dit ce que le CRM prend et ce qu'il ne prend pas, parce que la portée
 * demandée est un engagement : `Files.ReadWrite.All` depuis le 15/09, pour
 * **ajouter** seulement — créer des dossiers, déposer les preuves — jamais
 * modifier ni supprimer, et aucun fichier ne descend dans la base.
 */
export function FilesPanel() {
  const params = useSearchParams();
  const { accounts, configured, loading, error, reload } = useDrive();
  const { runs, syncing, reload: reloadRuns } = useDriveRuns();
  // Figée au montage : « il y a 3 min » n'a pas à se repeindre seul ici, le
  // panneau se recharge après chaque action.
  const [now] = useState(() => Date.now());
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Le retour de Microsoft passe par l'URL : la route de rappel redirige ici
  // avec son résultat, succès comme échec.
  const returned = params.get("erreur");

  async function guard(action: () => Promise<unknown>) {
    setPending(true);
    setActionError(null);
    try {
      await action();
      reload();
      reloadRuns();
    } catch (cause) {
      setActionError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsPage
      title="Fichiers"
      description="Lire les dossiers OneDrive de l'entreprise, sans jamais y écrire."
    >
      {(error || actionError || returned) && (
        <ErrorNotice message={returned ?? actionError ?? error ?? ""} />
      )}

      <SettingsSection
        title="Ce que le CRM prend, et ce qu'il ne prend pas"
        description="La portée demandée est un engagement, pas un détail technique."
      >
        <SettingsRows>
          <SettingsRow label="Écriture limitée à l'ajout">
            <span className="inline-flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheckIcon className="text-success size-3.5" />
                <code className="font-mono text-xs">Files.ReadWrite.All</code> — le CRM crée
                des dossiers et dépose les preuves, jamais il ne modifie ni ne supprime
              </span>
              <span className="text-muted-foreground text-xs">
                Raccordé avant le 15/09 ? Débranchez puis raccordez à nouveau : l&apos;ancien
                jeton ne permet que la lecture.
              </span>
            </span>
          </SettingsRow>
          <SettingsRow label="Ce qui entre en base">
            Le chemin, le nom, la taille et la date d&apos;un fichier
          </SettingsRow>
          <SettingsRow label="Ce qui n&apos;y entre jamais">
            Le contenu des fichiers : il reste chez Microsoft, et l&apos;ouverture se
            fait par un lien
          </SettingsRow>
          <SettingsRow label="Écriture">
            Aucune : ni dépôt, ni renommage, ni suppression
          </SettingsRow>
        </SettingsRows>
      </SettingsSection>

      <SettingsSection
        title="Compte raccordé"
        description="Un seul suffit : celui que toute l'entreprise partage."
      >
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : !configured ? (
          <div className="border-warning/30 bg-warning-soft/50 text-warning rounded-xl border px-3 py-2.5 text-xs">
            <p className="font-medium">L&apos;application Entra n&apos;est pas déclarée.</p>
            <p className="mt-1">
              Renseignez <code className="font-mono">CRM_MS_CLIENT_ID</code> et{" "}
              <code className="font-mono">CRM_MS_CLIENT_SECRET</code> sur le serveur, puis
              redémarrez l&apos;API. La marche à suivre est dans la page Développeur.
            </p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border p-4">
            <p className="text-muted-foreground text-sm">
              Aucun compte raccordé. Microsoft demandera de choisir un compte, puis
              d&apos;accorder la lecture des fichiers.
            </p>
            <Button
              disabled={pending}
              onClick={() =>
                guard(async () => {
                  const { url } = await api.authorizeUrl();
                  window.location.href = url;
                })
              }
            >
              <CloudIcon />
              Raccorder OneDrive
            </Button>
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border p-4"
            >
              <span className="bg-muted grid size-9 shrink-0 place-items-center rounded-full">
                <CloudIcon className="size-4" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {account.display_name || account.email}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {account.email} · raccordé le {formatDateTime(account.connected_at)}
                </p>
                {account.last_error && (
                  <p className="text-danger mt-1 text-xs">{account.last_error}</p>
                )}
              </div>

              {/*
                La copie ne s'allume pas d'office. Elle crée des fiches et fait
                avancer des affaires : c'est une décision, pas un réglage
                d'affichage, et elle se prend en connaissance de cause.
              */}
              <label className="text-muted-foreground flex items-center gap-2 text-xs">
                <Switch
                  checked={account.sync_enabled}
                  disabled={pending}
                  onCheckedChange={(value) =>
                    guard(() => api.setSyncEnabled(account.id, value))
                  }
                />
                <span>
                  Copie automatique
                  {account.sync_enabled && (
                    <span className="text-muted-foreground/70 block">
                      toutes les 5 minutes
                      {account.last_sync_at &&
                        ` · dernière lecture ${formatAgo(account.last_sync_at, now)}`}
                      {account.sync_roots.map((root) => (
                        <span key={root.path} className="block truncate">
                          {root.path}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </label>

              {syncing && (
                <span className="text-info inline-flex items-center gap-1.5 text-xs">
                  <Spinner className="size-3" />
                  copie en cours
                </span>
              )}

              <Button
                variant="outline"
                size="sm"
                className="h-7"
                disabled={pending || syncing}
                onClick={() => guard(api.syncNow)}
              >
                <RefreshCwIcon className="size-3.5" />
                Copier
              </Button>
              <Button variant="outline" size="sm" className="h-7" asChild>
                <a href="/onedrive">
                  <ExternalLinkIcon className="size-3.5" />
                  Parcourir
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={pending}
                title="Retirer ce raccordement"
                onClick={() => guard(() => api.disconnect(account.id))}
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>
          ))
        )}
      </SettingsSection>

      {runs.length > 0 && (
        <SettingsSection
          title="Journal des copies"
          description="Un dossier touché est relu en entier : son contenu dit où en est l'affaire."
        >
          <div className="divide-y rounded-xl border text-xs">
            {runs.map((run) => (
              <div key={run.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {formatDateTime(run.started_at)}
                </span>
                <span className="bg-muted rounded-sm px-1.5 py-0.5 text-[0.65rem]">
                  {run.origin}
                </span>
                <span className="min-w-0 flex-1">
                  {run.finished_at === null ? (
                    <span className="text-info">en cours…</span>
                  ) : run.error ? (
                    <span className="text-danger">{run.error}</span>
                  ) : run.folders === 0 ? (
                    <span className="text-muted-foreground/60">aucun changement</span>
                  ) : (
                    <span className="text-muted-foreground">
                      {run.folders} dossiers ·{" "}
                      <span className="text-success">
                        {run.customers} fiches, {run.projects} affaires, {run.quotes} devis
                      </span>
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </SettingsSection>
      )}
    </SettingsPage>
  );
}
