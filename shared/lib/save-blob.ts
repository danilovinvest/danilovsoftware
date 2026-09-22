/**
 * Enregistrer sur l'ordinateur un fichier déjà reçu par `fetch`.
 *
 * Un lien direct vers l'API ne porte pas le jeton d'accès : le fichier est donc
 * téléchargé par le CRM, puis confié au navigateur par une adresse `blob:` et
 * un lien `download` éphémère. L'adresse est révoquée juste après — pas dans la
 * même tâche, certains navigateurs abandonnant le téléchargement dont on retire
 * la source trop tôt.
 *
 * L'application de bureau a sa propre version de ce fichier : sa webview ne
 * sait pas toujours enregistrer un fichier (`canSaveFiles`).
 */
export const canSaveFiles = true;

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
