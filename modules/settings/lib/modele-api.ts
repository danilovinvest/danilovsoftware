import { apiFetch } from "@/shared/api/client";

/**
 * Le modèle de fiche : ce que l'entreprise appelle une fiche complète.
 *
 * Les **contrôles sont du code** : ils tournent en SQL sur toute la base d'un
 * coup, et une condition libre écrite depuis un écran serait une porte
 * d'injection autant qu'un piège d'entretien. Ce qui se règle ici, c'est
 * lesquels s'appliquent, comment ils se disent, dans quel ordre, et lesquels
 * sont obligatoires.
 */
export type Critere = {
  code: string;
  libelle: string;
  actif: boolean;
  /**
   * Un critère facultatif se montre et se compte, mais ne rend pas la fiche
   * incomplète. Exiger un SIRET d'un particulier ferait de la moitié du
   * fichier un chantier permanent.
   */
  obligatoire: boolean;
  ordre: number;
};

export function listCriteres(signal?: AbortSignal) {
  return apiFetch<Critere[]>("/v1/fiche-criteres", { signal });
}

/** Le code ne s'écrit pas : il désigne un contrôle que le serveur sait exécuter. */
export function setCritere(
  code: string,
  patch: Partial<Pick<Critere, "libelle" | "actif" | "obligatoire" | "ordre">>,
) {
  return apiFetch<Critere>(`/v1/fiche-criteres/${code}`, { method: "PUT", body: patch });
}
