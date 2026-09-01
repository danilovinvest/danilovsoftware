/**
 * URL de base de l'API Go. Exposée au navigateur : toutes les requêtes du CRM
 * partent du client, car le refresh token vit dans un cookie httpOnly posé par
 * l'API et n'est pas lisible depuis un Server Component.
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8080";
