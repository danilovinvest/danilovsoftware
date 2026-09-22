import { Channel, invoke } from "@tauri-apps/api/core";

/**
 * Les mises à jour, demandées à la coque (`src-tauri/src/updates.rs`).
 *
 * La page ne télécharge rien et ne vérifie rien : la coque cherche, vérifie la
 * signature du paquet et l'installe. La page ne fait que dire qu'une version
 * attend, et laisser la personne choisir le moment de la relance.
 */
export type AvailableUpdate = {
  version: string;
  notes: string | null;
};

/** `null` quand l'application est à jour. */
export function checkForUpdate(): Promise<AvailableUpdate | null> {
  return invoke<AvailableUpdate | null>("update_check");
}

/**
 * Où en est le téléchargement (`Progress` dans `updates.rs`). `total` est nul
 * quand le serveur ne donne pas la taille : pas de pourcentage à inventer.
 * `finished` : les octets sont arrivés, restent la vérification de la
 * signature et l'installation.
 */
export type UpdateProgress =
  | { event: "downloading"; downloaded: number; total: number | null }
  | { event: "finished" };

/**
 * Installe puis relance : la promesse ne se résout que si l'installation échoue.
 * La progression arrive par un canal, au rythme d'un message par pour-cent.
 */
export function installUpdate(onProgress?: (progress: UpdateProgress) => void): Promise<void> {
  const channel = new Channel<UpdateProgress>(onProgress);
  return invoke<void>("update_install", { onProgress: channel });
}
