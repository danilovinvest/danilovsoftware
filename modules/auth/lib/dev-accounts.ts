/**
 * Comptes de démonstration, pour basculer d'un rôle à l'autre sans retaper
 * d'identifiants pendant le développement.
 *
 * Ces mots de passe sont ceux de la base de développement locale, créés par
 * l'amorçage et les tests — ils n'existent nulle part ailleurs. Le sélecteur
 * qui les utilise est enfermé dans une condition
 * `process.env.NODE_ENV === "development"` : Next remplace cette expression à
 * la compilation, si bien que le bloc entier — et donc cette liste — est
 * éliminé du bundle de production. C'est une garantie de compilation, pas une
 * simple vérification à l'exécution.
 */
export type DevAccount = {
  email: string;
  password: string;
  label: string;
  role: string;
  hint: string;
};

export const DEV_ACCOUNTS: DevAccount[] = [
  {
    email: "adm@danilov.local",
    password: "motdepasse-admin",
    label: "Dirigeant",
    role: "owner",
    hint: "Tout, y compris les rôles et la configuration",
  },
  {
    email: "marc@danilov.local",
    password: "motdepasse-marc0",
    label: "Administrateur",
    role: "admin",
    hint: "Le CRM et les comptes, pas la configuration",
  },
  {
    email: "charge.affaires@danilov.local",
    password: "motdepasse-charge",
    label: "Chargé d'affaires",
    role: "user",
    hint: "Ses fiches et ses devis, sans suppression",
  },
  {
    email: "dev@danilov.local",
    password: "motdepasse-initial",
    label: "Développeur",
    role: "developer",
    hint: "Compte technique de secours",
  },
];
