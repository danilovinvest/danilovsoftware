"use client";

import { useState } from "react";
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
import { usePermission } from "@/modules/auth";
import { ClaudeButton, worksiteContext } from "@/modules/assistant";
import {
  ProjectJalons,
  depositTotalOf,
  missionOf,
  projectReference,
  setMilestones,
  setQuoteDeposit,
  updateProject,
  type Jalons,
  type PaymentStatus,
  type ProjectPayload,
} from "@/modules/customers";
import { errorMessage } from "@/shared/api/errors";
import { ErrorNotice } from "@/shared/ui/feedback";
import { STUDY_STATUS, WORKSITE_STATUS } from "../lib/labels";
import { isSilent } from "../lib/derive";
import type { Metier, ReadWorksite, WorksiteQuote } from "../lib/types";

/** Le devis signé de l'affaire, celui qui porte le règlement. */
function signedQuote(w: ReadWorksite["worksite"]): WorksiteQuote | null {
  return (
    w.quotes.find((q) => q.status === "accepte" || q.status === "realise") ??
    w.quotes[0] ??
    null
  );
}

/** Le statut d'acompte du devis signé, « non_applicable » à défaut de devis. */
function quoteDeposit(w: ReadWorksite["worksite"]): string {
  return signedQuote(w)?.deposit_status ?? "non_applicable";
}

/**
 * La fiche d'un chantier ou d'une étude.
 *
 * **Elle ne fait plus que décrire.** Elle alignait des faits — dates, pièces,
 * dossier — et laissait l'utilisateur retourner sur la fiche client pour agir.
 * On ouvre pourtant un chantier depuis le tableau précisément parce qu'il
 * réclame quelque chose : une date, des matériaux, des plans, un solde.
 *
 * Les jalons sont donc ici, et ce sont **les mêmes cases que sur la fiche
 * client** — même composant, même écriture, même règle d'ordre. Deux listes de
 * cases auraient divergé au premier ajustement.
 */
