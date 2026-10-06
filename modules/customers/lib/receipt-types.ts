/**
 * L'encaissement complet (29/09) : les comptes crédités, les parts d'un
 * virement qui ne règlent aucune pièce, et celles qui attendent leur
 * affectation.
 */

/** Un compte de l'entreprise sur lequel un virement tombe (migration 104). */
export type BankAccount = {
  id: string;
  label: string;
  /** La société titulaire, quand on la sait. */
  issuer: string | null;
  iban_last4: string | null;
  /** Un compte fermé ne se propose plus, mais les virements passés le nomment. */
  active: boolean;
};

/**
 * Une part de virement qui ne règle aucune pièce du CRM.
 *
 * `pending` la distingue : vraie, l'argent réglera une pièce plus tard et
 * s'affecte (« Affecter… ») ; fausse, c'est une part hors CRM, qui n'en réglera
 * jamais — la facture de l'autre société, un trop-perçu.
 */
export type PaymentPart = {
  id: string;
  group_id: string;
  /** Nulle pour un encaissement dont le payeur n'est pas reconnu. */
  customer_id: string | null;
  customer_name: string;
  paid_at: string;
  amount: string;
  label: string;
  reference: string;
  method: string;
  source_link: string;
  note: string;
  pending: boolean;
  bank_account_id: string | null;
  bank_account_label: string;
};

/** Une part d'affectation : quelle pièce, combien. */
export type AllocationPayload = { quote_id: string; amount: string };

/**
 * Un encaissement tel qu'on le lit sur le relevé. Ce que les parts ne couvrent
 * pas du total attend son affectation, sous `pending_label`.
 */
export type ReceiptPayload = {
  total: string;
  paid_at: string;
  reference?: string;
  note?: string;
  customer_id?: string | null;
  bank_account_id?: string | null;
  allocations: AllocationPayload[];
  pending_label?: string;
};

/** Un avoir sur une facture. Sans montant, il annule tout ce qu'elle porte encore. */
export type CreditNotePayload = {
  reference: string;
  amount_ttc?: string | null;
  issued_at?: string | null;
  label?: string;
};
