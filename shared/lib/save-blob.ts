/**
 * Enregistrer sur l'ordinateur un fichier déjà reçu par `fetch`.
 *
 * **L'application ne le sait pas encore**, et le dit. Le CRM web confie le
 * fichier au navigateur par une adresse `blob:` et un lien `download` ; la
 * webview de macOS n'a, elle, aucun gestionnaire de téléchargement tant que la
 * coque n'en déclare pas (`on_download` côté Rust), et le clic ne produirait
 * rien. Plutôt qu'un bouton muet, les écrans lisent `canSaveFiles` et
 * expliquent la limite ; les PDF et les images, eux, s'ouvrent dans l'aperçu.
 *
 * Même surface que la version web (`crm/apps/shared/lib/save-blob.ts`), pour
 * que les modules restent identiques d'un dépôt à l'autre.
 */
export const canSaveFiles = false;

export function saveBlob(blob: Blob, filename: string): void {
  void blob;
  throw new Error(`L'application ne sait pas encore enregistrer « ${filename} » sur l'ordinateur.`);
}
