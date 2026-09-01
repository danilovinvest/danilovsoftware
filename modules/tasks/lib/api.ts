import { apiFetch, type Paginated } from "@/shared/api/client";
import type {
  Colleague,
  Task,
  TaskFilters,
  TaskPayload,
  TaskStats,
  TaskStatus,
} from "./types";

export function listTasks(filters: TaskFilters, signal?: AbortSignal) {
  return apiFetch<Paginated<Task>>("/v1/tasks", {
    query: {
      search: filters.search,
      status: filters.status,
      assignee_id: filters.assignee_id,
      customer_id: filters.customer_id,
      due: filters.due,
      sort: filters.sort,
      page: filters.page,
      per_page: filters.per_page,
    },
    signal,
  });
}

export function getStats(assigneeId?: string, signal?: AbortSignal) {
  return apiFetch<TaskStats>("/v1/tasks/stats", {
    query: { assignee_id: assigneeId },
    signal,
  });
}

export function createTask(payload: TaskPayload) {
  return apiFetch<Task>("/v1/tasks", { method: "POST", body: payload });
}

export function updateTask(id: string, payload: TaskPayload) {
  return apiFetch<Task>(`/v1/tasks/${id}`, { method: "PATCH", body: payload });
}

/** Bascule isolée : cocher une tâche ne réécrit pas le reste de sa fiche. */
export function setTaskStatus(id: string, status: TaskStatus) {
  return apiFetch<Task>(`/v1/tasks/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export function deleteTask(id: string) {
  return apiFetch<void>(`/v1/tasks/${id}`, { method: "DELETE" });
}

/**
 * Déplace une carte : colonne et rang. Le rang est calculé par l'appelant
 * entre les deux voisines de destination — voir positionBetween.
 */
export function moveTask(id: string, status: TaskStatus, position: number) {
  return apiFetch<Task>(`/v1/tasks/${id}/move`, {
    method: "PATCH",
    body: { status, position },
  });
}

export function setTaskAssignee(id: string, assigneeId: string | null) {
  return apiFetch<Task>(`/v1/tasks/${id}/assignee`, {
    method: "PATCH",
    body: { assignee_id: assigneeId },
  });
}

/** Annuaire des collègues assignables, accessible à tout compte connecté. */
export function listColleagues(signal?: AbortSignal) {
  return apiFetch<{ items: Colleague[] }>("/v1/directory/users", { signal });
}
