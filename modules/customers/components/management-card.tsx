"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePermission } from "@/modules/auth";
import { LIVE, useCached } from "@/shared/api/cache";
import { ErrorNotice } from "@/shared/ui/feedback";
import { TextField } from "@/shared/ui/form";
import { Bar } from "@/shared/ui/loading";
import { formatDate, formatPhone } from "@/shared/lib/format";
import { useAction } from "../hooks/use-customers";
import { setLinkReference } from "../lib/building-api";
import { getManagement, setLinkPeriod } from "../lib/syndic-api";
import { refreshSyndicViews } from "../lib/syndic-cache";
import { periodText } from "../lib/syndic-labels";
import type { SyndicPeriod } from "../lib/syndic-types";
import { BillingRulesEditor } from "./billing-rules-editor";
import { appHref } from "@/shared/lib/routes";

/**
 * « Gestion » d'une copropriété, dans l'onglet Fiche (migration 109) : ses
 * syndics successifs, qui la suit chez le syndic courant, et ce qui lui est
 * propre pour facturer — son libellé de relevé surtout.
 *
 * L'immeuble survit à ses syndics : changer de cabinet dans « Géré par »
 * termine le mandat précédent au lieu de l'effacer, et les affaires d'alors
 * restent à l'ancien. Les bornes d'un mandat se corrigent ici ; le cabinet
 * lui-même se change dans le classement, un seul endroit pour ce geste.
 */
export function ManagementCard({
  customerId,
  syndicId,
}: {
  customerId: string;
  /** Le syndic courant : il entre dans la clé, pour relire quand il change. */
  syndicId: string | null;
}) {
  const canWrite = usePermission("customers:write");
  const { data, error, mutate } = useCached(
    `customers:management:${customerId}:${syndicId ?? ""}`,
    () => getManagement(customerId),
    LIVE,
  );
  // Les dates d'un mandat changent aussi le portefeuille du cabinet.
  const reload = () => {
    void mutate();
    refreshSyndicViews();
  };

  return (
    <Card className="gap-0 py-0 lg:col-span-2" data-demo="fiche-gestion">
      <CardHeader className="border-b py-4">
        <CardTitle className="text-sm">Gestion de l&apos;immeuble</CardTitle>
        <CardDescription className="text-xs">
          Les syndics successifs, la personne qui suit l&apos;immeuble, et son circuit de facturation.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 py-4 text-sm">
        {error ? <ErrorNotice message="Gestion illisible." onRetry={reload} /> : null}
        {!data && !error && <Bar hue="indigo" className="h-20 w-full" />}
        {data && (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="flex flex-col gap-1.5">
                <h3 className="text-muted-foreground text-xs font-medium">Syndics</h3>
                {data.history.length === 0 ? (
                  <p className="text-muted-foreground">
                    Aucun syndic connu. Il se désigne dans « Géré par », plus bas.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {data.history.map((period) => (
                      <li key={period.link_id} className="flex flex-wrap items-baseline gap-x-2">
                        <Link
                          href={appHref(`/customers/${period.syndic_id}?vue=portefeuille`)}
                          className={period.current ? "font-medium hover:underline" : "hover:underline"}
                        >
                          {period.syndic_name}
                        </Link>
                        <span className="text-muted-foreground text-xs">
                          {period.current ? "en cours" : "terminé"}
                          {periodText(period, formatDate) && ` · ${periodText(period, formatDate)}`}
                          {period.reference && ` · immeuble n° ${period.reference}`}
                          {period.note && ` · ${period.note}`}
                        </span>
                        {canWrite && <PeriodButton period={period} onSaved={reload} />}
                      </li>
                    ))}
                  </ul>
                )}
                {data.successors.length > 0 && (
                  <p className="text-muted-foreground text-xs">
                    Le cabinet courant a été repris par{" "}
                    {data.successors.map((member) => member.name).join(", ")}.
                  </p>
                )}
              </section>

              <section className="flex flex-col gap-1.5">
                <h3 className="text-muted-foreground text-xs font-medium">Suivi par</h3>
                {data.handlers.length === 0 ? (
                  <p className="text-muted-foreground">
                    Personne n&apos;est désigné. Le portefeuille du syndic dit quel gestionnaire suit
                    quel immeuble.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {data.handlers.map((person) => (
                      <li key={person.contact_id}>
                        <span className="font-medium">{person.full_name}</span>
                        <span className="text-muted-foreground text-xs">
                          {" · "}
                          {[person.company_name, person.email, person.phone && formatPhone(person.phone)]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className="flex flex-col gap-2 border-t pt-4">
              <h3 className="text-muted-foreground text-xs font-medium">
                Facturation propre à l&apos;immeuble — le reste vient du syndic
              </h3>
              <BillingRulesEditor
                key={JSON.stringify(data.billing_rules)}
                customerId={customerId}
                rules={data.billing_rules}
                onSaved={reload}
              />
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Les bornes d'un mandat : on sait rarement le jour exact au moment de le saisir. */
function PeriodButton({ period, onSaved }: { period: SyndicPeriod; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="xs" variant="ghost" aria-label={`Dates et numéro du mandat de ${period.syndic_name}`}>
          Mandat…
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        {open && (
          <PeriodForm
            period={period}
            onReload={onSaved}
            onDone={() => setOpen(false)}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

function PeriodForm({
  period,
  onReload,
  onDone,
}: {
  period: SyndicPeriod;
  /** Relit la carte : les dates ont pu être écrites même si le numéro a échoué. */
  onReload: () => void;
  onDone: () => void;
}) {
  const [from, setFrom] = useState(period.started_at?.slice(0, 10) ?? "");
  const [to, setTo] = useState(period.ended_at?.slice(0, 10) ?? "");
  const [reference, setReference] = useState(period.reference);
  // Deux routes, une saisie : les bornes du mandat, puis le numéro s'il change.
  const save = useAction(
    async () => {
      await setLinkPeriod(period.link_id, { started_at: from || null, ended_at: to || null });
      if (reference.trim() !== period.reference) await setLinkReference(period.link_id, reference);
    },
    { inline: true },
  );

  async function submit() {
    const ok = await save.run();
    onReload();
    if (ok !== null) onDone();
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">{period.syndic_name}</p>
      {save.error && <p className="text-danger text-xs">{save.error}</p>}
      <TextField label="Depuis le" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
      <TextField
        label="Jusqu'au"
        type="date"
        value={to}
        hint="Vide : le mandat est en cours."
        onChange={(event) => setTo(event.target.value)}
      />
      <TextField
        label="Numéro de l'immeuble chez ce syndic"
        placeholder="0155"
        value={reference}
        hint="Celui qu'il porte sur ses courriers et ses bons de commande."
        onChange={(event) => setReference(event.target.value)}
      />
      <div className="flex justify-end">
        <Button size="sm" disabled={save.pending} onClick={() => void submit()}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
