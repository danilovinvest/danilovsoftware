import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Sortie autonome pour l'image Docker : Next produit un serveur qui embarque
   * seulement les dépendances réellement utilisées, au lieu d'exiger le
   * node_modules complet à l'exécution.
   */
  output: "standalone",
};

export default nextConfig;