export function WorksiteSheet({
  read,
  metier,
  onChanged,
  onClose,
}: {
  read: ReadWorksite | null;
  metier: Metier;
  /** Rechargement de la liste après une écriture. */
  onChanged: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={read !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        {read && <Body read={read} metier={metier} onChanged={onChanged} />}
      </SheetContent>
    </Sheet>
  );
}

function Body({
  read,
  metier,
  onChanged,
}: {
  read: ReadWorksite;
  metier: Metier;
  onChanged: () => void;
}) {
  const { worksite: w } = read;
  const status =
    metier === "etudes" ? STUDY_STATUS[read.study] : WORKSITE_STATUS[read.status];
  const canWrite = usePermission("customers:write");

  /*
    Les jalons s'affichent tout de suite, puis s'enregistrent.

    Même mécanique que sur la fiche client : attendre l'aller-retour pour voir
    une case se cocher donne une interface qui semble morte. En cas d'échec, la
    surcouche est retirée et la case revient où elle était.
  */
  const [optimiste, setOptimiste] = useState<Partial<Jalons>>({});
  const [enCours, setEnCours] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);

  const jalons: Jalons = {
    deposit_invoiced_at: read.depositReceived || quoteDeposit(w) !== "non_applicable"
      ? (w.started_at ?? w.created_at)
      : null,
    deposit_paid_at: read.depositReceived ? (w.started_at ?? w.created_at) : null,
    deposit_amount: signedQuote(w)?.deposit_amount ?? null,
    // Aucune colonne ne date le solde : le devis n'en porte que le statut.
    balance_paid_at:
      signedQuote(w)?.balance_status === "recu" ? (w.started_at ?? w.created_at) : null,
    rib_sent_at: w.rib_sent_at,
    insurance_sent_at: w.insurance_sent_at,
    worksite_date: w.started_at,
    materials_ordered_at: w.materials_ordered_at,
    materials: w.materials,
    resume_at: w.resume_at,
    plans_sent_at: w.plans_sent_at,
    review_requested_at: w.review_requested_at,
    review_received_at: w.review_received_at,
    pv_sent_at: w.pv_sent_at,
    pv_signed_at: w.pv_signed_at,
    visit_report_sent_at: w.visit_report_sent_at,
    survey_report_sent_at: w.survey_report_sent_at,
    calc_started_at: w.calc_started_at,
    calc_done_at: w.calc_done_at,
    plans_started_at: w.plans_started_at,
    plans_review_at: w.plans_review_at,
    corrections_at: w.corrections_at,
    final_ready_at: w.final_ready_at,
    report_written_at: w.report_written_at,
    report_validated_at: w.report_validated_at,
    report_sent_at: w.report_sent_at,
    survey_done_at: w.survey_done_at,
    ...optimiste,
  };

  function poser(key: keyof Jalons, value: string | null) {
    return appliquer({ [key]: value } as Partial<Jalons>);
  }

  /**
   * La commande de matériaux : ce qui a été commandé, et quand.
   *
   * `null` retire les deux — une liste de ce qui a été commandé n'a aucun sens
   * sans la commande. La date déjà posée est conservée : compléter la liste
   * trois jours plus tard ne doit pas faire croire qu'on a commandé
   * aujourd'hui.
   */
  function commanderMateriaux(list: string[] | null): Promise<boolean> {
    return appliquer(
      list === null
        ? { materials: [], materials_ordered_at: null }
        : {
            materials: list,
            materials_ordered_at: jalons.materials_ordered_at ?? new Date().toISOString(),
          },
    );
  }

  /** Encaisse l'acompte avec son montant, ou corrige le montant. */
  function encaisser(amount: string | null): Promise<boolean> {
    return appliquer({
      deposit_paid_at: jalons.deposit_paid_at ?? new Date().toISOString(),
      deposit_amount: amount,
    });
  }

  /** Retire l'encaissement. `appliquer` rend la réussite et affiche l'échec. */
  function retirerAcompte(): Promise<boolean> {
    return appliquer({ deposit_paid_at: null });
  }

  /**
   * Applique un lot de jalons : peint, écrit, se dédit s'il échoue.
   *
   * Un lot et non un champ, parce que la commande de matériaux en écrit deux à
   * la fois — la liste et sa date. Deux appels sur une route qui remplace la
   * ligne entière se seraient écrasés l'un l'autre.
   */
  async function appliquer(patch: Partial<Jalons>): Promise<boolean> {
    setOptimiste((current) => ({ ...current, ...patch }));
    setEnCours(true);
    setEchec(null);
    const suivant = { ...jalons, ...patch };
    try {
      if ("deposit_invoiced_at" in patch || "deposit_paid_at" in patch || "deposit_amount" in patch) {
        /*
          L'acompte appartient au devis, et sa route ne touche que lui.

          Cet écran renvoyait le devis entier sans en connaître le taux de TVA
          ni le commentaire, et les effaçait à chaque case cochée.
        */
        const cible = signedQuote(w);
        if (!cible) throw new Error("Aucun devis à mettre à jour sur cette affaire.");
        const status: PaymentStatus =
          "deposit_paid_at" in patch
            ? patch.deposit_paid_at
              ? "recu"
              : "en_attente"
            : "deposit_invoiced_at" in patch
              ? patch.deposit_invoiced_at
                ? "en_attente"
                : "non_applicable"
              : (cible.deposit_status as PaymentStatus);
        await setQuoteDeposit(cible.id, {
          status,
          amount: "deposit_amount" in patch ? (patch.deposit_amount ?? null) : cible.deposit_amount,
        });
      } else if ("worksite_date" in patch) {
        // Réserver une date, c'est renseigner `started_at` de l'affaire : la
        // colonne que cet écran lit déjà pour classer ses colonnes.
        const value = patch.worksite_date ?? null;
        await updateProject(w.id, {
          label: w.label, stage: w.stage,
          // Renvoyé tel quel : cet écran ne le modifie pas, et la route
          // remplace l'affaire entière.
          scope: w.scope,
          manager_id: w.manager_id,
          engineer_id: w.engineer_id,
          drafter_id: w.drafter_id,
          outcome: (w.outcome || null) as ProjectPayload["outcome"],
          outcome_note: w.outcome_note,
          site_address: w.site_address, site_postal_code: w.site_postal_code,
          site_city: w.city, notes: w.notes,
          started_at: value ? value.slice(0, 10) : null,
          closed_at: w.closed_at,
          mission: w.mission,
          promised_at: w.promised_at,
          internal_deadline_at: w.internal_deadline_at,
        });
      } else {
        await setMilestones(w.id, {
          rib_sent_at: suivant.rib_sent_at,
          insurance_sent_at: suivant.insurance_sent_at,
          materials_ordered_at: suivant.materials_ordered_at,
          materials: suivant.materials,
          resume_at: suivant.resume_at,
          plans_sent_at: suivant.plans_sent_at,
          review_requested_at: suivant.review_requested_at,
          review_received_at: suivant.review_received_at,
          pv_sent_at: suivant.pv_sent_at,
          pv_signed_at: suivant.pv_signed_at,
          visit_report_sent_at: suivant.visit_report_sent_at,
          survey_report_sent_at: suivant.survey_report_sent_at,
          calc_started_at: suivant.calc_started_at,
          calc_done_at: suivant.calc_done_at,
          plans_started_at: suivant.plans_started_at,
          plans_review_at: suivant.plans_review_at,
          corrections_at: suivant.corrections_at,
          final_ready_at: suivant.final_ready_at,
          report_written_at: suivant.report_written_at,
          report_validated_at: suivant.report_validated_at,
          report_sent_at: suivant.report_sent_at,
          survey_done_at: suivant.survey_done_at,
          // Rendus tels quels : cet écran ne les modifie pas, et la requête
          // remplace la ligne entière.
          contact_at: w.contact_at,
          rdv_at: w.rdv_at,
          quote_sent_at: w.quote_sent_at,
          negotiation_at: w.negotiation_at,
          signed_at: w.signed_at,
        });
      }
      onChanged();
      return true;
    } catch (cause) {
      setOptimiste((current) => {
        const copie = { ...current };
        for (const cle of Object.keys(patch)) delete copie[cle as keyof Jalons];
        return copie;
      });
      setEchec(errorMessage(cause));
      return false;
    } finally {
      setEnCours(false);
    }
  }

  return (
    <>
      <SheetHeader className="gap-1 pb-3">
        <SheetTitle className="text-base">{w.customer_name}</SheetTitle>
        <SheetDescription className="text-sm">
          {w.reference && (
            <span className="font-mono text-xs font-semibold">
              {projectReference(w.reference, metier)} ·{" "}
            </span>
          )}
          {w.label}
        </SheetDescription>
        <ClaudeButton
          size="xs"
          className="mt-1 self-start"
          context={worksiteContext({
            customer: w.customer_name,
            label: w.label,
            status: status.label,
            etudes: metier === "etudes",
            quotes: read.devis.length,
            invoices: read.factures.length,
            depositReceived: read.depositReceived,
          })}
        />
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
          {read.deadline && (
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                TONE_SOFT[read.deadline.tone],
              )}
            >
              {read.deadline.label}
            </span>
          )}
          {read.depositReceived && (
            <span className="bg-success-soft text-success rounded-md px-1.5 py-0.5 text-[11px] font-medium">
              acompte encaissé
              {jalons.deposit_amount && ` · ${formatAmount(jalons.deposit_amount)}`}
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

        <Facts read={read} metier={metier} />

        {echec && <ErrorNotice message={echec} />}

        {/*
          Ce qu'il reste à faire, et de quoi le faire.

          C'est la seule chose qu'on vient chercher en ouvrant un chantier
          depuis le tableau : il y est parce qu'il réclame quelque chose.
        */}
        <div>
          <h3 className="mb-2 text-xs font-medium">Après la signature</h3>
          <ProjectJalons
            metier={metier}
            mission={missionOf(w, w.quotes)}
            jalons={jalons}
            disabled={!canWrite || enCours}
            onToggle={poser}
            onMaterials={commanderMateriaux}
            depositTotal={depositTotalOf(signedQuote(w))}
            onDeposit={encaisser}
            onDepositRemove={retirerAcompte}
          />
        </div>

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
function Facts({ read, metier }: { read: ReadWorksite; metier: Metier }) {
  const { worksite: w } = read;
  const rows: Array<[string, string]> = [];

  if (metier === "etudes") {
    rows.push([
      "Plans rendus",
      w.plans_sent_at ? formatDate(w.plans_sent_at) : "pas encore",
    ]);
  }

  rows.push([
    metier === "etudes" ? "Acompte encaissé le" : "Démarrage",
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
