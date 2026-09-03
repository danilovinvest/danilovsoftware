import { apiFetch } from "@/shared/api/client";
import type { Automation, AutomationInput, Run, TelegramInfo } from "./types";

export function listAutomations(signal?: AbortSignal) {
  return apiFetch<{ items: Automation[]; telegram_ready: boolean }>("/v1/automations", {
    signal,
  });
}

/**
 * Le bot et les conversations qui lui ont écrit.
 *
 * Telegram ne garde ses mises à jour que vingt-quatre heures : la liste est
 * vide tant que personne n'a écrit au bot, et l'écran le dit plutôt que de
 * laisser croire à une panne.
 */
export function telegramInfo(signal?: AbortSignal) {
  return apiFetch<TelegramInfo>("/v1/automations/telegram", { signal });
}

export function getAutomation(id: string, signal?: AbortSignal) {
  return apiFetch<Automation>(`/v1/automations/${id}`, { signal });
}

export function createAutomation(input: Partial<AutomationInput>) {
  return apiFetch<Automation>("/v1/automations", { method: "POST", body: input });
}

export function saveAutomation(id: string, input: AutomationInput) {
  return apiFetch<Automation>(`/v1/automations/${id}`, { method: "PUT", body: input });
}

export function deleteAutomation(id: string) {
  return apiFetch<void>(`/v1/automations/${id}`, { method: "DELETE" });
}

/**
 * Déclenche une exécution et **attend** le résultat.
 *
 * C'est l'inverse du choix fait pour la synchronisation d'agenda : ici on
 * essaie, donc on veut savoir tout de suite si le message est parti et ce que
 * WhatsApp a répondu quand il ne part pas.
 */
export function runAutomation(id: string) {
  return apiFetch<{ sent: boolean }>(`/v1/automations/${id}/run`, { method: "POST" });
}

export function listRuns(automationId: string | null, limit = 40, signal?: AbortSignal) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (automationId) query.set("automation_id", automationId);
  return apiFetch<{ items: Run[] }>(`/v1/automations/runs?${query}`, { signal });
}
