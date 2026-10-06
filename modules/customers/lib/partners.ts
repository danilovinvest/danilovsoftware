import { apiFetch } from "@/shared/api/client";
import type { CustomerKind, CustomerRelation, ProjectStage } from "./types";

/**
 * L'espace partenaires et prescripteurs (migration 113) : types miroirs de
 * l'API, appels, libellés.
 */

/** Un rôle qu'on pose sur une affaire. L'apporteur, unique, a sa propre route. */
export type PartnerRole = "prescripteur" | "intervenant" | "recommande";
/** Ce que l'espace d'un partenaire affiche : les rôles posés, plus l'apport. */
export type PartnerLink = PartnerRole | "apporteur";
export type PartnerState = "signee" | "perdue" | "en_cours";

export type ProjectPartner = {
  partner_id: string;
  partner_name: string;
  partner_kind: CustomerKind;
  role: PartnerRole;
  /** Ce que le client a réglé directement au partenaire, hors chiffre d'OMPT. */
  direct_fee: string | null;
  note: string;
};

export type ProjectPartnerPayload = Pick<ProjectPartner, "partner_id" | "role" | "direct_fee" | "note">;

export type PartnerProject = {
  project_id: string;
  label: string;
  customer_id: string;
  customer_name: string;
  roles: PartnerLink[];
  stage: ProjectStage;
  outcome: string;
  archived: boolean;
  state: PartnerState;
  date: string | null;
  market: string;
  invoiced: string;
  collected: string;
  direct_fee: string | null;
  note: string;
};

export type PartnerTotals = {
  /** Les affaires apportées ou prescrites, et ce qu'elles sont devenues. */
  brought: number;
  signed: number;
  lost: number;
  open: number;
  /** Signées sur tranchées, en pourcentage ; nul tant qu'aucune n'est tranchée. */
  conversion_rate: number | null;
  market: string;
  invoiced: string;
  collected: string;
  direct_fees: string;
  common: number;
  recommended: number;
};

export type PartnerSpace = { projects: PartnerProject[]; totals: PartnerTotals };

export type PartnerRank = {
  partner_id: string;
  partner_name: string;
  partner_kind: CustomerKind;
  totals: PartnerTotals;
};

export const PARTNER_LINK: Record<PartnerLink, { label: string; tone: "info" | "success" | "neutral" | "warning"; hint: string }> = {
  apporteur: { label: "Apportée", tone: "success", hint: "C'est lui qui a amené l'affaire." },
  prescripteur: { label: "Prescrite", tone: "info", hint: "Son étude ou son avis prescrit nos travaux." },
  intervenant: { label: "Projet commun", tone: "neutral", hint: "Il intervient sur le même chantier." },
  recommande: { label: "Recommandé", tone: "warning", hint: "C'est nous qui l'avons recommandé au client." },
};

export const PARTNER_ROLE_OPTIONS: Array<{ value: PartnerRole; label: string }> = [
  { value: "prescripteur", label: "Prescripteur — son étude prescrit nos travaux" },
  { value: "intervenant", label: "Intervenant — projet commun" },
  { value: "recommande", label: "Recommandé — par nous, au client" },
];

export const PARTNER_STATE: Record<PartnerState, { label: string; tone: "success" | "danger" | "neutral" }> = {
  signee: { label: "Signée", tone: "success" },
  perdue: { label: "Perdue", tone: "danger" },
  en_cours: { label: "En cours", tone: "neutral" },
};

/**
 * Une fiche a un espace partenaire quand elle prescrit, accompagne, apporte,
 * ou porte un rôle sur une affaire — quel que soit le type sous lequel elle
 * est encore rangée.
 */
export function hasPartnerSpace(customer: {
  relation: CustomerRelation;
  is_referrer: boolean;
  is_partner?: boolean;
}): boolean {
  return (
    customer.relation === "prescripteur" ||
    customer.relation === "partenaire_technique" ||
    customer.is_referrer ||
    customer.is_partner === true
  );
}

/** Ce qu'une ligne de partenaire dit en une phrase, sous l'affaire. */
export function partnerSummary(partners: ProjectPartner[], formatAmount: (value: string) => string): string {
  const byPartner = new Map<string, { name: string; parts: string[] }>();
  for (const partner of partners) {
    const entry = byPartner.get(partner.partner_id) ?? { name: partner.partner_name, parts: [] };
    const role = PARTNER_LINK[partner.role].label.toLowerCase();
    entry.parts.push(Number(partner.direct_fee) > 0 ? `${role}, ${formatAmount(partner.direct_fee ?? "0")} réglés en direct` : role);
    byPartner.set(partner.partner_id, entry);
  }
  return [...byPartner.values()].map((entry) => `${entry.name} (${entry.parts.join(" · ")})`).join(" · ");
}

export function getPartnerSpace(customerId: string, issuer?: string, signal?: AbortSignal) {
  const path = `/v1/customers/${customerId}/partner`;
  return apiFetch<PartnerSpace>(issuer ? `${path}?issuer=${encodeURIComponent(issuer)}` : path, { signal });
}

export function listPartnerRanking(issuer?: string, signal?: AbortSignal) {
  return apiFetch<PartnerRank[]>(issuer ? `/v1/partners?issuer=${encodeURIComponent(issuer)}` : "/v1/partners", {
    signal,
  });
}

export function listProjectPartners(projectId: string, signal?: AbortSignal) {
  return apiFetch<ProjectPartner[]>(`/v1/projects/${projectId}/partners`, { signal });
}

/** Remplace la liste entière ; rend les partenaires de l'affaire. */
export function setProjectPartners(projectId: string, partners: ProjectPartnerPayload[]) {
  return apiFetch<ProjectPartner[]>(`/v1/projects/${projectId}/partners`, { method: "PUT", body: { partners } });
}
