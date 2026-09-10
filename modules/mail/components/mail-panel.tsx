"use client";

import { useState } from "react";
import {
  DownloadIcon,
  MailIcon,
  PlusIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/shared/api/errors";
import { formatAgo, formatDate, formatDateTime, plural } from "@/shared/lib/format";
import { ErrorNotice, Skeleton, Spinner } from "@/shared/ui/feedback";
import { SelectField, TextField } from "@/shared/ui/form";
import { SettingsPage, SettingsRow, SettingsRows, SettingsSection } from "@/modules/settings";
import { useMailbox } from "../hooks/use-mail";
import * as api from "../lib/api";

/**
 * Raccorder la boîte de l'entreprise.
 *
 * L'accès se fait en IMAP avec un **mot de passe d'application**, et non en
 * OAuth : Google classe la lecture du courrier en portée « restreinte », ce qui
 * impose un audit de sécurité annuel par un cabinet agréé pour une application
 * publiée. Le mot de passe d'application se crée en deux minutes et ne coûte
 * rien — mais il ouvre toute la boîte, et l'écran le dit.
 */
export function MailPanel() {
  const { accounts, runs, unknown, running, now, loading, error: loadError, reload } =
    useMailbox();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  /**
   * Le formulaire est déplié d'office tant qu'aucune boîte n'est raccordée —
   * il n'y a rien d'autre à faire sur cet écran — et à la demande ensuite : une
   * seconde boîte s'ajoute une fois, pas tous les jours, et le formulaire posé
   * en permanence sous la liste laisserait croire qu'il reste quelque chose à
   * remplir.
   */
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", host: "imap.gmail.com", port: 993, months: 18,
  });

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

  const connect = guard(async () => {
    await api.connectMailbox(form);
    setForm({ ...form, email: "", password: "" });
    setAdding(false);
  });

  return (
    <SettingsPage
      title="Messagerie"
      description="Rapprocher les courriels de la boîte de l'entreprise avec les fiches client."
    >
      {(error || loadError) && <ErrorNotice message={error ?? loadError ?? ""} />}

      <SettingsSection
        title="Ce qui entre dans le CRM, et ce qui n'y entre pas"
        description="Une boîte partagée contient aussi la banque, les candidatures et la vie privée."
      >
        <SettingsRows>
          <SettingsRow label="De tous les messages">
            Expéditeur, destinataires, objet, date — de quoi rapprocher et compter
          </SettingsRow>
          <SettingsRow label="Des seuls fils rapprochés">
            Le corps et les pièces jointes, quand une adresse déjà connue du CRM
            y figure
          </SettingsRow>
          <SettingsRow label="À l&apos;ouverture d&apos;un message">
            Son contenu est récupéré du serveur et conservé — sur les neuf mille
            messages de la boîte, seuls ceux que vous lisez entrent en base
          </SettingsRow>
          <SettingsRow label="Écriture">
            Aucune : le CRM lit la boîte, il n&apos;envoie rien
          </SettingsRow>
        </SettingsRows>
      </SettingsSection>

      <SettingsSection
        title="Boîtes raccordées"
        description="Celles que l'entreprise partage. Une par adresse, autant qu'il en faut."
      >
        {loading && <Skeleton className="h-24 w-full" />}

        {!loading && accounts.length > 0 && (
          <div className="flex flex-col gap-3 rounded-lg border p-3">
            {accounts.map((account) => (
              <div key={account.id} className="flex flex-wrap items-center gap-3">
                <span className="bg-muted/50 flex size-9 shrink-0 items-center justify-center rounded-full">
                  <MailIcon className="size-4 opacity-70" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{account.email}</p>
                  <p className="text-muted-foreground/70 text-[11px]">
                    {account.host} · depuis le {formatDate(account.since)} ·{" "}
                    {plural(account.message_count, "message")}, dont{" "}
                    <strong>{account.matched_count}</strong> rapproché
                    {account.matched_count > 1 ? "s" : ""}
                  </p>
                </div>

                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                    running
                      ? "border-info/30 bg-info-soft/50 text-info"
                      : account.last_error
                        ? "border-danger/30 bg-danger-soft/50 text-danger"
                        : "border-success/30 bg-success-soft/50 text-success",
                  )}
                >
                  {running && <Spinner className="size-3" />}
                  {running
                    ? "Copie en cours…"
                    : account.last_sync_at
                      ? `Copié ${formatAgo(account.last_sync_at, now)}`
                      : "Jamais copié"}
                </span>

                {/*
                  La copie intégrale est une décision sur ce que la base
                  contiendra, pas une préférence d'affichage. D'où l'étiquette
                  qui dit ce qu'elle change, et le défaut à « non ».
                */}
                {/*
                  L'interrupteur seul ne suffisait pas, et c'était le défaut :
                  la reprise IMAP est incrémentale, donc l'activer n'agissait
                  que sur le courrier à venir. La copie rattrape désormais les
                  messages déjà en base, deux mille par exécution — d'où le
                  compteur, sans lequel on ne verrait rien avancer.
                */}
                <label className="text-muted-foreground flex items-center gap-2 text-xs">
                  <Switch
                    checked={account.copy_all}
                    disabled={pending || running}
                    onCheckedChange={(value) =>
                      guard(() => api.setCopyAll(account.id, value))()
                    }
                  />
                  <span>
                    Copier tous les corps
                    {account.copy_all && (
                      <span className="text-muted-foreground/70 block">
                        {account.body_count.toLocaleString("fr-FR")} sur{" "}
                        {account.message_count.toLocaleString("fr-FR")}
                        {account.body_count < account.message_count &&
                          " · relancez la copie pour continuer"}
                      </span>
                    )}
                  </span>
                </label>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={guard(api.syncNow)}
                  disabled={pending || running}
                >
                  <RefreshCwIcon className="size-3.5" />
                  Copier
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={guard(() => api.disconnectMailbox(account.id))}
                  title="Retirer cette boîte et tout ce qui en a été copié"
                >
                  <XIcon className="size-3.5" />
                </Button>
              </div>
            ))}

            {accounts.some((a) => a.last_error) && (
              <p className="text-danger bg-danger-soft/40 flex items-start gap-1.5 rounded-lg px-3 py-2 text-xs">
                <TriangleAlertIcon className="mt-px size-3.5 shrink-0" />
                <span>{accounts.find((a) => a.last_error)?.last_error}</span>
              </p>
            )}

            {!adding && (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => setAdding(true)}
              >
                <PlusIcon className="size-3.5" />
                Ajouter une boîte
              </Button>
            )}
          </div>
        )}
        {!loading && (accounts.length === 0 || adding) && (
          <div className="flex flex-col gap-3 rounded-lg border p-4">
            <p className="text-warning bg-warning-soft/50 rounded-lg px-3 py-2 text-xs leading-relaxed">
              Gmail veut un <strong>mot de passe d&apos;application</strong>, pas
              celui du compte. Compte Google → Sécurité → Validation en deux
              étapes (à activer si ce n&apos;est pas fait) → Mots de passe des
              applications. Il ouvre toute la boîte : il est chiffré dans la base
              et ne quitte jamais le serveur.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Adresse"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="omptgroupe@gmail.com"
              />
              <TextField
                label="Mot de passe d'application"
                required
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="abcd efgh ijkl mnop"
                className="font-mono"
              />
              <TextField
                label="Serveur IMAP"
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
              />
              <SelectField
                label="Historique à rapatrier"
                value={String(form.months)}
                onValueChange={(value) => setForm({ ...form, months: Number(value) })}
                options={[
                  { value: "6", label: "6 mois" },
                  { value: "12", label: "1 an" },
                  { value: "18", label: "18 mois" },
                  { value: "36", label: "3 ans" },
                ]}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={connect}
                disabled={pending || !form.email.trim() || !form.password.trim()}
              >
                {pending ? <Spinner /> : <MailIcon className="size-4" />}
                Raccorder la boîte
              </Button>
              {accounts.length > 0 && (
                <Button variant="ghost" onClick={() => setAdding(false)} disabled={pending}>
                  Annuler
                </Button>
              )}
            </div>
          </div>
        )}

      </SettingsSection>

      {unknown.length > 0 && (
        <SettingsSection
          title="Ils écrivent, ils n'ont pas de fiche"
          description="Découverts par les seuls en-têtes : leur courrier n'est pas dans le CRM."
        >
          <div className="divide-y rounded-lg border">
            {unknown.slice(0, 20).map((sender) => (
              <div key={sender.email} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]">
                    {sender.name || sender.email}
                  </span>
                  <span className="text-muted-foreground/70 block truncate font-mono text-[11px]">
                    {sender.email}
                  </span>
                </span>
                <span className="text-muted-foreground/70 shrink-0 text-[11px]">
                  {plural(sender.total, "message")} · du {formatDate(sender.first_seen)} au{" "}
                  {formatDate(sender.last_seen)}
                </span>
                <Button asChild variant="outline" size="sm" className="h-7 shrink-0">
                  <Link href={`/customers/nouveau?email=${encodeURIComponent(sender.email)}`}>
                    <UserPlusIcon className="size-3.5" />
                    Créer la fiche
                  </Link>
                </Button>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Créer la fiche avec cette adresse suffit : la copie suivante
            rapprochera d&apos;elle-même les messages passés et à venir.
          </p>
        </SettingsSection>
      )}

      {runs.length > 0 && (
        <SettingsSection title="Journal des copies" description="Sept jours d'exécutions.">
          <div className="divide-y rounded-lg border">
            {runs.slice(0, 12).map((run) => (
              <div key={run.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-xs">
                <span className="w-32 shrink-0 font-mono text-[11px] tabular-nums">
                  {formatDateTime(run.started_at)}
                </span>
                <span className="bg-muted text-muted-foreground w-24 shrink-0 rounded-full px-2 py-0.5 text-center text-[10px]">
                  {run.origin}
                </span>
                <span className="min-w-0 flex-1">
                  {run.finished_at === null ? (
                    <span className="text-info">en cours…</span>
                  ) : run.error ? (
                    <span className="text-danger">{run.error}</span>
                  ) : (
                    <span className="text-muted-foreground">
                      {run.fetched} lus · <span className="text-success">{run.matched} rapprochés</span>
                      {run.linked > 0 && (
                        <>
                          {" · "}
                          <span className="text-success">{run.linked} par le fil</span>
                        </>
                      )}
                      {run.threads > 0 && (
                        <>
                          {" · "}
                          <span className="text-info">{run.threads} fils relus</span>
                        </>
                      )}
                      {run.bodies > 0 && (
                        <>
                          {" · "}
                          <span className="text-info">{run.bodies} contenus rattrapés</span>
                        </>
                      )}
                      {run.attachments > 0 && (
                        <>
                          {" · "}
                          <DownloadIcon className="inline size-3" /> {run.attachments} pièces
                        </>
                      )}
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
