/**
 * Le texte confié à Claude, et les deux adresses qui l'ouvrent.
 *
 * Module **pur** : ni React, ni `window`. L'ouverture elle-même, qui dépend de
 * l'appareil, vit dans `open-claude.ts`.
 *
 * **Le CRM ne parle pas à Claude, il lui passe la main.** Le bouton ouvre une
 * conversation neuve dans l'application Claude, la demande déjà écrite, et
 * c'est Claude qui va lire le CRM par le connecteur MCP de la personne — avec
 * ses droits à elle, pas avec ceux du CRM. Le texte doit donc dire **quel
 * connecteur** employer (« avec le MCP CRM », toujours, mot pour mot : sans
 * cela Claude répond de mémoire) et **quel objet** ouvrir, par les noms et les
 * références qu'on lit à l'écran et par les identifiants que les outils du
 * connecteur prennent.
 */
import type { ClaudeContext, ClaudePrompt } from "./contexts";

/** La phrase qui fait passer Claude par le connecteur. Elle ne se reformule pas. */
export const MCP_PHRASE = "avec le MCP CRM";

/**
 * La longueur maximale du paramètre `q`, **une fois encodé**.
 *
 * Claude tronque vers quatorze mille caractères ; un accent en coûte six une
 * fois encodé, et un lien trop long se perd en route sur certains systèmes.
 * Six mille laisse une marge large pour un texte qui en fait rarement mille.
 */
export const MAX_ENCODED_PROMPT = 6000;

export type ClaudeLinks = {
  /** Le schéma de l'application de bureau (macOS, Windows, Linux). */
  app: string;
  /** L'adresse web : l'application mobile quand elle est installée, sinon claude.ai. */
  web: string;
};

const WRITE_RULE =
  "Avant toute écriture, annonce exactement ce que tu vas modifier et attends ma validation.";

/**
 * La demande écrite pour Claude.
 *
 * Sans `demand`, c'est « Ouvrir dans Claude » : une prise de connaissance, puis
 * Claude attend la question — il ne décide pas seul de ce qu'on voulait.
 */
export function buildPrompt(context: ClaudeContext, demand?: ClaudePrompt): string {
  const lines = [
    `Travaille ${MCP_PHRASE} (le connecteur de notre CRM OMPT) et ouvre ${context.target}.`,
  ];
  if (demand) {
    lines.push(`Ma demande : ${demand.label} — ${demand.detail}`);
    if (demand.writes) {
      const writes = demand.writes.charAt(0).toLowerCase() + demand.writes.slice(1);
      lines.push(`Cela modifierait : ${writes}. ${WRITE_RULE}`);
    }
  } else {
    lines.push(
      "Lis ce que le CRM en dit, résume-moi où on en est et ce qui manque, puis attends ma question.",
    );
  }
  if (context.items.length > 0) {
    lines.push(
      `À l'écran : ${context.items.map((item) => `${item.label} — ${item.detail}`).join(" ; ")}.`,
    );
  }
  if (!demand) lines.push(WRITE_RULE);
  return capPrompt(lines.join("\n\n"));
}

/**
 * Raccourcit un texte trop long pour un lien, sans couper un caractère en deux.
 *
 * Le début du texte est ce qui compte — le connecteur, l'objet, la demande —
 * et c'est donc la fin qui part.
 */
export function capPrompt(text: string, max = MAX_ENCODED_PROMPT): string {
  if (encodeURIComponent(text).length <= max) return text;
  const chars = Array.from(text);
  let low = 0;
  let high = chars.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = `${chars.slice(0, mid).join("")}…`;
    if (encodeURIComponent(candidate).length <= max) low = mid;
    else high = mid - 1;
  }
  return `${chars.slice(0, low).join("")}…`;
}

/** Les deux adresses documentées par Anthropic pour ouvrir une conversation pré-remplie. */
export function claudeLinks(prompt: string): ClaudeLinks {
  const q = encodeURIComponent(capPrompt(prompt));
  return {
    app: `claude://claude.ai/new?q=${q}`,
    web: `https://claude.ai/new?q=${q}`,
  };
}

/**
 * Un téléphone ou une tablette, où seule l'adresse web ouvre l'application.
 *
 * Un iPad récent se présente comme un Mac : c'est l'écran tactile qui le trahit.
 */
export function isMobileAgent(userAgent: string, maxTouchPoints = 0): boolean {
  if (/iPhone|iPad|iPod|Android/i.test(userAgent)) return true;
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}
