"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DownloadIcon,
  PlusIcon,
  RefreshCwIcon,
  ScrollTextIcon,
  TriangleAlertIcon,
  Trash2Icon,
  UnplugIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { askConfirm } from "@/shared/ui/confirm";
import {
  CALENDAR_PALETTE,
  GoogleButton,
  GoogleMark,
  SyncBadge,
  mirrorVerdict,
  ImportLogDialog,
  SyncLogDialog,
  authorizeUrl,
  createCalendar,
  deleteCalendar,
  disconnectAccount,
  importFromGoogle,
  setMirrorSelected,
  syncNow,
  updateCalendar,
  useSyncRuns,
  type Calendar,
} from "@/modules/calendar";
import { errorMessage } from "@/shared/api/errors";
import { cn } from "@/lib/utils";
import { formatAgo, formatDate, plural } from "@/shared/lib/format";
import { ErrorNotice, Skeleton, Spinner } from "@/shared/ui/feedback";
import { useGoogleCalendar } from "../hooks/use-settings";
import { SettingsPage, SettingsRow, SettingsRows, SettingsSection } from "./settings-page";
import { openExternal } from "@/shared/desktop/links";

/**
 * Les agendas du CRM, et l'import depuis Google.
 *
 * Le CRM est maître de son agenda : ce qu'on crée ici lui appartient, et rien
 * n'en repart vers Google. Google est une source qu'on interroge quand on le
 * demande — un bouton, pas un fil permanent.
 *
 * Le résultat du parcours d'autorisation revient en paramètre d'URL — Google
 * renvoie un navigateur, pas un appel d'API. On le lit une fois puis on
 * l'efface de la barre d'adresse : un rechargement ne doit pas réafficher un
 * succès vieux d'une heure.
 */
