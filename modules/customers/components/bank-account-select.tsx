"use client";

import { STABLE, useCached } from "@/shared/api/cache";
import { SelectField } from "@/shared/ui/form";
import { listBankAccounts } from "../lib/receipts-api";
import type { BankAccount } from "../lib/receipt-types";

const NONE: BankAccount[] = [];

/**
 * Les comptes de l'entreprise, lus une fois : ils changent au rythme où l'on
 * ouvre un compte en banque.
 */
export function useBankAccounts(): BankAccount[] {
  const { data } = useCached(
    "receipts:bank-accounts",
    () => listBankAccounts(),
    STABLE,
  );
  return data ?? NONE;
}

/**
 * « Compte crédité » (migration 104) : le relevé où retrouver le virement.
 *
 * Le solde de Theuwissen est tombé sur le sous-compte 3 de GROUPE, et rien ne
 * permettait de le dire. Facultatif — « non renseigné » reste une réponse —, et
 * un compte fermé ne se propose plus, sauf s'il est déjà celui du virement.
 */
export function BankAccountSelect({
  value,
  onChange,
  disabled,
  label = "Compte crédité",
  emptyLabel = "Non renseigné",
  className,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
  label?: string;
  /** Ce que dit le champ tant qu'aucun compte n'est choisi. */
  emptyLabel?: string;
  className?: string;
}) {
  const accounts = useBankAccounts();
  const options = accounts
    .filter((account) => account.active || account.id === value)
    .map((account) => ({ value: account.id, label: account.label }));
  return (
    <SelectField
      label={label}
      options={options}
      value={value ?? ""}
      onValueChange={(next) => onChange(next === "" ? null : next)}
      emptyLabel={emptyLabel}
      placeholder={emptyLabel}
      disabled={disabled}
      wrapperClassName={className}
    />
  );
}
