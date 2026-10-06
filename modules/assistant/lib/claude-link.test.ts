import { describe, expect, test } from "bun:test";
import {
  MAX_ENCODED_PROMPT,
  MCP_PHRASE,
  buildPrompt,
  capPrompt,
  claudeLinks,
  isMobileAgent,
} from "./claude-link";
import {
  customerContext,
  dashboardContext,
  mailContext,
  projectContext,
  quoteContext,
  worksiteContext,
} from "./contexts";

/*
  Le bouton Claude ouvre l'application sur une demande déjà écrite. Deux choses
  ne se négocient pas : la demande dit toujours « avec le MCP CRM » — sans quoi
  Claude répond de mémoire au lieu de lire le CRM — et le lien reste assez court
  pour ne pas être tronqué en route.
*/

const fiche = customerContext({
  id: "7419530d-fbb2-4937-aaf5-2403b315f71b",
  name: "Mme Théuwissen",
  reference: "CLI-0042",
  projects: 2,
  quotes: 3,
  documents: 2,
  contacts: 1,
  interactions: 12,
  mail: true,
});

const contexts = [
  fiche,
  projectContext({
    id: "p-1",
    reference: "STR-2026-0148",
    label: "Ouverture de mur porteur",
    stage: "Devis",
    site: "Nice",
    quotes: 1,
    documents: 1,
    interactions: 3,
  }),
  quoteContext({ reference: "DE2026-0144", kind: "Étude", document: "", amount: null, invoice: false }),
  mailContext({ subject: "Re: devis", from: "Archi", customer: null }),
  worksiteContext({
    customer: "SDC Meynadier",
    label: "Reprise",
    status: "Planifié",
    etudes: false,
    quotes: 1,
    invoices: 0,
    depositReceived: false,
  }),
  dashboardContext({ relances: 4, blocked: 2, overdue: 0 }),
];

describe("buildPrompt", () => {
  test("dit toujours « avec le MCP CRM », avec ou sans demande", () => {
    for (const context of contexts) {
      expect(buildPrompt(context)).toContain(MCP_PHRASE);
      for (const demand of context.prompts) expect(buildPrompt(context, demand)).toContain(MCP_PHRASE);
    }
    expect(MCP_PHRASE).toBe("avec le MCP CRM");
  });

  test("nomme l'objet par son nom, sa référence et son identifiant", () => {
    const prompt = buildPrompt(fiche);
    expect(prompt).toContain("« Mme Théuwissen »");
    expect(prompt).toContain("CLI-0042");
    expect(prompt).toContain("7419530d-fbb2-4937-aaf5-2403b315f71b");
    expect(buildPrompt(contexts[1])).toContain("STR-2026-0148");
    expect(buildPrompt(contexts[2])).toContain("DE2026-0144");
  });

  test("porte la demande choisie, et la règle de validation quand elle écrit", () => {
    const writing = fiche.prompts.find((prompt) => prompt.writes);
    const reading = fiche.prompts.find((prompt) => !prompt.writes);
    if (!writing || !reading) throw new Error("la fiche doit suggérer une lecture et une écriture");
    const written = buildPrompt(fiche, writing);
    expect(written).toContain(writing.label);
    expect(written).toContain(`Cela modifierait : ${writing.writes?.toLowerCase().slice(0, 12)}`);
    expect(written).toContain("attends ma validation");
    expect(buildPrompt(fiche, reading)).not.toContain("Cela modifierait");
  });

  test("n'invente pas de parenthèse vide quand l'écran n'a pas d'identifiant", () => {
    expect(buildPrompt(contexts[3])).not.toContain("()");
    expect(buildPrompt(contexts[3])).toContain("« Re: devis »");
  });
});

describe("claudeLinks", () => {
  test("rend le schéma de bureau et l'adresse web, avec le même texte encodé", () => {
    const prompt = buildPrompt(fiche, fiche.prompts[0]);
    const links = claudeLinks(prompt);
    expect(links.app.startsWith("claude://claude.ai/new?q=")).toBe(true);
    expect(links.web.startsWith("https://claude.ai/new?q=")).toBe(true);
    const q = new URL(links.web).searchParams.get("q");
    expect(q).toBe(prompt);
    expect(decodeURIComponent(links.app.slice("claude://claude.ai/new?q=".length))).toBe(prompt);
    expect(links.web).not.toContain(" ");
    expect(links.web).not.toContain("&q");
  });

  test("encode ce qui casserait une adresse : &, #, ?, retours à la ligne", () => {
    const prompt = "a & b # c ? d\n\ne = f + g";
    expect(new URL(claudeLinks(prompt).web).searchParams.get("q")).toBe(prompt);
  });
});

describe("capPrompt", () => {
  test("laisse passer un texte court", () => {
    expect(capPrompt("court")).toBe("court");
  });

  test("raccourcit un texte trop long sous la limite, en gardant le début", () => {
    const long = `Travaille ${MCP_PHRASE} ${"é".repeat(5000)}😀${"x".repeat(5000)}`;
    const capped = capPrompt(long);
    expect(encodeURIComponent(capped).length).toBeLessThanOrEqual(MAX_ENCODED_PROMPT);
    expect(capped.startsWith(`Travaille ${MCP_PHRASE}`)).toBe(true);
    expect(capped.endsWith("…")).toBe(true);
    const q = new URL(claudeLinks(long).web).searchParams.get("q") ?? "";
    expect(q.length).toBeGreaterThan(100);
    expect(claudeLinks(long).web.length).toBeLessThan(14000);
  });

  test("ne coupe jamais un caractère en deux", () => {
    const capped = capPrompt("😀".repeat(3000), 100);
    expect(() => encodeURIComponent(capped)).not.toThrow();
  });
});

describe("isMobileAgent", () => {
  test("reconnaît iOS, Android, et l'iPad qui se dit Mac", () => {
    expect(isMobileAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe(true);
    expect(isMobileAgent("Mozilla/5.0 (Linux; Android 15; Pixel 9)")).toBe(true);
    expect(isMobileAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe(true);
  });

  test("laisse les ordinateurs au schéma de bureau", () => {
    expect(isMobileAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0)).toBe(false);
    expect(isMobileAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(false);
  });
});