export function AgendaPanel() {
  const { accounts, calendars, mirror, configured, loading, error: loadError, reload } =
    useGoogleCalendar();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [importLogOpen, setImportLogOpen] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const outcome = useAuthorizationOutcome();
  const journal = useSyncRuns(60);

  // Au retour de Google, l'écran est resté ouvert pendant le consentement :
  // il relit ses comptes lui-même au lieu d'attendre une recharge de page.
  useEffect(() => {
    if (outcome.connected) reload();
  }, [outcome.connected, reload]);

  // Une copie du miroir qui s'achève peut avoir rapporté de quoi importer.
  const lastRunId = journal.last?.id ?? null;
  useEffect(() => {
    if (lastRunId !== null) reload();
  }, [lastRunId, reload]);

  function guard<T>(action: () => Promise<T>) {
    return async () => {
      setPending(true);
      setError(null);
      try {
        await action();
        reload();
      } catch (cause) {
        setError(errorMessage(cause));
      } finally {
        setPending(false);
      }
    };
  }

  async function connect() {
    setPending(true);
    setError(null);
    try {
      // Google refuse de s'afficher dans une webview : le consentement se
      // donne dans le navigateur du système, qui rend ensuite la main à
      // l'application (`omptcrm://app/settings/agenda`).
      await openExternal(await authorizeUrl());
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  const runImport = guard(async () => {
    const result = await importFromGoogle();
    /*
      Le compte rendu dit les quatre choses qui peuvent arriver, et seulement
      celles qui sont arrivées. « 756 inchangés » est vrai mais n'apprend rien ;
      « 5 repris de Google » et « 2 conflits » sont ce qu'on ouvre l'écran pour
      savoir.
    */
    const parts: string[] = [];
    if (result.added > 0) parts.push(`${plural(result.added, "événement")} ajouté${result.added > 1 ? "s" : ""}`);
    if (result.updated > 0) parts.push(`${result.updated} repris de Google`);
    if (result.removed > 0) parts.push(`${result.removed} supprimé${result.removed > 1 ? "s" : ""}`);
    if (result.conflicts > 0) {
      parts.push(
        `${result.conflicts} conflit${result.conflicts > 1 ? "s" : ""} — modifié${result.conflicts > 1 ? "s" : ""} dans Google mais corrigé${result.conflicts > 1 ? "s" : ""} ici, donc conservé${result.conflicts > 1 ? "s" : ""}`,
      );
    }
    setReport(
      parts.length === 0
        ? `Rien n'avait changé : les ${result.unchanged} événements du miroir sont déjà à jour dans le CRM.`
        : parts.join(" · ") + ".",
    );
  });

  return (
    <SettingsPage
      title="Agenda"
      description="Les agendas du CRM, et l'import depuis un compte Google."
    >
      {(error || loadError || outcome.error) && (
        <ErrorNotice message={error ?? loadError ?? outcome.error ?? ""} />
      )}

      {outcome.connected && (
        <p className="text-success bg-success-soft/40 rounded-lg px-3 py-2 text-xs">
          {outcome.connected} est raccordé. La copie de ses agendas est en
          cours ; l&apos;import viendra les verser dans le CRM.
        </p>
      )}

      <SettingsSection
        title="Agendas"
        description="Ceux du CRM. Chacun a sa couleur dans le calendrier."
      >
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="divide-y rounded-lg border">
            {calendars.map((calendar) => (
              <CalendarRow
                key={calendar.id}
                calendar={calendar}
                deletable={calendars.length > 1}
                pending={pending}
                onSave={(values) => guard(() => updateCalendar(calendar.id, values))()}
                onDelete={async () => {
                  // La croix se lisait « fermer » : elle effaçait l'agenda et
                  // tous ses événements, sans retour possible.
                  const ok = await askConfirm({
                    title: `Supprimer l'agenda « ${calendar.name} »`,
                    description:
                      calendar.event_count > 0
                        ? `Ses ${calendar.event_count} événement${calendar.event_count > 1 ? "s" : ""} partent avec lui, définitivement.`
                        : "Il ne porte aucun événement.",
                    confirmLabel: "Supprimer l'agenda",
                  });
                  if (ok) await guard(() => deleteCalendar(calendar.id))();
                }}
              />
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Chantiers"
            className="flex-1"
          />
          <Button
            type="button"
            disabled={pending || newName.trim() === ""}
            onClick={guard(async () => {
              await createCalendar(newName.trim(), calendars.length % CALENDAR_PALETTE.length);
              setNewName("");
            })}
          >
            {pending ? <Spinner /> : <PlusIcon />}
            Créer un agenda
          </Button>
        </div>

        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Supprimer un agenda emporte ses événements. Le dernier ne se supprime
          pas : il n&apos;y aurait plus où poser un rendez-vous.
        </p>
      </SettingsSection>

      <SettingsSection
        title="Import depuis Google"
        description="Une source, pas un dépôt : le CRM n'écrit jamais chez Google."
      >
        {!configured && !loading && (
          <p className="text-warning bg-warning-soft/50 rounded-lg px-3 py-2 text-xs">
            Aucune application Google n&apos;est déclarée sur le serveur.
            Renseignez <span className="font-mono">CRM_GOOGLE_CLIENT_ID</span> et
            <span className="font-mono"> CRM_GOOGLE_CLIENT_SECRET</span>.
          </p>
        )}

        {report && (
          <p className="text-success bg-success-soft/40 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-3 py-2 text-xs">
            {report}
            {/* Le compte rendu dit combien ; le journal dit lesquels. */}
            <button
              type="button"
              onClick={() => setImportLogOpen(true)}
              className="text-brand-text underline underline-offset-2"
            >
              Voir le détail
            </button>
          </p>
        )}

        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border px-6 py-10 text-center">
            <span className="bg-muted/50 flex size-11 items-center justify-center rounded-full">
              <GoogleMark className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium">Aucun compte Google</p>
              <p className="text-muted-foreground mt-1 max-w-sm text-xs leading-relaxed">
                Google demandera l&apos;autorisation de <strong>voir</strong> vos
                agendas — la seule portée demandée. Le CRM n&apos;obtiendra
                jamais le droit d&apos;y écrire.
              </p>
            </div>
            <GoogleButton onClick={connect} pending={pending} disabled={!configured} />
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-lg border p-3">
            {accounts.map((account) => (
              <div key={account.id} className="flex flex-wrap items-center gap-3">
                <span className="bg-muted/50 flex size-9 shrink-0 items-center justify-center rounded-full">
                  <GoogleMark className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{account.email}</p>
                  <p className="text-muted-foreground/70 text-[11px]">
                    Raccordé le {formatDate(account.connected_at)} · lecture seule
                  </p>
                </div>

                <SyncBadge
                  {...mirrorVerdict(journal.running, journal.last, journal.now)}
                  onClick={() => setJournalOpen(true)}
                />

                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={guard(syncNow)}
                  disabled={pending || journal.running}
                  title="Rafraîchir la copie de Google avant d'importer"
                >
                  <RefreshCwIcon className="size-3.5" />
                  Rafraîchir
                </Button>

                <Button size="sm" className="h-7" onClick={runImport} disabled={pending}>
                  {pending ? <Spinner /> : <DownloadIcon className="size-3.5" />}
                  Importer
                </Button>

                {/*
                  Deux journaux, et ils ne racontent pas la même chose : celui
                  du badge dit ce que la **copie** de Google a rapporté, celui-ci
                  ce que l'**import** en a fait dans le CRM.
                */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => setImportLogOpen(true)}
                  title="Journal des imports : ce qui a été repris, et ce qui a été laissé"
                >
                  <ScrollTextIcon className="size-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={async () => {
                    const ok = await askConfirm({
                      title: `Débrancher ${account.email || "ce compte Google"}`,
                      description:
                        "Le CRM cesse de copier ses agendas. Les événements déjà importés restent.",
                      confirmLabel: "Débrancher",
                    });
                    if (ok) await guard(() => disconnectAccount(account.id))();
                  }}
                  title="Retirer ce compte du CRM"
                  aria-label="Retirer ce compte du CRM"
                >
                  <UnplugIcon className="size-3.5" />
                </Button>
              </div>
            ))}

            {accounts.some((account) => account.last_error) && (
              <p className="text-danger bg-danger-soft/40 flex items-start gap-1.5 rounded-lg px-3 py-2 text-xs">
                <TriangleAlertIcon className="mt-px size-3.5 shrink-0" />
                <span>{accounts.find((account) => account.last_error)?.last_error}</span>
              </p>
            )}

            {mirror.length > 0 && (
              <div className="flex flex-col gap-1 border-t pt-2">
                <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                  Agendas du compte Google
                </p>
                {mirror.map((source) => (
                  <div key={source.id} className="flex items-center gap-3 py-0.5">
                    <span className="min-w-0 flex-1 truncate text-xs">
                      {source.summary}
                    </span>
                    <span className="text-muted-foreground/70 shrink-0 text-[11px]">
                      {plural(source.event_count, "événement")}
                      {source.synced_at && <> · {formatAgo(source.synced_at, journal.now)}</>}
                    </span>
                    <Switch
                      checked={source.selected}
                      onCheckedChange={(selected) =>
                        guard(() => setMirrorSelected(source.id, source.account_id, selected))()
                      }
                      aria-label={`Copier ${source.summary}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="text-muted-foreground text-[11px] leading-relaxed">
          L&apos;import n&apos;ajoute que ce qu&apos;il ne connaît pas : une
          correction faite dans le CRM n&apos;est jamais écrasée par la version
          restée chez Google. Il se rejoue donc sans faire de doublon.
        </p>
      </SettingsSection>

      <SettingsSection
        title="Ce que le CRM fait, et ce qu'il ne fait pas"
        description="L'agenda est celui du CRM ; Google n'en reçoit rien."
      >
        <SettingsRows>
          <SettingsRow label="Écrit">
            Dans sa propre base : créer, modifier, supprimer, sans limite
          </SettingsRow>
          <SettingsRow label="Lit chez Google">
            Titres, descriptions, lieux, dates, invités — à l&apos;import
          </SettingsRow>
          <SettingsRow label="N'envoie pas">
            Ni invitation aux clients, ni rappel sur les téléphones
          </SettingsRow>
          <SettingsRow label="Ne remonte pas">
            Un événement créé ici reste ici ; Google ne le verra pas
          </SettingsRow>
        </SettingsRows>
      </SettingsSection>

      <SyncLogDialog open={journalOpen} onClose={() => setJournalOpen(false)} />
      <ImportLogDialog open={importLogOpen} onOpenChange={setImportLogOpen} />
    </SettingsPage>
  );
}

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

/**
 * Une ligne d'agenda : nom modifiable, couleur, visibilité, suppression.
 *
 * Le nom est un champ et non un libellé : les agendas importés de Google
 * arrivent avec l'identifiant que Google leur donne — pour l'agenda principal,
 * c'est l'adresse du compte. « omptgroupe@gmail.com » n'est pas un nom
 * d'agenda, et rien ne servirait de l'afficher sans pouvoir le corriger.
 *
 * L'enregistrement se fait à la sortie du champ, et seulement si le nom a
 * changé : taper trois lettres n'a pas à provoquer trois écritures.
 */
function CalendarRow({
  calendar,
  deletable,
  pending,
  onSave,
  onDelete,
}: {
  calendar: Calendar;
  deletable: boolean;
  pending: boolean;
  onSave: (values: { name: string; color: number; visible: boolean }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(calendar.name);

  function commit() {
    const trimmed = name.trim();
    if (trimmed === "" || trimmed === calendar.name) {
      setName(calendar.name);
      return;
    }
    onSave({ name: trimmed, color: calendar.color, visible: calendar.visible });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-2">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") setName(calendar.name);
        }}
        aria-label="Nom de l'agenda"
        className="h-8 min-w-0 flex-1 border-transparent bg-transparent px-2 shadow-none hover:border-input focus-visible:border-input"
      />

      <span className="text-muted-foreground/70 shrink-0 text-xs">
        {plural(calendar.event_count, "événement")}
        {calendar.google_calendar_id && (
          <span className="ml-1.5 inline-flex items-center gap-1">
            <DownloadIcon className="size-3" />
            Google
          </span>
        )}
      </span>

      <span className="flex shrink-0 gap-1">
        {CALENDAR_PALETTE.map((style, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Couleur ${index + 1}`}
            onClick={() =>
              onSave({ name: calendar.name, color: index, visible: calendar.visible })
            }
            className={cn(
              "size-3.5 rounded-full transition-transform",
              style.dot,
              calendar.color === index
                ? "ring-foreground/40 ring-2 ring-offset-1"
                : "opacity-50 hover:opacity-100",
            )}
          />
        ))}
      </span>

      <Switch
        checked={calendar.visible}
        onCheckedChange={(visible) =>
          onSave({ name: calendar.name, color: calendar.color, visible })
        }
        aria-label={`Afficher ${calendar.name}`}
      />

      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        disabled={!deletable || pending}
        onClick={onDelete}
        title={
          deletable
            ? "Supprimer cet agenda et ses événements"
            : "Le dernier agenda ne se supprime pas"
        }
        aria-label={`Supprimer l'agenda ${calendar.name}`}
        data-demo="calendar-delete"
      >
        <Trash2Icon className="size-3.5" />
      </Button>
    </div>
  );
}
