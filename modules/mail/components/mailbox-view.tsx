"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CornerUpLeftIcon,
  MailIcon,
  PaperclipIcon,
  Link2Icon,
  SearchIcon,
  UserPlusIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSetPageTitle } from "@/modules/shell";
import { ClaudeButton, mailContext } from "@/modules/assistant";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { Bar, ListSkeleton } from "@/shared/ui/loading";
import { formatDateTime, initials, plural } from "@/shared/lib/format";
import { GradientAvatar } from "@/shared/ui/gradient-avatar";
import { cn } from "@/lib/utils";
import { MailSyncBadge } from "./mail-sync-badge";
import { useMailbox, useMailPulse } from "../hooks/use-mail";
import { useMailboxBrowse, useMailMessage } from "../hooks/use-mailbox-browse";
import { Attachments } from "./attachments";
import { AttachDialog } from "./attach-dialog";
import { MailKindBadge } from "./mail-kind-badge";
import { MATCHED_BY } from "../lib/labels";
import type { AttachResult, BrowseMessage, MailKind, MailScope } from "../lib/types";
import { customerHref } from "@/shared/lib/routes";

/**
 * La boîte de l'entreprise, en entier.
 *
 * Elle ne se consultait que fiche par fiche. Or la copie a ramené 9 138
 * messages pour 23 rapprochements : sur vingt-sept fiches portant une adresse,
 * **une seule** a écrit dans cette boîte. Le rapprochement n'est pas en cause,
 * c'est la boîte qui ne contient pas ces gens-là — les clients repris du
 * fichier Excel n'ont jamais écrit ici, et les correspondants réguliers, un
 * architecte à cinq cents messages en tête, n'ont pas de fiche.
 *
 * Vingt-six fiches sur vingt-sept montraient donc une liste vide, et rien ne
 * permettait de voir les neuf mille autres messages. Cet écran les montre.
 *
 * **Le corps arrive à l'ouverture.** Il n'est pas copié d'avance pour les neuf
 * mille : le serveur va le chercher quand on clique, puis le garde. Un message
 * qu'on ouvre est un message dont on veut le contenu ; les autres n'ont aucune
 * raison d'entrer dans la base tant que personne ne les ouvre.
 */

const SCOPES: Array<{ key: MailScope; label: string; hint: string }> = [
  { key: "tous", label: "Tous", hint: "Toute la boîte" },
  { key: "rapproches", label: "Rapprochés", hint: "Rattachés à une fiche client" },
  { key: "sans_fiche", label: "Sans fiche", hint: "Correspondants inconnus du CRM" },
  { key: "avec_corps", label: "Déjà lus", hint: "Dont le contenu est en base" },
];

const KINDS: Array<{ key: MailKind; label: string; hint: string }> = [
  { key: "tous", label: "Tous", hint: "Premiers messages et réponses" },
  { key: "nouveaux", label: "Nouveaux", hint: "Premiers messages d'une conversation" },
  { key: "reponses", label: "Réponses", hint: "Réponses dans une conversation déjà ouverte" },
];

