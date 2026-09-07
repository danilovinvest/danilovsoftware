import type { Tone } from "@/modules/customers";
import type { ArticleStatus } from "./types";

type Entry<T extends string> = Record<T, { label: string; tone: Tone }>;

export const ARTICLE_STATUS: Entry<ArticleStatus> = {
  a_rediger: { label: "À rédiger", tone: "neutral" },
  brouillon: { label: "Brouillon", tone: "warning" },
  a_relire: { label: "À relire", tone: "info" },
  publie: { label: "Publié", tone: "success" },
};

export const STATUS_ORDER: ArticleStatus[] = [
  "a_rediger",
  "brouillon",
  "a_relire",
  "publie",
];

/** Tonalité d'un taux de complétude : sous 60 %, l'article n'est pas publiable. */
export function completenessTone(rate: number): Tone {
  if (rate === 100) return "success";
  if (rate >= 60) return "info";
  if (rate > 0) return "warning";
  return "neutral";
}
