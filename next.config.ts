import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Export statique, servi par la webview de l'application Tauri.
   *
   * Il n'y a plus de serveur Next : toutes les données partent déjà du
   * navigateur, et l'interface est un paquet de fichiers que l'application
   * embarque (`src-tauri/tauri.conf.json`, `frontendDist`). En contrepartie,
   * aucune route ne peut dépendre d'un paramètre inconnu à la compilation —
   * d'où les fiches en `?id=` (`shared/lib/routes.ts`).
   */
  output: "export",
  // Sans serveur, rien pour optimiser une image : le seul `next/image` du CRM
  // affiche déjà un blob tel quel.
  images: { unoptimized: true },
};

export default nextConfig;
