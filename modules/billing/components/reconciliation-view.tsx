"use client";

import { BankReconciliation } from "@/modules/customers";

/**
 * Facturation → Rapprochement : les relevés des comptes de l'entreprise,
 * confrontés aux encaissements du CRM (migration 114). Réel, pas simulé, et
 * dans le périmètre du compte — un compte lié à une société ne lit que les
 * relevés de ses comptes bancaires.
 */
export function ReconciliationView() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-base font-semibold">Rapprochement bancaire</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Chaque crédit d&apos;un relevé répond à un virement du CRM, ou dit pourquoi il n&apos;en a pas.
        </p>
      </header>
      <BankReconciliation />
    </div>
  );
}
