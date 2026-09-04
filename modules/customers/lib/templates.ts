/**
 * Les gabarits de relance.
 *
 * Relancer sans savoir pourquoi le client ne signe pas, c'est renvoyer le même
 * message à quelqu'un qui hésite sur le prix et à quelqu'un qui attend son
 * financement. Le motif vient donc d'abord, et c'est lui qui choisit le texte.
 *
 * Le motif est **enregistré** avec la relance, en résumé de l'interaction : au
 * troisième message on veut pouvoir dire « il bloque sur le prix depuis juin »,
 * ce qu'aucune date de relance ne dira jamais.
 *
 * Le rendu des `{{variables}}` reprend celui des automatisations — un
 * remplacement, rien de plus. Ni condition, ni boucle : elles n'ont rien à
 * faire dans un champ de saisie. Une variable inconnue reste écrite telle
 * quelle, on voit dans le texte ce qui n'a pas été compris.
 */

export type RelanceMotive =
  | "sans_reponse"
  | "prix"
  | "autre_devis"
  | "reporte"
  | "financement"
  | "autre";

export type Template = {
  key: RelanceMotive;
  /** Ce que l'utilisateur choisit. */
  label: string;
  /** Ce que ça veut dire, sous le choix. */
  hint: string;
  subject: string;
  body: string;
};

export const RELANCE_TEMPLATES: Template[] = [
  {
    key: "sans_reponse",
    label: "Sans réponse",
    hint: "Le devis est parti, le client n'a rien dit",
    subject: "Votre devis {{devis}} — {{affaire}}",
    body: `Bonjour {{client}},

Nous vous avons transmis le {{date_devis}} notre devis {{devis}} pour {{affaire}}, d'un montant de {{montant}}.

Sans retour de votre part, je me permets de revenir vers vous. Le devis reste valable et je reste disponible pour en reprendre les postes avec vous, par téléphone ou sur place.

Avez-vous besoin d'un élément complémentaire pour vous décider ?

Bien cordialement,
{{signature}}`,
  },
  {
    key: "prix",
    label: "Question de prix",
    hint: "Il trouve le montant élevé",
    subject: "Votre devis {{devis}} — reprenons le chiffrage",
    body: `Bonjour {{client}},

Vous nous avez fait part de votre réserve sur le montant de notre devis {{devis}} ({{montant}}), transmis le {{date_devis}}.

Le chiffrage se décompose poste par poste, et plusieurs d'entre eux peuvent être ajustés sans toucher à la tenue de l'ouvrage : phasage, choix de matériaux, part que vous réalisez vous-même. C'est une discussion que nous avons régulièrement et qui aboutit souvent.

Pouvons-nous en parler cette semaine ?

Bien cordialement,
{{signature}}`,
  },
  {
    key: "autre_devis",
    label: "Compare d'autres devis",
    hint: "Il attend ou compare des propositions concurrentes",
    subject: "Votre devis {{devis}} — à votre disposition pour comparer",
    body: `Bonjour {{client}},

Vous comparez actuellement plusieurs propositions pour {{affaire}}, ce qui est légitime sur un ouvrage de cette nature.

Un point d'attention à la lecture des offres : la note de calcul, l'assurance décennale et la reprise en sous-œuvre ne figurent pas systématiquement dans les devis concurrents. Je peux vous aider à mettre les propositions en regard, sans engagement.

Notre devis {{devis}} du {{date_devis}} reste valable.

Bien cordialement,
{{signature}}`,
  },
  {
    key: "reporte",
    label: "Projet reporté",
    hint: "Changement de programme, il décale",
    subject: "Votre projet {{affaire}} — reprenons date",
    body: `Bonjour {{client}},

Vous nous aviez indiqué que le projet {{affaire}} était décalé. Notre devis {{devis}} du {{date_devis}} vous attend, et nous conservons votre dossier complet — étude, relevés, chiffrage.

Où en êtes-vous ? Si le calendrier se précise, il nous faut environ trois semaines entre votre accord et le démarrage, le temps de commander les matériaux.

Bien cordialement,
{{signature}}`,
  },
  {
    key: "financement",
    label: "Attente de financement",
    hint: "Prêt, assurance, copropriété ou subvention",
    subject: "Votre devis {{devis}} — pièces pour votre financement",
    body: `Bonjour {{client}},

Vous êtes dans l'attente d'un financement pour {{affaire}}. Notre devis {{devis}} du {{date_devis}}, d'un montant de {{montant}}, reste valable le temps de vos démarches.

Si votre organisme réclame des pièces complémentaires — note de calcul, attestation d'assurance décennale, échéancier de paiement — dites-le-moi, je vous les transmets sous quarante-huit heures.

Bien cordialement,
{{signature}}`,
  },
  {
    key: "autre",
    label: "Autre motif",
    hint: "Vous écrivez le message",
    subject: "Votre devis {{devis}} — {{affaire}}",
    body: `Bonjour {{client}},

Concernant notre devis {{devis}} du {{date_devis}} pour {{affaire}},

Bien cordialement,
{{signature}}`,
  },
];

export const TEMPLATE_BY_MOTIVE = new Map(RELANCE_TEMPLATES.map((t) => [t.key, t]));

/** Les variables offertes, telles qu'affichées sous le champ. */
export const RELANCE_VARIABLES: Array<{ name: string; description: string }> = [
  { name: "client", description: "Le nom de la fiche" },
  { name: "affaire", description: "L'intitulé de l'affaire" },
  { name: "devis", description: "La référence du devis" },
  { name: "montant", description: "Le montant du devis" },
  { name: "date_devis", description: "La date d'envoi du devis" },
  { name: "jours", description: "Jours écoulés depuis l'envoi" },
  { name: "signature", description: "Votre nom" },
];

/**
 * Remplace les `{{variables}}` par leur valeur.
 *
 * Une variable inconnue est laissée en place plutôt que vidée : un message
 * partant avec « {{montnat}} » écrit en toutes lettres se corrige, un message
 * partant avec un trou se remarque trop tard.
 */
export function render(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, name: string) => {
    const value = values[name.toLowerCase()];
    return value === undefined ? match : value;
  });
}
