import { invoke } from "@tauri-apps/api/core";

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

/** Installe puis relance : la promesse ne se résout que si l'installation échoue. */
export function installUpdate(): Promise<void> {
  return invoke<void>("update_install");
}
