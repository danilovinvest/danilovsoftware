import type { NextConfig } from "next";
import pkg from "./package.json";

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
  // La version de l'application, envoyée à l'API sur chaque appel : c'est
  // elle que la version plancher de l'API compare (`X-App-Version`).
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
};

export default nextConfig;
