/**
 * Régime de TVA par société. L'onglet finances du classeur « CYCLE CHANTIER »
 * les donne, société par société — mensuelle le 21 pour GROUPE, STRUCTURE et
 * NICE, trimestrielle pour DANILOV INVEST.
 *
 * C'est la seule donnée réelle du jeu de démonstration que l'écran a porté
 * jusqu'au 01/10 : les factures, elles, viennent désormais de la base.
 */
export const VAT_REGIME: Record<string, "mensuel" | "trimestriel"> = {
  "danilov-invest": "trimestriel",
  "ompt-structure": "mensuel",
  "ompt-groupe": "mensuel",
  "ompt-nice": "mensuel",
  "avenue-de-grasse": "trimestriel",
  "danilov-fonciere": "trimestriel",
};
