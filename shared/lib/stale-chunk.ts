/**
 * Une erreur née d'un script qui n'existe plus.
 *
 * Après chaque déploiement, les morceaux de script de la version précédente
 * disparaissent du serveur : une page ouverte avant la livraison qui change
 * d'écran demande un fichier introuvable et plante. Ce n'est pas une panne,
 * c'est une page périmée — la recharger suffit.
 */
export function isStaleChunk(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "ChunkLoadError" ||
    /Loading (CSS )?chunk|dynamically imported module|Importing a module script failed/i.test(
      error.message,
    )
  );
}

const CLE = "crm:rechargement-apres-livraison";

/**
 * Peut-on recharger ? Une fois par minute au plus : si la version fraîche
 * plante aussi, on montre l'erreur au lieu de boucler. Simple lecture.
 */
export function canReloadForStaleChunk(): boolean {
  try {
    return Date.now() - Number(sessionStorage.getItem(CLE) ?? 0) >= 60_000;
  } catch {
    // Sans stockage de session, on recharge quand même : c'est le cas courant.
    return true;
  }
}

/** Note le rechargement, puis recharge. */
export function reloadForStaleChunk(): void {
  try {
    sessionStorage.setItem(CLE, String(Date.now()));
  } catch {
    // Voir ci-dessus.
  }
  window.location.reload();
}
