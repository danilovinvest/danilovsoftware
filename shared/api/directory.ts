import { apiFetch } from "./client";

/**
 * L'annuaire des collègues assignables.
 *
 * Il vit dans le transverse et non dans un module, parce que trois modules le
 * lisent pour la même raison : savoir à qui confier quelque chose. Une tâche,
 * une affaire, demain un dossier de production. Le laisser chez les tâches
 * obligeait les fiches à passer par elles pour une question qui ne les concerne
 * pas.
 *
 * La route est ouverte à tout compte connecté, là où la liste des comptes exige
 * `users:read` qu'un chargé d'affaires n'a pas. Elle n'expose que
 * l'identifiant et le nom : ni rôle, ni adresse, ni dernière connexion.
 */
export type Colleague = {
  id: string;
  first_name: string;
  last_name: string;
  /** Le nom d'affichage, déjà composé par le serveur. */
  name: string;
};

export function listColleagues(signal?: AbortSignal) {
  return apiFetch<{ items: Colleague[] }>("/v1/directory/users", { signal });
}