export function MailboxView() {
  useSetPageTitle("Messagerie");

  // La recherche globale mène ici avec `?message=` : sans cela elle
  // n'ouvrirait qu'une boîte de neuf mille messages où il faudrait chercher
  // une seconde fois. Lu une fois au montage — l'utilisateur clique ensuite
  // dans la liste, et remettre l'URL d'accord à chaque clic ferait de la barre
  // d'adresse un second état à tenir.
  const params = useSearchParams();
  const [selected, setSelected] = useState<string | null>(
    () => params.get("message"),
  );

  const { accounts, running, last, now, reload } = useMailbox();
  // La liste se relit d'elle-même quand la boîte apporte du nouveau : sans
  // cela, un courriel copié en trois secondes restait invisible jusqu'au
  // prochain clic.
  const pulse = useMailPulse();
  const browse = useMailboxBrowse(pulse);
  const opened = useMailMessage(selected);

  // Les totaux couvrent toutes les boîtes : deux comptes raccordés donnaient
  // sinon le compte du premier sous un écran qui montre les deux.
  const total = accounts.reduce((n, a) => n + a.message_count, 0);
  const rapproches = accounts.reduce((n, a) => n + a.matched_count, 0);

  if (accounts.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Aucune boîte raccordée"
          description="Raccordez la messagerie de l'entreprise pour retrouver ici tous les échanges."
          action={
            <Button asChild size="sm">
              <Link href="/settings/messagerie">Raccorder une boîte</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold">Messagerie</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {accounts.length === 0
              ? "La boîte de l'entreprise."
              : `${accounts.length === 1 ? accounts[0].email : `${accounts.length} boîtes`} · ${total.toLocaleString("fr-FR")} messages, ${plural(rapproches, "rapproché")} d'une fiche.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* La fraîcheur de la boîte, à l'endroit où on la lit — et non dans
              les réglages, où il fallait aller pour savoir si la copie avait
              tourné. */}
          <MailSyncBadge running={running} last={last} now={now} onDone={reload} />
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/messagerie">Réglages de la boîte</Link>
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 items-start gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <Card className="min-w-0 gap-0 overflow-hidden py-0">
          <div className="flex flex-col gap-2.5 border-b p-3">
            <div className="relative">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                className="h-8 pl-8"
                placeholder="Sujet, expéditeur, adresse…"
                value={browse.search}
                onChange={(event) => browse.setSearch(event.target.value)}
              />
            </div>

            {/* Le choix de la boîte ne s'affiche qu'à partir de deux : avec une
                seule, un sélecteur à une entrée est une case qu'on lit pour
                rien. « Toutes » est le défaut — on ouvre cet écran pour lire le
                courrier de l'entreprise, pas celui d'un compte. */}
            {accounts.length > 1 && (
              <div className="flex flex-wrap items-center gap-1">
                {[{ id: "", email: "Toutes les boîtes" }, ...accounts].map((entry) => (
                  <button
                    key={entry.id || "toutes"}
                    type="button"
                    onClick={() => browse.setAccount(entry.id)}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs transition-colors",
                      browse.account === entry.id
                        ? "bg-selected text-brand-text font-medium"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {entry.email}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1">
              {SCOPES.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  title={entry.hint}
                  onClick={() => browse.setScope(entry.key)}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs transition-colors",
                    browse.scope === entry.key
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            {/* Une seconde question, croisée avec la première : parmi ce qu'on
                regarde, les demandes qui arrivent ou les réponses attendues. */}
            <div className="flex flex-wrap items-center gap-1">
              {KINDS.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  title={entry.hint}
                  onClick={() => browse.setKind(entry.key)}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs transition-colors",
                    browse.kind === entry.key
                      ? "bg-selected text-brand-text font-medium"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            {browse.from && (
              <button
                type="button"
                onClick={() => browse.setFrom("")}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 self-start text-xs"
              >
                <CornerUpLeftIcon className="size-3" />
                Seulement {browse.from} — retirer
              </button>
            )}
          </div>

          {browse.error ? (
            <div className="p-3">
              <ErrorNotice message={browse.error} />
            </div>
          ) : browse.loading && !browse.page ? (
            <ListSkeleton rows={9} hue="cyan" />
          ) : browse.page && browse.page.items.length === 0 ? (
            <EmptyState
              title="Aucun message"
              description="Aucun message ne correspond à cette recherche."
            />
          ) : (
            <ol className="divide-y">
              {browse.page?.items.map((message) => (
                <MessageRow
                  showAccount={accounts.length > 1}
                  key={message.id}
                  message={message}
                  active={message.id === selected}
                  onSelect={() => setSelected(message.id)}
                />
              ))}
            </ol>
          )}

          {browse.page && browse.page.total_pages > 1 && (
            <div className="flex items-center justify-between border-t px-3 py-2">
              <span className="text-muted-foreground text-xs tabular-nums">
                {browse.page.total.toLocaleString("fr-FR")} messages · page {browse.page.page} sur{" "}
                {browse.page.total_pages}
              </span>
              <div className="flex gap-1">
                <Button
                  size="icon-xs"
                  variant="outline"
                  disabled={browse.pageNumber <= 1}
                  onClick={() => browse.setPage(browse.pageNumber - 1)}
                  aria-label="Page précédente"
                >
                  <ChevronLeftIcon />
                </Button>
                <Button
                  size="icon-xs"
                  variant="outline"
                  disabled={browse.pageNumber >= browse.page.total_pages}
                  onClick={() => browse.setPage(browse.pageNumber + 1)}
                  aria-label="Page suivante"
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card className="min-w-0 gap-0 py-0">
          <Reader
            loading={opened.loading}
            error={opened.error}
            message={opened.message}
            onFilterSender={(email) => browse.setFrom(email)}
            onAttached={() => {
              // Le message ouvert change de fiche, et la liste ses pastilles.
              opened.reload();
              browse.reload();
            }}
          />
        </Card>
      </div>
    </div>
  );
}

function MessageRow({
  message,
  active,
  onSelect,
  /** Vrai dès que deux boîtes sont raccordées : sinon la répéter n'apprend rien. */
  showAccount,
}: {
  message: BrowseMessage;
  active: boolean;
  onSelect: () => void;
  showAccount: boolean;
}) {
  const who = message.outgoing ? "Envoyé" : message.from_name || message.from_email;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        // La démo des pièces jointes ouvre le premier message qui en porte.
        data-demo={message.attachment_count > 0 ? "mail-row-with-attachments" : undefined}
        className={cn(
          "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors",
          active ? "bg-muted" : "hover:bg-muted/50",
        )}
      >
        <GradientAvatar
          seed={message.from_email || message.id}
          text={initials(message.from_name || message.from_email)}
          size={28}
          className="mt-0.5 shrink-0"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-xs font-medium">{who}</span>
            <span className="text-muted-foreground/70 shrink-0 text-[0.7rem] whitespace-nowrap">
              {new Date(message.sent_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>

          <div className="truncate text-sm">{message.subject || "(sans objet)"}</div>
          {/* Un message sans corps voit son extrait retomber sur le sujet :
              l'afficher deux fois ne dirait rien de plus. */}
          {message.snippet && message.snippet !== message.subject && (
            <div className="text-muted-foreground truncate text-xs">{message.snippet}</div>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <MailKindBadge message={message} />
            {showAccount && message.account && (
              <span className="bg-muted text-muted-foreground rounded-sm px-1.5 py-0.5 text-[0.65rem]">
                {message.account}
              </span>
            )}
            {message.matched && message.customer_name && (
              <span
                className="bg-success-soft text-success rounded-sm px-1.5 py-0.5 text-[0.65rem]"
                title={MATCHED_BY[message.matched_by] ?? undefined}
              >
                {message.customer_name}
                {message.matched_by === "fil" && (
                  <span className="text-success/70"> · par le fil</span>
                )}
              </span>
            )}
            {message.attachment_count > 0 && (
              <span className="text-muted-foreground/70 flex items-center gap-0.5 text-[0.65rem]">
                <PaperclipIcon className="size-2.5" />
                {message.attachment_count}
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}

function Reader({
  loading,
  error,
  message,
  onFilterSender,
  onAttached,
}: {
  loading: boolean;
  error: string | null;
  message: BrowseMessage | null;
  onFilterSender: (email: string) => void;
  onAttached: () => void;
}) {
  const [attaching, setAttaching] = useState(false);
  // Ce que le dernier rattachement a fait, dit sous le message qu'il visait —
  // et pas sous le suivant qu'on ouvre.
  const [notice, setNotice] = useState<{ id: string; text: string } | null>(null);

  if (error) {
    return (
      <div className="p-4">
        <ErrorNotice message={error} />
      </div>
    );
  }

  if (loading) {
    /*
      Le corps d'un message est récupéré en IMAP à l'ouverture : c'est la seule
      attente du CRM qui dépasse la seconde. Elle prend donc la forme du
      message qui arrive — l'objet, l'expéditeur, puis les lignes — plutôt
      qu'un rond qui tourne au milieu du vide.
    */
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-2">
          <Bar hue="cyan" className="h-4 w-3/4" />
          <Bar className="h-2.5 w-1/2" />
        </div>
        <div className="flex flex-col gap-2 border-t pt-4">
          {["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-2/3"].map(
            (largeur, index) => (
              <Bar key={index} className={`h-2.5 ${largeur}`} />
            ),
          )}
        </div>
        <p className="text-muted-foreground/60 text-[11px]">
          Récupération du message auprès du serveur…
        </p>
      </div>
    );
  }

  if (!message) {
    return (
      <EmptyState
        title="Aucun message ouvert"
        description="Choisissez un message à gauche. Son contenu est récupéré à l'ouverture."
      />
    );
  }

  return (
    <div className="flex min-w-0 flex-col">
      <header className="flex flex-col gap-3 border-b p-4">
        <h2 className="text-base font-semibold">{message.subject || "(sans objet)"}</h2>

        <div className="flex flex-wrap items-center gap-3">
          <GradientAvatar
            seed={message.from_email || message.id}
            text={initials(message.from_name || message.from_email)}
            size={32}
          />
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {message.from_name || message.from_email}
            </div>
            <div className="text-muted-foreground truncate text-xs">
              {message.from_email} · {formatDateTime(message.sent_at)}
            </div>
          </div>

          <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
            <ClaudeButton
              size="xs"
              context={mailContext({
                subject: message.subject,
                from: message.from_name || message.from_email,
                customer: message.matched ? message.customer_name : null,
              })}
            />
            {message.matched && message.customer_id ? (
              <Button size="xs" variant="outline" asChild>
                <Link href={customerHref(message.customer_id)}>{message.customer_name}</Link>
              </Button>
            ) : (
              <>
                {/*
                  Rattacher à une fiche qui existe, en retenant l'adresse :
                  c'est le geste qui apprend. Un clic par interlocuteur, et
                  son passé comme son avenir suivent par clé exacte.
                */}
                <Button size="xs" variant="outline" onClick={() => setAttaching(true)}>
                  <Link2Icon />
                  Rattacher à une fiche
                </Button>
                {/* Créer la fiche avec cette adresse suffit : la copie
                    suivante rapprochera d'elle-même les messages passés. */}
                <Button size="xs" variant="ghost" asChild>
                  <Link href={`/customers/nouveau?email=${encodeURIComponent(message.from_email)}&name=${encodeURIComponent(message.from_name ?? "")}`}>
                    <UserPlusIcon />
                    Créer la fiche
                  </Link>
                </Button>
              </>
            )}
            <Button size="xs" variant="ghost" onClick={() => onFilterSender(message.from_email)}>
              <MailIcon />
              Tout de ce contact
            </Button>
          </div>
        </div>

        {notice?.id === message.id && (
          <p className="text-success mt-2 text-xs">{notice.text}</p>
        )}

        {attaching && (
          <AttachDialog
            message={message}
            open={attaching}
            onOpenChange={setAttaching}
            onDone={(result) => {
              setNotice({ id: message.id, text: describeAttach(result) });
              onAttached();
            }}
          />
        )}
      </header>

      <div className="min-w-0 p-4">
        {message.body ? (
          // Un courrier se lit dans la police du texte, pas dans celle du code.
          // `whitespace-pre-wrap` garde les paragraphes que le serveur a
          // conservés en dépliant le HTML.
          <div className="max-w-3xl text-sm leading-relaxed break-words whitespace-pre-wrap">
            {message.body}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Ce message n&apos;a pas de texte — une pièce jointe seule, ou un accusé de
            réception. Ses en-têtes sont ci-dessus.
          </p>
        )}
      </div>

      {message.attachment_count > 0 && (
        <div className="border-t p-4">
          <Attachments messageId={message.id} />
        </div>
      )}
    </div>
  );
}

/** « 1 rattaché · adresse retenue · 12 courriels plus anciens ont suivi ». */
function describeAttach(result: AttachResult): string {
  const parts = [plural(result.attached, "rattaché")];
  if (result.remembered.length > 0) {
    parts.push(
      result.email_set && result.remembered.length === 1
        ? "adresse retenue sur la fiche"
        : plural(result.remembered.length, "adresse retenue", "adresses retenues"),
    );
  }
  if (result.rematched > 0) {
    parts.push(`${plural(result.rematched, "courriel")} de plus ${result.rematched > 1 ? "ont" : "a"} suivi`);
  }
  return parts.join(" · ");
}
