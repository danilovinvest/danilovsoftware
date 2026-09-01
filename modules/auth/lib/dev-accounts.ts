/**
 * Comptes de démonstration pour basculer d'un rôle à l'autre sans retaper
 * d'identifiants.
 *
 * Le sélecteur n'existe que si `NEXT_PUBLIC_DEV_LOGIN` vaut "1" à la
 * compilation. Next remplace cette expression par une constante, si bien que
 * sans le drapeau le bloc entier — et la liste avec lui — est éliminé du
 * bundle : c'est une garantie de compilation, pas un test à l'exécution.
 *
 * Le drapeau est délibérément distinct de NODE_ENV : un serveur de recette
 * tourne en build de production tout en restant un environnement de travail.
 *
 * ATTENTION : là où le drapeau est actif, les identifiants sont lisibles dans
 * le JavaScript servi au navigateur. À n'activer que sur un déploiement dont
 * l'accès est déjà restreint.
 */
export type DevAccount = {
  email: string;
  password: string;
  label: string;
  role: string;
  hint: string;
};

/** Comptes de la base de développement locale (docker compose). */
const LOCAL_ACCOUNTS: DevAccount[] = [
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

export const DEV_LOGIN_ENABLED = process.env.NEXT_PUBLIC_DEV_LOGIN === "1";

/**
 * Liste servie au sélecteur. Un déploiement peut fournir la sienne via
 * NEXT_PUBLIC_DEV_ACCOUNTS (JSON) ; sans quoi on retombe sur les comptes
 * locaux. Un JSON illisible ne doit pas casser la page de connexion.
 */
export const DEV_ACCOUNTS: DevAccount[] = (() => {
  if (!DEV_LOGIN_ENABLED) return [];

  const raw = process.env.NEXT_PUBLIC_DEV_ACCOUNTS;
  if (!raw) return LOCAL_ACCOUNTS;

  try {
    const parsed = JSON.parse(raw) as DevAccount[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : LOCAL_ACCOUNTS;
  } catch {
    return LOCAL_ACCOUNTS;
  }
})();
