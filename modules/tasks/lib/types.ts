/**
 * Les quatre états d'une tâche.
 *
 * « En attente » n'est pas « en cours » : une tâche qui attend un document du
 * client n'avance pas, et la compter comme avançante fausse la charge de
 * travail que le responsable vient lire.
 */
export type TaskStatus = "a_faire" | "en_cours" | "en_attente" | "terminee";

/** L'urgence, à trois niveaux. « Normale » est le défaut. */
export type TaskPriority = "basse" | "normale" | "haute";

/**
 * Collègue assignable. Le type vit dans le transverse : trois modules le lisent
 * pour la même question, « à qui je confie ça ».
 */
export type { Colleague } from "@/shared/api/directory";

/** Filtres d'échéance servis par l'API — jamais recalculés côté navigateur. */
export type DueFilter = "overdue" | "today" | "week" | "none";

/**
 * Ce qu'une tâche vise : une fiche client ou une affaire, jamais les deux.
 *
 * Quand c'est une affaire, `owner_id` nomme la fiche dont elle relève. Sans
 * elle, une tâche rattachée à un chantier affichait une étiquette qui n'ouvrait
 * rien, et la rouvrir ne savait plus de quel client il s'agissait.
 */
export type TaskTarget = {
  id: string;
  customer_id: string | null;
  project_id: string | null;
  label: string;
  reference: string;
  /** La fiche d'une cible « affaire ». Nulle quand la cible est la fiche. */
  owner_id: string | null;
  owner_name: string;
};

export type Task = {
  id: string;
  title: string;
  body: string;
  status: TaskStatus;
  due_at: string | null;
  completed_at: string | null;
  position: number;
  assignee_id: string | null;
  assignee_name: string;
  targets: TaskTarget[];
  /** Calculé par le serveur : l'horloge d'un poste ne décide pas du retard. */
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
};

export type TaskStats = {
  by_status: Array<{ status: TaskStatus; total: number }>;
  overdue: number;
};

export type TaskFilters = {
  search?: string;
  status?: TaskStatus[];
  /** "mine" est résolu côté serveur en l'identifiant de l'appelant. */
  assignee_id?: string;
  customer_id?: string;
  due?: DueFilter;
  sort?: "recent" | "due" | "position";
  page?: number;
  per_page?: number;
};

export type TaskTargetPayload = {
  customer_id?: string | null;
  project_id?: string | null;
};

export type TaskPayload = {
  title: string;
  body: string;
  status: TaskStatus;
  due_at: string | null;
  assignee_id: string | null;
  targets: TaskTargetPayload[];
};
