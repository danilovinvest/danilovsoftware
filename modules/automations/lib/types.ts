/**
 * Types du module « automatisations ».
 *
 * Une automatisation est un graphe de cartes et une expression cron. Le graphe
 * voyage tel quel jusqu'au serveur, positions comprises : la toile est la
 * représentation de vérité, et un enregistrement qui perdrait la disposition
 * obligerait à redessiner à chaque ouverture.
 */

export type NodeType = "schedule" | "calendar_digest" | "telegram";

export type NodeConfig = Record<string, unknown>;

export type AutomationNode = {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  config: NodeConfig;
};

export type AutomationEdge = { from: string; to: string };

export type Graph = {
  nodes: AutomationNode[];
  edges: AutomationEdge[];
};

export type Automation = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  /** Expression cron à cinq champs. */
  cron: string;
  time_zone: string;
  next_run_at: string | null;
  last_run_at: string | null;
  graph: Graph;
  run_count: number;
};

export type AutomationInput = {
  name: string;
  description: string;
  active: boolean;
  cron: string;
  time_zone: string;
  graph: Graph;
};

/** Une carte traversée pendant une exécution. */
export type RunStep = {
  node: string;
  type: string;
  ok: boolean;
  detail: string;
};

export type Run = {
  id: number;
  automation: string;
  started_at: string;
  finished_at: string | null;
  /** « programmee » ou « manuelle ». */
  origin: string;
  error: string;
  steps: RunStep[];
};

/* --- Configurations, par type de carte -------------------------------------- */

export type DigestConfig = {
  /** 1 pour demain, 0 pour aujourd'hui. */
  offset_days: number;
  calendar_ids: string[];
  /** Vide : une journée sans rendez-vous n'envoie rien. */
  empty_text: string;
};

export type TelegramConfig = {
  /** Identifiant de conversation. Un nombre, négatif pour un groupe. */
  chat_id: string;
  message: string;
  /** « texte » ou « HTML ». */
  parse_mode: "texte" | "HTML";
  /** Le message arrive, le téléphone ne sonne pas. */
  silent: boolean;
};

/** Le bot, et les conversations qui lui ont écrit récemment. */
export type TelegramInfo = {
  configured: boolean;
  bot?: { username: string; first_name: string };
  chats?: Array<{ id: string; title: string; kind: string }>;
  error?: string;
};
