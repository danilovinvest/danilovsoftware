/**
 * Sépare un courriel de la citation qu'il traîne.
 *
 * Dans une conversation, chaque réponse recopie toutes les précédentes : lue
 * message après message, la même phrase revenait six fois, et la réponse
 * d'une ligne se perdait sous trois écrans d'historique. La citation est donc
 * repliée — jamais effacée : un bouton la rend, parce qu'un client répond
 * parfois *dans* le texte cité.
 *
 * Trois formes reconnues, celles des messageries de l'entreprise et de ses
 * clients : l'en-tête de Gmail (« Le lun. 22 sept. 2026 à 10:00, … a écrit : »,
 * souvent coupé sur deux lignes), celui d'Outlook (« De : » suivi d'« Envoyé : »
 * ou « Date : »), et les lignes préfixées de « > ». Rien n'est replié quand la
 * partie propre serait vide : un transfert sans un mot resterait sinon muet.
 *
 * Module pur, sans React.
 */
export type SplitBody = { main: string; quoted: string };

const WROTE = /(a écrit|wrote)\s*:?\s*$/i;
const INTRO = /^\s*(le|on)\s/i;
const OUTLOOK_FROM = /^\s*(de|from)\s?:/i;
const OUTLOOK_NEXT = /^\s*(envoyé|sent|date|à|to)\s?:/i;
const ORIGINAL = /^\s*-{2,}\s*(message d'origine|original message|message transféré|forwarded message)/i;

function quoteStart(lines: string[]): number {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const joined = `${line} ${lines[index + 1] ?? ""}`;
    if (INTRO.test(line) && (WROTE.test(line) || WROTE.test(joined))) return index;
    if (ORIGINAL.test(line)) return index;
    if (OUTLOOK_FROM.test(line) && lines.slice(index + 1, index + 4).some((l) => OUTLOOK_NEXT.test(l))) {
      return index;
    }
    if (line.trimStart().startsWith(">") && lines.slice(index).every(isQuotedOrBlank)) return index;
  }
  return -1;
}

function isQuotedOrBlank(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === "" || trimmed.startsWith(">");
}

export function splitQuote(body: string): SplitBody {
  const lines = body.split("\n");
  const start = quoteStart(lines);
  if (start <= 0) return { main: body, quoted: "" };
  const main = lines.slice(0, start).join("\n").trimEnd();
  if (main.trim() === "") return { main: body, quoted: "" };
  return { main, quoted: lines.slice(start).join("\n") };
}
