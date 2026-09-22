"use client";

import { useState } from "react";
import { useDirtyGuard } from "@/shared/lib/dirty-guard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorNotice } from "@/shared/ui/feedback";
import { SelectField, TextAreaField, TextField } from "@/shared/ui/form";
import * as api from "../lib/api";
import {
  amountToInput,
  amountsAgree,
  convertAmount,
  parseAmountInput,
  parseRateInput,
  rateToInput,
} from "../lib/amount";
import { PAYMENT_STATUS, QUOTE_ISSUER, QUOTE_KIND, QUOTE_STATUS, toOptions } from "../lib/labels";
import { useAction } from "../hooks/use-customers";
import type { Project, Quote, QuotePayload } from "../lib/types";

const EMPTY_QUOTE: QuotePayload = {
  reference: "",
  kind: "etude",
  label: "",
  status: "a_faire",
  issued_at: null,
  amount_ht: null,
  amount_ttc: null,
  vat_rate: null,
  amount_note: "",
  deposit_status: "non_applicable",
  deposit_amount: null,
  balance_status: "non_applicable",
  balance_amount: null,
  comment: "",
};

/**
 * Un devis existant, tel que le formulaire l'attend : les montants avec une
 * virgule, comme on les retape.
 *
 * `PATCH /v1/quotes/{id}` **remplace le devis entier** : un champ omis est un
 * champ effacé, sans erreur. Tous voyagent donc, y compris le commentaire et
 * le taux de TVA.
 */
function toForm(quote: Quote): QuotePayload {
  return {
    reference: quote.reference,
    kind: quote.kind,
    label: quote.label,
    status: quote.status,
    issued_at: quote.issued_at,
    amount_ht: amountToInput(quote.amount_ht) || null,
    amount_ttc: amountToInput(quote.amount_ttc) || null,
    vat_rate: rateToInput(quote.vat_rate) || null,
    amount_note: quote.amount_note,
    deposit_status: quote.deposit_status,
    deposit_amount: amountToInput(quote.deposit_amount) || null,
    balance_status: quote.balance_status,
    balance_amount: amountToInput(quote.balance_amount) || null,
    comment: quote.comment,
    issuer: quote.issuer,
  };
}

/** Quels montants ont été tapés à la main — ceux que la TVA ne réécrit jamais. */
type Manual = { ht: boolean; ttc: boolean };

/**
 * Au chargement, un HT et un TTC qui se tiennent au taux affiché sont une
 * seule information dite deux fois : corriger l'un doit entraîner l'autre. Deux
 * montants qui ne se tiennent pas — un TTC rond négocié — sont deux saisies, et
 * aucune n'est réécrite.
 */
function initialManual(values: QuotePayload): Manual {
  const ht = Boolean(values.amount_ht);
  const ttc = Boolean(values.amount_ttc);
  if (!ht || !ttc) return { ht, ttc };
  const coherent =
    Boolean(values.vat_rate) &&
    amountsAgree(values.amount_ht ?? "", values.amount_ttc ?? "", values.vat_rate ?? "");
  return coherent ? { ht: false, ttc: false } : { ht: true, ttc: true };
}

const ILLISIBLE = "Montant illisible : 8 050 ou 8 050,00.";

/**
 * Le devis, créé ou corrigé.
 *
 * Un même formulaire pour les deux, parce qu'un devis se décrit une fois : en
 * tenir un second pour la correction l'aurait fait diverger au premier champ
 * ajouté. La copie OneDrive ne réécrit jamais un devis qu'elle connaît déjà :
 * une correction faite ici tient donc.
 *
 * **Le HT et le TTC se tiennent par la TVA.** On les saisissait séparément,
 * donc deux fois, et rien ne vérifiait qu'ils disaient la même chose. Taper
 * l'un calcule l'autre au taux choisi — tant que l'autre n'a pas été tapé à la
 * main : un TTC rond négocié ne doit pas être écrasé par un calcul. Le calcul
 * vit dans les gestes, jamais dans un effet : aucun champ ne peut en relancer
 * un autre en boucle.
 */
