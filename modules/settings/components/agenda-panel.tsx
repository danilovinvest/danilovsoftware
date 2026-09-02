"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckIcon, RefreshCwIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  authorizeUrl,
  disconnectAccount,
  setCalendarSelected,
  syncNow,
} from "@/modules/calendar";
import { errorMessage } from "@/shared/api/errors";
import { formatRelative } from "@/shared/lib/format";
import { EmptyState, ErrorNotice, Skeleton, Spinner } from "@/shared/ui/feedback";
import { useGoogleCalendar } from "../hooks/use-settings";
import { SettingsPage, SettingsRow, SettingsRows, SettingsSection } from "./settings-page";

/**
 * Raccorder l'agenda Google de l'entreprise.
 *
 * Un seul compte, celui que tout le monde partage, raccordé une fois. Le CRM en
 * fait une copie et ne l'écrit jamais : la portée demandée à Google est en
 * lecture seule, si bien qu'aucune erreur d'ici ne peut déplacer un rendez-vous
 * chez un client.
 *
 * Le résultat du parcours d'autorisation revient en paramètre d'URL — Google
 * renvoie un navigateur, pas un appel d'API. On le lit une fois puis on
 * l'efface de la barre d'adresse : un rechargement de page ne doit pas
 * réafficher un succès vieux d'une heure.
 */
export function AgendaPanel() {
  const { accounts, calendars, configured, loading, error: loadError, reload } =
    useGoogleCalendar();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const outcome = useAuthorizationOutcome();

  async function connect() {
    setPending(true);
    setError(null);
    try {
      window.location.href = await authorizeUrl();
    } catch (cause) {
      setError(errorMessage(cause));
      setPending(false);
    }
  }

  async function sync() {
    setPending(true);
    setError(null);
    try {
      await syncNow();
      reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  async function disconnect(id: string) {
    setError(null);
    try {
      await disconnectAccount(id);
      reload();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function toggle(id: string, accountId: string, selected: boolean) {
    setError(null);
    try {
      await setCalendarSelected(id, accountId, selected);
      reload();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <SettingsPage
      title="Agenda"
      description="Recopier l'agenda Google de l'entreprise dans le CRM, en lecture seule."
    >
      {(error || loadError || outcome.error) && (
        <ErrorNotice message={error ?? loadError ?? outcome.error ?? ""} />
      )}

      {outcome.connected && (
        <p className="text-success bg-success-soft/40 rounded-lg px-3 py-2 text-xs">
          {outcome.connected} est raccordé. La première copie est faite ; les
          suivantes se déclenchent toutes les cinq minutes.
        </p>
      )}

      {!configured && !loading && (
        <p className="text-warning bg-warning-soft/50 rounded-lg px-3 py-2 text-xs">
          Aucune application Google n&apos;est déclarée sur le serveur. Renseignez
          <span className="font-mono"> CRM_GOOGLE_CLIENT_ID </span> et
          <span className="font-mono"> CRM_GOOGLE_CLIENT_SECRET </span>
          avant de raccorder un compte.
        </p>
      )}

      <SettingsSection
        title="Compte raccordé"
        description="Un seul compte suffit : c'est celui que tout le monde partage."
      >
        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : accounts.length === 0 ? (
          <div className="rounded-lg border">
            <EmptyState
              title="Aucun compte Google"
              description="Le raccordement ouvre l'écran de consentement de Google. Connectez-vous avec le compte de l'entreprise."
              action={
                <Button size="sm" onClick={connect} disabled={pending || !configured}>
                  {pending ? <Spinner /> : null}
                  Raccorder un compte Google
                </Button>
              }
            />
          </div>
        ) : (
          <SettingsRows>
            {accounts.map((account) => (
              <SettingsRow key={account.id} label={account.email}>
                <span className="flex items-center gap-3">
                  <span className="text-xs">
                    {account.last_error ? (
                      <span className="text-danger inline-flex items-center gap-1">
                        <TriangleAlertIcon className="size-3.5" />
                        {account.last_error}
                      </span>
                    ) : account.last_sync_at ? (
                      <>copie {formatRelative(account.last_sync_at)}</>
                    ) : (
                      "jamais copié"
                    )}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7"
                    onClick={sync}
                    disabled={pending}
                  >
                    {pending ? <Spinner /> : <RefreshCwIcon className="size-3.5" />}
                    Synchroniser
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => disconnect(account.id)}
                    title="Retirer ce compte du CRM"
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                </span>
              </SettingsRow>
            ))}
          </SettingsRows>
        )}

        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Retirer le compte efface la copie locale et le jeton d&apos;accès. Rien
          n&apos;est modifié chez Google : l&apos;agenda reste intact.
        </p>
      </SettingsSection>

      {calendars.length > 0 && (
        <SettingsSection
          title="Agendas recopiés"
          description="Décocher un agenda arrête sa copie et retire ses événements du CRM."
        >
          <SettingsRows>
            {calendars.map((calendar) => (
              <SettingsRow
                key={calendar.id}
                label={calendar.summary || calendar.id}
              >
                <span className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs">
                    {calendar.selected ? (
                      <>
                        {calendar.event_count} événement
                        {calendar.event_count > 1 ? "s" : ""}
                        {calendar.synced_at && (
                          <> · {formatRelative(calendar.synced_at)}</>
                        )}
                      </>
                    ) : (
                      "non recopié"
                    )}
                  </span>
                  <Switch
                    checked={calendar.selected}
                    onCheckedChange={(next) =>
                      toggle(calendar.id, calendar.account_id, next)
                    }
                    aria-label={`Recopier ${calendar.summary}`}
                  />
                </span>
              </SettingsRow>
            ))}
          </SettingsRows>
        </SettingsSection>
      )}

      <SettingsSection
        title="Ce que le CRM lit, et ce qu'il ne fait pas"
        description="La portée demandée à Google est calendar.readonly."
      >
        <SettingsRows>
          <SettingsRow label="Lu">
            Titres, descriptions, lieux, dates, invités et leurs réponses, liens
            de visioconférence
          </SettingsRow>
          <SettingsRow label="Fenêtre">
            Un an en arrière, deux ans en avant
          </SettingsRow>
          <SettingsRow label="Fréquence">
            Toutes les cinq minutes, et seulement ce qui a changé
          </SettingsRow>
          <SettingsRow label="Écriture">
            <span className="inline-flex items-center gap-1">
              <CheckIcon className="text-success size-3.5" />
              Impossible — le jeton ne le permet pas
            </span>
          </SettingsRow>
        </SettingsRows>
      </SettingsSection>
    </SettingsPage>
  );
}

/**
 * Lit le résultat du retour d'autorisation, une seule fois.
 *
 * Les paramètres sont retirés de l'URL aussitôt lus : sans cela, un
 * rechargement ou un partage du lien réafficherait le message. L'effet ne pose
 * pas d'état — il ne fait que réécrire l'historique — d'où la lecture directe
 * des paramètres au rendu.
 */
function useAuthorizationOutcome() {
  const params = useSearchParams();
  const connected = params.get("connecte");
  const error = params.get("erreur");

  useEffect(() => {
    if (!connected && !error) return;
    window.history.replaceState(null, "", window.location.pathname);
  }, [connected, error]);

  return { connected, error };
}
