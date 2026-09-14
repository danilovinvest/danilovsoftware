/**
 * Ce que chaque écran confierait à Claude, et ce qu'il pourrait lui demander.
 *
 * Le module est **pur** et ne dépend d'aucun autre module : les écrans lui
 * passent des faits simples — un nom, des comptes, un statut déjà traduit — et
 * il rend un contexte. S'il importait les types des fiches ou des chantiers,
 * ces modules ne pourraient plus l'importer à leur tour.
 *
 * Les suggestions décrivent des gestes que le CRM sait déjà faire à la main :
 * lire un devis, rattacher un courriel, cocher un jalon. Quand une suggestion
 * écrirait, elle dit **où**, et l'écriture passera toujours par une validation.
 */

export type ClaudeContextItem = { label: string; detail: string };

export type ClaudePrompt = {
  label: string;
  detail: string;
  /** Ce que la suggestion modifierait dans le CRM, après validation. */
  writes?: string;
};

export type ClaudeContext = {
  /** De quoi l'on parle, en une ligne. */
  subject: string;
  items: ClaudeContextItem[];
  prompts: ClaudePrompt[];
};

function count(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n > 1 ? plural : singular}`;
}

export function customerContext(input: {
  name: string;
  reference: string;
  projects: number;
  quotes: number;
  documents: number;
  contacts: number;
  interactions: number;
  mail: boolean;
}): ClaudeContext {
  return {
    subject: `La fiche ${input.name}`,
    items: [
      { label: "Fiche", detail: `${input.name} · ${input.reference}, coordonnées et interlocuteurs (${input.contacts})` },
      { label: "Affaires", detail: `${count(input.projects, "affaire")}, leur frise et leurs jalons` },
      { label: "Devis et factures", detail: `${count(input.quotes, "pièce")}, dont ${input.documents} avec leur PDF OneDrive` },
      { label: "Historique", detail: count(input.interactions, "échange") },
      ...(input.mail ? [{ label: "Courriels", detail: "Les messages rattachés à la fiche, corps compris" }] : []),
    ],
    prompts: [
      {
        label: "Faire le point sur ce client",
        detail: "Où en sont ses affaires, ce qu'il attend, ce qui traîne.",
      },
      {
        label: "Enrichir la fiche",
        detail: "Chercher téléphone, adresse, interlocuteurs et adresse de chantier dans les courriels et les devis.",
        writes: "Les coordonnées et les interlocuteurs de la fiche",
      },
      {
        label: "Mettre à jour le suivi",
        detail: "Relire courriels et documents pour cocher ce qui a eu lieu : RDV, devis envoyé, acompte, PV.",
        writes: "La frise et les jalons des affaires",
      },
      {
        label: "Préparer la prochaine relance",
        detail: "Un message qui reprend l'historique, à relire avant envoi.",
      },
    ],
  };
}

export function projectContext(input: {
  label: string;
  stage: string;
  site: string;
  quotes: number;
  documents: number;
  interactions: number;
}): ClaudeContext {
  return {
    subject: `L'affaire « ${input.label} »`,
    items: [
      { label: "Affaire", detail: `${input.label} · ${input.stage}${input.site ? ` · ${input.site}` : ""}` },
      { label: "Devis et factures", detail: `${count(input.quotes, "pièce")}, dont ${input.documents} avec leur PDF` },
      { label: "Chronologie", detail: count(input.interactions, "échange") },
      { label: "Frise et jalons", detail: "Acompte, date de chantier, matériaux, PV, avis" },
    ],
    prompts: [
      {
        label: "Où en est-on, que faire ?",
        detail: "La prochaine action, et ce qui la bloque.",
      },
      {
        label: "Suivre l'affaire depuis ses pièces",
        detail: "Lire devis, factures et courriels pour cocher les crans franchis et poser les dates.",
        writes: "La frise, les jalons et la date de chantier",
      },
      {
        label: "Compléter l'affaire",
        detail: "Type d'intervention, type de bien, adresse du chantier, d'après le devis.",
        writes: "Le type, le bien et l'adresse de l'affaire",
      },
    ],
  };
}

export function quoteContext(input: {
  reference: string;
  kind: string;
  document: string;
  amount: string | null;
  invoice: boolean;
}): ClaudeContext {
  const piece = input.invoice ? "La facture" : "Le devis";
  return {
    subject: `${piece} ${input.reference || input.kind}`,
    items: [
      { label: piece, detail: `${input.reference || "sans référence"} · ${input.kind}` },
      {
        label: "Document",
        detail: input.document ? `${input.document}, lu depuis OneDrive` : "Aucun PDF au dossier",
      },
      { label: "Montant connu", detail: input.amount ?? "Aucun, le montant n'a jamais été saisi" },
    ],
    prompts: [
      {
        label: input.invoice ? "Lire la facture" : "Lire le devis",
        detail: "Référence, date, montants HT et TTC, taux de TVA, prestations.",
        writes: "Les montants, la date et la TVA de la pièce",
      },
      {
        label: "Retrouver l'acompte",
        detail: "Le montant demandé sur le devis, et s'il apparaît payé sur une facture.",
        writes: "Le statut et le montant de l'acompte",
      },
      {
        label: "Comparer aux révisions",
        detail: "Ce qui a changé depuis le devis précédent de la même affaire.",
      },
    ],
  };
}