export function QuoteDialog({
  project,
  quote = null,
  onOpenChange,
  onSaved,
}: {
  project: Project | null;
  /** Présent, on corrige ce devis au lieu d'en créer un. */
  quote?: Quote | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [initial] = useState<QuotePayload>(() => (quote ? toForm(quote) : EMPTY_QUOTE));
  const [values, setValues] = useState<QuotePayload>(initial);
  const [manual, setManual] = useState<Manual>(() => initialManual(initial));
  const close = useDirtyGuard(JSON.stringify(values) !== JSON.stringify(initial), onOpenChange);

  const ht = values.amount_ht ?? "";
  const ttc = values.amount_ttc ?? "";
  const rate = values.vat_rate ?? "";
  const errors = {
    ht: parseAmountInput(ht) === undefined ? ILLISIBLE : undefined,
    ttc: parseAmountInput(ttc) === undefined ? ILLISIBLE : undefined,
    rate: parseRateInput(rate) === undefined ? "Un taux entre 0 et 100, par exemple 20 ou 5,5." : undefined,
    deposit: parseAmountInput(values.deposit_amount) === undefined ? ILLISIBLE : undefined,
    balance: parseAmountInput(values.balance_amount) === undefined ? ILLISIBLE : undefined,
  };
  const illisible = Object.values(errors).some(Boolean);

  const create = useAction(() => {
    // Tapé à la française — « 2 400,50 » — et envoyé comme l'API l'attend.
    const payload: QuotePayload = {
      ...values,
      amount_ht: parseAmountInput(values.amount_ht) ?? null,
      amount_ttc: parseAmountInput(values.amount_ttc) ?? null,
      vat_rate: parseRateInput(values.vat_rate) ?? null,
      deposit_amount: parseAmountInput(values.deposit_amount) ?? null,
      balance_amount: parseAmountInput(values.balance_amount) ?? null,
    };
    if (illisible) throw new Error("Un montant ou le taux de TVA est illisible.");
    return quote ? api.updateQuote(quote.id, payload) : api.createQuote(project?.id ?? "", payload);
  }, { inline: true });

  /** Tape le HT : le TTC suit, s'il n'a pas été tapé lui-même. */
  function changeHT(text: string) {
    const next = { ...values, amount_ht: text || null };
    if (!manual.ttc) next.amount_ttc = convertAmount(text, rate, "ht->ttc") ?? (text ? values.amount_ttc : null);
    setValues(next);
    setManual({ ...manual, ht: text.trim() !== "" });
  }

  /** Tape le TTC : le HT suit, s'il n'a pas été tapé lui-même. */
  function changeTTC(text: string) {
    const next = { ...values, amount_ttc: text || null };
    if (!manual.ht) next.amount_ht = convertAmount(text, rate, "ttc->ht") ?? (text ? values.amount_ht : null);
    setValues(next);
    setManual({ ...manual, ttc: text.trim() !== "" });
  }

  /** Change le taux : le montant calculé se recalcule depuis celui qu'on a tapé. */
  function changeRate(text: string) {
    const next = { ...values, vat_rate: text || null };
    if (manual.ttc && !manual.ht) {
      next.amount_ht = convertAmount(ttc, text, "ttc->ht") ?? values.amount_ht;
    } else if (!manual.ttc) {
      next.amount_ttc = convertAmount(ht, text, "ht->ttc") ?? values.amount_ttc;
    }
    setValues(next);
  }

  const coherent = amountsAgree(ht, ttc, rate);

  return (
    <Dialog open={quote !== null || project !== null} onOpenChange={close}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {quote
              ? `Modifier ${quote.reference || "le devis"}`
              : project
                ? `Nouveau devis — ${project.label}`
                : "Nouveau devis"}
          </DialogTitle>
        </DialogHeader>

        <form
          id="quote-form"
          className="grid max-h-[70vh] gap-4 overflow-y-auto px-0.5 sm:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (illisible || !(await create.run())) return;
            onOpenChange(false);
            onSaved();
          }}
        >
          {create.error && (
            <div className="sm:col-span-2">
              <ErrorNotice message={create.error} />
            </div>
          )}
          <TextField
            label="Référence"
            placeholder="DE2026-0092"
            value={values.reference}
            error={create.fields.reference}
            onChange={(event) => setValues({ ...values, reference: event.target.value })}
          />
          <SelectField
            label="Type"
            options={toOptions(QUOTE_KIND)}
            value={values.kind}
            onValueChange={(value) => setValues({ ...values, kind: value as QuotePayload["kind"] })}
          />
          <TextField
            label="Intitulé"
            wrapperClassName="sm:col-span-2"
            placeholder="sondages + étude + travaux"
            value={values.label}
            onChange={(event) => setValues({ ...values, label: event.target.value })}
          />

          {/*
            Les trois montants sur une ligne : le taux entre les deux, parce
            que c'est lui qui passe de l'un à l'autre.
          */}
          <div data-demo="quote-vat" className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
            <TextField
              label="Montant HT"
              inputMode="decimal"
              placeholder="8 050,00"
              value={ht}
              error={errors.ht ?? create.fields.amount_ht}
              hint={!manual.ht && ht ? "Calculé du TTC" : undefined}
              onChange={(event) => changeHT(event.target.value)}
            />
            {/*
              Le taux se tape, il ne se choisit pas dans une liste : c'est à
              l'entreprise de le dire, et un devis peut porter un taux qu'aucune
              liste n'aurait prévu. Vide, rien ne se calcule — on n'invente pas
              une TVA.
            */}
            <TextField
              id="quote-vat-rate"
              label="TVA (%)"
              inputMode="decimal"
              placeholder="20"
              value={rate}
              error={errors.rate ?? create.fields.vat_rate}
              onChange={(event) => changeRate(event.target.value)}
            />
            <TextField
              label="Montant TTC"
              inputMode="decimal"
              placeholder="9 660,00"
              value={ttc}
              error={errors.ttc ?? create.fields.amount_ttc}
              hint={
                !coherent
                  ? "Le HT et le taux ne donnent pas ce TTC : l'un des trois est à vérifier."
                  : !manual.ttc && ttc
                    ? "Calculé du HT"
                    : undefined
              }
              onChange={(event) => changeTTC(event.target.value)}
            />
          </div>

          <TextField
            label="Date du devis"
            type="date"
            value={values.issued_at ?? ""}
            onChange={(event) => setValues({ ...values, issued_at: event.target.value || null })}
          />
          <SelectField
            label="Statut"
            options={toOptions(QUOTE_STATUS)}
            value={values.status}
            onValueChange={(value) =>
              setValues({ ...values, status: value as QuotePayload["status"] })
            }
          />
          {/*
            L'émetteur ne se propose que pour **corriger** : à la création, le
            serveur le déduit de la nature de la prestation. C'est le devis qui
            porte le SIREN et la TVA, donc c'est là que l'erreur se répare.
          */}
          {quote && (
            <SelectField
              label="Société qui émet"
              options={toOptions(QUOTE_ISSUER)}
              value={values.issuer ?? ""}
              onValueChange={(value) => setValues({ ...values, issuer: value || null })}
            />
          )}
          <SelectField
            label="Acompte"
            options={toOptions(PAYMENT_STATUS)}
            value={values.deposit_status}
            onValueChange={(value) =>
              setValues({ ...values, deposit_status: value as QuotePayload["deposit_status"] })
            }
          />
          {/* Pas d'acompte, pas de montant : le serveur l'efface de lui-même. */}
          {values.deposit_status !== "non_applicable" && (
            <TextField
              label="Montant de l'acompte"
              hint="Ce que le client a réglé, s'il l'a changé"
              inputMode="decimal"
              placeholder="2 400"
              value={values.deposit_amount ?? ""}
              error={errors.deposit}
              onChange={(event) =>
                setValues({ ...values, deposit_amount: event.target.value || null })
              }
            />
          )}
          <SelectField
            label="Solde"
            options={toOptions(PAYMENT_STATUS)}
            value={values.balance_status}
            onValueChange={(value) =>
              setValues({ ...values, balance_status: value as QuotePayload["balance_status"] })
            }
          />
          {/* Pas de solde, pas de montant : le serveur l'efface de lui-même. */}
          {values.balance_status !== "non_applicable" && (
            <TextField
              label="Montant du solde"
              data-demo="quote-balance-amount"
              hint="Ce que le client a réglé, avenant ou remise compris"
              inputMode="decimal"
              placeholder="5 600"
              value={values.balance_amount ?? ""}
              error={errors.balance}
              onChange={(event) =>
                setValues({ ...values, balance_amount: event.target.value || null })
              }
            />
          )}
          <TextField
            label="Montant non chiffré"
            hint="Pour les fourchettes : « 5000-6000 € »"
            value={values.amount_note}
            onChange={(event) => setValues({ ...values, amount_note: event.target.value })}
          />
          {/*
            Le commentaire voyageait déjà — la route remplace le devis entier —
            sans qu'aucun champ ne le montre : on l'écrasait sans le voir.
          */}
          <TextAreaField
            label="Commentaire"
            data-demo="quote-comment"
            wrapperClassName="sm:col-span-2"
            className="min-h-16"
            placeholder="Remise accordée, conditions particulières…"
            value={values.comment}
            onChange={(event) => setValues({ ...values, comment: event.target.value })}
          />
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Annuler
          </Button>
          <Button form="quote-form" type="submit" disabled={create.pending || illisible}>
            {quote ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
