import {
  BuildingIcon,
  HandCoinsIcon,
  HouseIcon,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/modules/customers";
import type { EntityRole } from "@/modules/group";
import type { FlowKind, InvoiceKind, InvoiceStatus, Period } from "./types";

type Entry<T extends string> = Record<T, { label: string; tone: Tone }>;

/**
 * Statuts de facture.
 *
 * « Émise » reste neutre : une facture dans son délai de paiement n'est pas un
 * problème, et la peindre en orange rendrait l'écran illisible — il n'y aurait
 * plus de place pour signaler celles qui en sont un.
 */
export const INVOICE_STATUS: Entry<InvoiceStatus> = {
  brouillon: { label: "Brouillon", tone: "neutral" },
  emise: { label: "Émise", tone: "info" },
  partielle: { label: "Partiellement réglée", tone: "warning" },
  reglee: { label: "Réglée", tone: "success" },
  retard: { label: "En retard", tone: "danger" },
  avoir: { label: "Avoir", tone: "neutral" },
};

export const STATUS_ORDER: InvoiceStatus[] = [
  "retard",
  "partielle",
  "emise",
  "reglee",
  "brouillon",
  "avoir",
];

export const INVOICE_KIND: Record<InvoiceKind, string> = {
  etude: "Étude",
  sondages: "Sondages",
  travaux: "Travaux",
  attestation: "Attestation",
  loyer: "Loyer",
  honoraires: "Honoraires",
  commission: "Commission",
  refacturation: "Refacturation",
};

export const ENTITY_ROLE: Record<
  EntityRole,
  { label: string; tone: Tone; icon: LucideIcon }
> = {
  holding: { label: "Holding", tone: "info", icon: HandCoinsIcon },
  exploitation: { label: "Exploitation", tone: "success", icon: BuildingIcon },
  immobilier: { label: "Immobilier", tone: "warning", icon: HouseIcon },
};

export const FLOW_KIND: Record<FlowKind, { label: string; tone: Tone }> = {
  honoraires: { label: "Honoraires de direction", tone: "info" },
  loyer: { label: "Loyer", tone: "warning" },
  refacturation: { label: "Refacturation", tone: "neutral" },
};

export const PERIODS: Array<{ value: Period; label: string }> = [
  { value: "30j", label: "30 jours" },
  { value: "90j", label: "90 jours" },
  { value: "12m", label: "12 mois" },
];

/** Découpe un SIREN en trois groupes, comme le fait l'administration. */
export function formatSiren(siren: string): string {
  return siren.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
}

/** FR59844880039 → FR59 844 880 039, comme sur une facture. */
export function formatVat(vat: string): string {
  return vat.replace(/^(\w{2}\d{2})(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3 $4");
}
