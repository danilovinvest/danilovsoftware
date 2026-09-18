/**
 * Où joindre l'API Go.
 *
 * Toutes les requêtes du CRM partent de la page. Dans l'application de bureau,
 * la base est posée par la coque avant le premier script (`shared/desktop/
 * config.ts`) : c'est là qu'elle se lit, et nulle part ailleurs.
 */
export { apiBase, webUrl } from "@/shared/desktop/config";
