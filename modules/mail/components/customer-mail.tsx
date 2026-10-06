"use client";

import { useState } from "react";
import { HardHatIcon, Unlink2Icon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { ClaudeButton, customerMailContext } from "@/modules/assistant";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LIVE, useCached } from "@/shared/api/cache";
import { errorMessage } from "@/shared/api/errors";
import { cn } from "@/lib/utils";
import { plural } from "@/shared/lib/format";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { ListSkeleton } from "@/shared/ui/loading";
import { askConfirm } from "@/shared/ui/confirm";
import { notifyError, notifySuccess } from "@/shared/ui/toaster";
import * as api from "../lib/api";
import { useCustomerMailPages } from "../hooks/use-customer-mail";
import { CustomerMailRow } from "./customer-mail-row";
import { MailProjectDialog } from "./mail-project-dialog";

/**
 * Les courriels d'une fiche.
 *
 * Ils ne sont là que parce qu'une adresse de la fiche figure parmi les
 * correspondants — ou parce qu'on les y a rattachés. Les messages dont
 * personne n'est reconnu vivent dans l'écran Messagerie.
 *
 * **Le rapprochement se trompe en série, pas à l'unité.** Une fiche portant une
 * adresse trop large — au pire celle de la boîte elle-même — ramasse des
 * milliers de messages d'un coup. D'où la sélection multiple et le « tout
 * retirer » : corriger cela ligne par ligne serait une journée de clics.
 *
 * **Retirer se défait** (issue 88). Le geste était sans retour, à un clic d'une
 * icône : le toast propose « Annuler », qui rattache à nouveau les courriels
 * retirés. « Tout retirer », lui, demande confirmation — il porte sur des
 * milliers de messages que l'écran n'a pas tous en main pour les rendre.
 *
 * **Triés par chantier** (migration 112). Les courriels d'un fournisseur
 * restent sur sa fiche et disent de quelle affaire ils parlent : 360 courriels
 * de Balitrand avaient été déplacés à la main sur les fiches des clients. Les
 * pastilles n'apparaissent que si un courriel désigne une affaire ; « Chantier… »
 * tranche à la main pour ceux que le texte ne dit pas.
 */