export function mailContext(input: {
  subject: string;
  from: string;
  customer: string | null;
}): ClaudeContext {
  return {
    subject: `Le courriel « ${input.subject || "sans objet"} »`,
    items: [
      { label: "Message", detail: `De ${input.from}, corps et pièces jointes` },
      { label: "Fil", detail: "Les réponses du même échange" },
      { label: "Fiche", detail: input.customer ?? "Aucune : le message n'est rattaché à personne" },
    ],
    prompts: input.customer
      ? [
          {
            label: "Qu'est-ce que le client demande ?",
            detail: "En deux lignes, et ce qu'il faut lui répondre.",
          },
          {
            label: "Enrichir la fiche",
            detail: "Téléphone, adresse de chantier, interlocuteurs cités dans le message.",
            writes: `La fiche ${input.customer}`,
          },
          {
            label: "Créer la suite",
            detail: "Une tâche ou un rendez-vous d'après ce qui est convenu.",
            writes: "Les tâches ou l'agenda",
          },
        ]
      : [
          {
            label: "À quelle fiche le rattacher ?",
            detail: "Proposer la fiche concernée d'après le nom, l'adresse et le chantier cités.",
            writes: "Le rattachement du message",
          },
          {
            label: "Créer la fiche",
            detail: "Nom, téléphone et adresse lus dans le message, à valider.",
            writes: "Une nouvelle fiche prospect",
          },
        ],
  };
}

export function customerMailContext(input: { total: number }): ClaudeContext {
  return {
    subject: "Les courriels de la fiche",
    items: [{ label: "Courriels", detail: `${count(input.total, "message")} rattachés, corps compris` }],
    prompts: [
      { label: "Résumer les échanges", detail: "Ce qui a été demandé, promis et envoyé, dans l'ordre." },
      { label: "Qu'attend le client ?", detail: "Les questions restées sans réponse." },
      {
        label: "Enrichir la fiche",
        detail: "Coordonnées, interlocuteurs et adresse de chantier trouvés dans les messages.",
        writes: "Les coordonnées et les interlocuteurs de la fiche",
      },
    ],
  };
}

export function worksitesContext(input: {
  etudes: boolean;
  total: number;
  alerts: number;
}): ClaudeContext {
  const what = input.etudes ? "étude" : "chantier";
  return {
    subject: input.etudes ? "Les études en cours" : "Les chantiers en cours",
    items: [
      { label: input.etudes ? "Études" : "Chantiers", detail: `${count(input.total, what)}, dates, devis et factures` },
      { label: "Listes de travail", detail: `${count(input.alerts, "affaire")} signalées` },
    ],
    prompts: [
      {
        label: "Faire le point de la semaine",
        detail: input.etudes
          ? "Ce qui est en production, ce qui est rendu, ce qui attend l'acompte."
          : "Ce qui démarre, ce qui est en retard, ce qui attend une date.",
      },
      {
        label: "Mettre à jour le suivi",
        detail: "Relire factures et courriels récents pour cocher acomptes, PV et soldes.",
        writes: "Les jalons et les acomptes des affaires",
      },
      { label: "Préparer les relances", detail: "Les acomptes et soldes à réclamer, un message par client." },
    ],
  };
}

export function worksiteContext(input: {
  customer: string;
  label: string;
  status: string;
  etudes: boolean;
  quotes: number;
  invoices: number;
  depositReceived: boolean;
}): ClaudeContext {
  return {
    subject: `${input.etudes ? "L'étude" : "Le chantier"} ${input.customer}`,
    items: [
      { label: input.etudes ? "Étude" : "Chantier", detail: `${input.label} · ${input.status}` },
      { label: "Pièces", detail: `${count(input.quotes, "devis", "devis")}, ${count(input.invoices, "facture")}` },
      { label: "Acompte", detail: input.depositReceived ? "Encaissé" : "Pas encore encaissé" },
      { label: "Jalons", detail: "Dates, matériaux, plans, PV et avis" },
    ],
    prompts: [
      { label: "Qu'est-ce qui manque ?", detail: "Ce qui bloque la suite, et qui doit agir." },
      {
        label: "Lire les factures du dossier",
        detail: "Retrouver acompte et solde facturés, avec leurs montants.",
        writes: "L'acompte et le solde du devis",
      },
      { label: "Rédiger un point d'avancement", detail: "Un message au client, à relire avant envoi." },
    ],
  };
}

export function dashboardContext(input: { relances: number; blocked: number }): ClaudeContext {
  return {
    subject: "Le tableau de bord",
    items: [
      { label: "Relances", detail: `${count(input.relances, "devis", "devis")} en attente de réponse` },
      { label: "Signé, bloqué", detail: `${count(input.blocked, "affaire")} qui attendent autre chose` },
      { label: "Agenda et tâches", detail: "Les rendez-vous et les tâches du jour" },
    ],
    prompts: [
      { label: "Mon brief du jour", detail: "Les trois choses à faire en premier, et pourquoi." },
      { label: "Qui relancer aujourd'hui ?", detail: "Les devis les plus chauds, avec un mot pour chacun." },
      { label: "Où dort l'argent ?", detail: "Acomptes et soldes à encaisser, du plus gros au plus petit." },
    ],
  };
}
