"use client";

import Link from "next/link";
import { ExternalLinkIcon, FileTextIcon, ReceiptTextIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TONE_SOFT } from "@/shared/ui/panel";
import { euros, formatAmount, formatDate, formatDateTime } from "@/shared/lib/format";
import { WORKSITE_STATUS } from "../lib/labels";
import { isSilent } from "../lib/derive";
import type { ReadWorksite, WorksiteQuote } from "../lib/types";

/**
 * La fiche d'un chantier.
 *
 * Elle ne montre plus de coûts, de marge, de PV ni d'avis client : le CRM ne
 * les suit pas, et une frise de six jalons dont quatre resteraient
 * éternellement gris ferait douter des deux autres.
 *
 * Ce qu'elle montre est vrai et se tient en trois blocs : où on en est, les
 * pièces au dossier — chacune ouvrant son fichier sur OneDrive —, et le lien
 * vers la fiche client, qui porte la chronologie complète.
 */
export function WorksiteSheet({
  read,
  onClose,
}: {
  read: ReadWorksite | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={read !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        {read && <Body read={read} />}
      </SheetContent>
    </Sheet>
  );
}

function Body({ read }: { read: ReadWorksite }) {
  const { worksite: w } = read;
  const status = WORKSITE_STATUS[read.status];

  return (
    <>
      <SheetHeader className="gap-1 pb-3">
        <SheetTitle className="text-base">{w.customer_name}</SheetTitle>
        <SheetDescription className="text-sm">{w.label}</SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-5 px-4 pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
              TONE_SOFT[status.tone],
            )}
          >
            {status.label}
          </span>
          {read.depositReceived && (
            <span className="bg-success-soft text-success rounded-md px-1.5 py-0.5 text-[11px] font-medium">
              acompte encaissé
            </span>
          )}
          {read.invoiced && (
            <span className="bg-info-soft text-info rounded-md px-1.5 py-0.5 text-[11px] font-medium">
              facturé
            </span>
          )}
          <span className="text-muted-foreground font-mono text-[11px]">
            {w.customer_reference}
          </span>
          {/* Le chiffré vient des devis, jamais des factures : une facture
              solde un devis, les additionner doublerait le chantier. */}
          {read.amountHT !== null && (
            <span className="ml-auto text-sm font-medium tabular-nums">
              {euros(read.amountHT)} HT
            </span>
          )}
        </div>

        <Facts read={read} />

        <Section
          title="Devis"
          icon={FileTextIcon}
          quotes={read.devis}
          empty="Aucun devis au dossier."
        />
        <Section
          title="Factures"
          icon={ReceiptTextIcon}
          quotes={read.factures}
          empty="Aucune facture au dossier."
        />

        {w.notes && (
          <div>
            <h3 className="mb-1.5 text-xs font-medium">Dossier</h3>
            <p className="text-muted-foreground font-mono text-[11px] break-all">
              {w.notes}
            </p>
          </div>
        )}

        <Button asChild variant="outline" size="sm" className="self-start">
          <Link href={`/customers/${w.customer_id}`}>
            Ouvrir la fiche client
          </Link>
        </Button>
      </div>
    </>
  );
}

/** Les faits datés. Une ligne absente vaut « on ne sait pas », jamais zéro. */
function Facts({ read }: { read: ReadWorksite }) {
  const { worksite: w } = read;
  const rows: Array<[string, string]> = [];

  rows.push([
    "Démarrage",
    w.started_at
      ? `${formatDate(w.started_at)}${
          read.status === "en_cours" && read.daysRunning !== null
            ? ` · il y a ${read.daysRunning} jours`
            : ""
        }`
      : "aucune date renseignée",
  ]);
  if (w.closed_at) rows.push(["Fin", formatDate(w.closed_at)]);
  if (w.city) rows.push(["Lieu", [w.site_address, w.city].filter(Boolean).join(", ")]);
  if (w.owner_name) rows.push(["Chargé d'affaires", w.owner_name]);
  rows.push([
    "Dernier échange",
    w.last_interaction_at
      ? `${formatDateTime(w.last_interaction_at)}${
          isSilent(read) ? ` · ${read.daysSilent} jours de silence` : ""
        }`
      : "aucun échange enregistré",
  ]);

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground text-xs">{label}</dt>
          <dd className="text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Les pièces d'un dossier.
 *
 * Chaque ligne ouvre le fichier chez Microsoft : aucun PDF n'entre en base, et
 * les deux cent quatre-vingt-quatre pièces connues portent toutes leur lien.
 */
function Section({
  title,
  icon: Icon,
  quotes,
  empty,
}: {
  title: string;
  icon: typeof FileTextIcon;
  quotes: WorksiteQuote[];
  empty: string;
}) {
  return (
    <div>
      <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
        <Icon className="size-3.5" />
        {title}
        {quotes.length > 0 && (
          <span className="text-muted-foreground/60 tabular-nums">{quotes.length}</span>
        )}
      </h3>
      {quotes.length === 0 ? (
        <p className="text-muted-foreground/60 text-xs">{empty}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {quotes.map((quote) => (
            <li key={quote.id}>
              <a
                href={quote.drive_url || undefined}
                target="_blank"
                rel="noreferrer"
                className="hover:bg-accent/50 flex items-center gap-2 px-2.5 py-2 transition-colors"
              >
                <span className="font-mono text-[11px]">
                  {quote.reference || "sans référence"}
                </span>
                <span className="text-muted-foreground min-w-0 flex-1 truncate text-[11px]">
                  {quote.drive_name || quote.label}
                </span>
                {/* Un devis repris d'un nom de fichier OneDrive n'a pas de
                    montant ; seuls ceux recoupés avec l'export du logiciel de
                    devis en portent un. Rien plutôt qu'un « 0 € ». */}
                {quote.amount_ht && (
                  <span className="shrink-0 text-xs tabular-nums">
                    {formatAmount(quote.amount_ht)}
                  </span>
                )}
                {quote.drive_url && (
                  <ExternalLinkIcon className="text-muted-foreground/50 size-3 shrink-0" />
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