export function CustomerMail({ customerId }: { customerId: string }) {
  // "" : tous ; « none » : ceux qui ne désignent aucune affaire ; sinon une affaire.
  const [project, setProject] = useState("");
  const mail = useCustomerMailPages(customerId, project);
  const chantiers = useCached(`mail:customer-projects:${customerId}`, () => api.listCustomerMailProjects(customerId), LIVE);
  const [linking, setLinking] = useState<string[] | null>(null);
  const canWrite = usePermission("customers:write");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function pick(id: string, on: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function detach(ids: string[] | "all") {
    setBusy(true);
    try {
      const result =
        ids === "all"
          ? await api.detachCustomerMailMany(customerId, { all: true })
          : await api.detachCustomerMailMany(customerId, { ids });
      setSelected(new Set());
      const undo = ids === "all" ? undefined : { label: "Annuler", onClick: () => void reattach(ids) };
      notifySuccess(`${plural(result.detached, "courriel retiré", "courriels retirés")} de la fiche`, undo);
    } catch (cause) {
      notifyError(errorMessage(cause), () => void detach(ids));
    } finally {
      setBusy(false);
      mail.reload();
      void chantiers.mutate();
    }
  }

  // Le geste inverse : les mêmes courriels reviennent, sans retenir d'adresse —
  // ce n'était pas le geste défait.
  async function reattach(ids: string[]) {
    try {
      await api.attachCustomerMail(customerId, ids, false);
      notifySuccess("Courriels rattachés à nouveau");
    } catch (cause) {
      notifyError(errorMessage(cause), () => void reattach(ids));
    } finally {
      mail.reload();
      void chantiers.mutate();
    }
  }

  const projects = chantiers.data?.projects ?? [];
  const byProject = new Map(projects.map((entry) => [entry.project_id, entry]));
  // Les pastilles restent tant qu'un tri est posé : sans elles, un tri devenu
  // vide (le dernier lien retiré, une lecture en échec) n'aurait plus de sortie.
  const filters = (projects.length > 0 || project !== "") && (
    <div
      role="group"
      aria-label="Trier les courriels par chantier"
      className="mb-2 flex flex-wrap gap-1.5"
      data-demo="mail-project-filters"
    >
      {[
        { value: "", label: "Tous" },
        ...projects.map((entry) => ({
          value: entry.project_id,
          label: `${entry.customer_name} — ${entry.label} (${entry.messages})`,
        })),
        { value: "none", label: `Sans chantier (${chantiers.data?.unlinked ?? 0})` },
      ].map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={project === option.value}
          title={option.label}
          onClick={() => {
            setProject(option.value);
            setSelected(new Set());
          }}
          className={cn(
            "max-w-full truncate rounded-full border px-2.5 py-1 text-xs transition-colors",
            project === option.value ? "bg-foreground text-background border-foreground" : "hover:bg-accent",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  if (mail.loading) {
    return (
      <div className="flex flex-col">
        {filters}
        <ListSkeleton rows={5} hue="indigo" />
      </div>
    );
  }
  if (mail.error && mail.messages.length === 0) {
    return (
      <div className="flex flex-col">
        {filters}
        <ErrorNotice message={errorMessage(mail.error)} onRetry={mail.reload} />
      </div>
    );
  }
  if (mail.messages.length === 0 && project !== "") {
    return (
      <div className="flex flex-col">
        {filters}
        <EmptyState title="Aucun courriel" description="Aucun courriel de cette fiche ne répond à ce tri." />
      </div>
    );
  }
  if (mail.messages.length === 0) {
    return (
      <EmptyState
        title="Aucun courriel"
        description="Aucun message de la boîte ne cite une adresse de cette fiche. Depuis la Messagerie, « Rattacher à une fiche » en apprend une."
      />
    );
  }

  const shown = mail.messages;
  // Une relecture peut retirer de la liste un courriel coché : on n'agit que
  // sur ceux qu'on voit.
  const picked = shown.filter((m) => selected.has(m.id)).map((m) => m.id);
  const allPicked = shown.length > 0 && picked.length === shown.length;

  return (
    <div className="flex flex-col">
      {filters}
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        {canWrite && (
          <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-xs">
            <Checkbox
              checked={allPicked}
              disabled={busy}
              onCheckedChange={(value) => setSelected(value === true ? new Set(shown.map((m) => m.id)) : new Set())}
              aria-label="Tout sélectionner"
            />
            Tout sélectionner
            <span className="text-muted-foreground/60 tabular-nums">({shown.length})</span>
          </label>
        )}
        {canWrite && picked.length > 0 && (
          <Button size="xs" variant="outline" disabled={busy} className="text-danger hover:text-danger" onClick={() => void detach(picked)}>
            <Unlink2Icon />
            Retirer {plural(picked.length, "courriel")}
          </Button>
        )}
        {canWrite && picked.length > 0 && (
          <Button size="xs" variant="outline" disabled={busy} onClick={() => setLinking(picked)}>
            <HardHatIcon />
            Chantier…
          </Button>
        )}
        <span className="text-muted-foreground ml-auto text-xs tabular-nums">
          {shown.length < mail.total ? `${shown.length} sur ${mail.total}` : plural(mail.total, "courriel")}
        </span>
        <ClaudeButton size="xs" context={customerMailContext({ total: mail.total, customerId })} />
        {/* « Tout retirer » porte sur la fiche entière, pas sur ce qui est à
            l'écran : c'est le seul geste qui répare une fiche ayant ramassé des
            milliers de messages. */}
        {canWrite && project === "" && (
          <Button
            size="xs"
            variant="ghost"
            disabled={busy}
            className="text-muted-foreground hover:text-danger"
            onClick={async () => {
              const ok = await askConfirm({
                title: `Retirer les ${mail.total} courriels de cette fiche`,
                description:
                  "Ils restent dans la boîte et dans l'écran Messagerie. Ils ne seront simplement plus rattachés à ce client, et ce geste ne s'annule pas.",
                confirmLabel: "Tout retirer",
              });
              if (ok) void detach("all");
            }}
          >
            Tout retirer ({mail.total})
          </Button>
        )}
      </div>

      <div className="divide-y rounded-lg border">
        {shown.map((message) => (
          <CustomerMailRow
            key={message.id}
            customerId={customerId}
            message={message}
            project={message.project_id ? byProject.get(message.project_id) : undefined}
            open={expanded === message.id}
            onToggle={() => setExpanded(expanded === message.id ? null : message.id)}
            picked={selected.has(message.id)}
            onPick={(on) => pick(message.id, on)}
            canWrite={canWrite}
            busy={busy}
            onDetach={() => void detach([message.id])}
          />
        ))}
      </div>

      {linking && (
        <MailProjectDialog
          customerId={customerId}
          ids={linking}
          onClose={() => setLinking(null)}
          onDone={(updated) => {
            setSelected(new Set());
            notifySuccess(`Chantier enregistré sur ${plural(updated, "courriel")}`);
            mail.reload();
            void chantiers.mutate();
          }}
        />
      )}

      {mail.hasMore && (
        <Button size="sm" variant="outline" className="mt-2 self-center" disabled={mail.loadingMore} onClick={mail.loadMore}>
          {mail.loadingMore ? "Chargement…" : `Charger plus (${mail.total - shown.length} restants)`}
        </Button>
      )}
    </div>
  );
}
