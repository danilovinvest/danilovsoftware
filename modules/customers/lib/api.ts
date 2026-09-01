import { apiFetch, type Paginated } from "@/shared/api/client";
import type {
  Contact,
  ContactPayload,
  Customer,
  CustomerDetail,
  CustomerFilters,
  CustomerListItem,
  CustomerPayload,
  CustomerStats,
  Interaction,
  InteractionPayload,
  Project,
  ProjectPayload,
  Quote,
  QuotePayload,
} from "./types";

/** Toutes les requêtes du module passent par ici : un seul endroit à relire. */

export function listCustomers(filters: CustomerFilters, signal?: AbortSignal) {
  return apiFetch<Paginated<CustomerListItem>>("/v1/customers", {
    query: {
      search: filters.search,
      status: filters.status,
      source: filters.source,
      city: filters.city,
      owner_id: filters.owner_id,
      sort: filters.sort,
      page: filters.page,
      per_page: filters.per_page,
    },
    signal,
  });
}

export function getCustomer(id: string, signal?: AbortSignal) {
  return apiFetch<CustomerDetail>(`/v1/customers/${id}`, { signal });
}

export function getStats(signal?: AbortSignal) {
  return apiFetch<CustomerStats>("/v1/customers/stats", { signal });
}

export function createCustomer(payload: CustomerPayload) {
  return apiFetch<Customer>("/v1/customers", { method: "POST", body: payload });
}

export function updateCustomer(id: string, payload: CustomerPayload) {
  return apiFetch<Customer>(`/v1/customers/${id}`, { method: "PATCH", body: payload });
}

export function deleteCustomer(id: string) {
  return apiFetch<void>(`/v1/customers/${id}`, { method: "DELETE" });
}

// --- Interlocuteurs ---------------------------------------------------------

export function createContact(customerId: string, payload: ContactPayload) {
  return apiFetch<Contact>(`/v1/customers/${customerId}/contacts`, {
    method: "POST",
    body: payload,
  });
}

export function updateContact(id: string, payload: ContactPayload) {
  return apiFetch<Contact>(`/v1/contacts/${id}`, { method: "PATCH", body: payload });
}

export function deleteContact(id: string) {
  return apiFetch<void>(`/v1/contacts/${id}`, { method: "DELETE" });
}

// --- Projets ----------------------------------------------------------------

export function createProject(customerId: string, payload: ProjectPayload) {
  return apiFetch<Project>(`/v1/customers/${customerId}/projects`, {
    method: "POST",
    body: payload,
  });
}

export function updateProject(id: string, payload: ProjectPayload) {
  return apiFetch<Project>(`/v1/projects/${id}`, { method: "PATCH", body: payload });
}

export function deleteProject(id: string) {
  return apiFetch<void>(`/v1/projects/${id}`, { method: "DELETE" });
}

// --- Devis ------------------------------------------------------------------

export function createQuote(projectId: string, payload: QuotePayload) {
  return apiFetch<Quote>(`/v1/projects/${projectId}/quotes`, {
    method: "POST",
    body: payload,
  });
}

export function updateQuote(id: string, payload: QuotePayload) {
  return apiFetch<Quote>(`/v1/quotes/${id}`, { method: "PATCH", body: payload });
}

export function deleteQuote(id: string) {
  return apiFetch<void>(`/v1/quotes/${id}`, { method: "DELETE" });
}

// --- Échanges ---------------------------------------------------------------

export function createInteraction(customerId: string, payload: InteractionPayload) {
  return apiFetch<Interaction>(`/v1/customers/${customerId}/interactions`, {
    method: "POST",
    body: payload,
  });
}

export function deleteInteraction(id: string) {
  return apiFetch<void>(`/v1/interactions/${id}`, { method: "DELETE" });
}
