import { read } from "./derive";
import type { ReadWorksite, Worksite } from "./types";

/**
 * Un chantier complet pour les tests, tous champs à leur valeur vide : chaque
 * test ne pose que ce qu'il regarde, sans tricher sur le type.
 */
export function worksiteFixture(over: Partial<Worksite> = {}): Worksite {
  return {
    id: "",
    label: "",
    stage: "gagne",
    outcome: "",
    outcome_note: "",
    notes: "",
    customer_id: "",
    customer_reference: "",
    customer_name: "",
    owner_name: "",
    site_address: "",
    site_postal_code: "",
    city: "",
    started_at: null,
    finished_at: null,
    closed_at: null,
    created_at: "",
    last_interaction_at: null,
    rib_sent_at: null,
    insurance_sent_at: null,
    materials_ordered_at: null,
    scope: null,
    manager_id: null,
    engineer_id: null,
    drafter_id: null,
    materials: [],
    resume_at: null,
    plans_sent_at: null,
    review_requested_at: null,
    review_received_at: null,
    pv_sent_at: null,
    pv_signed_at: null,
    visit_report_sent_at: null,
    survey_report_sent_at: null,
    reference: "",
    mission: null,
    issuer: null,
    promised_at: null,
    internal_deadline_at: null,
    calc_started_at: null,
    calc_done_at: null,
    plans_started_at: null,
    plans_review_at: null,
    corrections_at: null,
    final_ready_at: null,
    report_written_at: null,
    report_validated_at: null,
    report_sent_at: null,
    survey_done_at: null,
    contact_at: null,
    rdv_at: null,
    quote_sent_at: null,
    negotiation_at: null,
    negotiation_note: "",
    signed_at: null,
    quotes: [],
    ...over,
  };
}

/** Le même, lu à un instant donné comme l'écran le lit. */
export function readFixture(over: Partial<Worksite> = {}, now = Date.parse("2026-10-01")): ReadWorksite {
  return read(worksiteFixture(over), now);
}
