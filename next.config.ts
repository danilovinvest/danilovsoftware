import type { NextConfig } from "next";

/*
 * L'adresse interne de l'API, vue depuis le conteneur de l'interface.
 *
 * Elle ne sert qu'aux réécritures ci-dessous, donc **jamais depuis le
 * navigateur** : ce n'est pas une variable `NEXT_PUBLIC_`, et elle n'entre pas
 * dans le bundle. En développement, l'API écoute sur le port 8080 du poste.
 */
const API_INTERNE = process.env.CRM_INTERNAL_API_URL || "http://localhost:8080";

const nextConfig: NextConfig = {
  /*
   * Sortie autonome pour l'image Docker : Next produit un serveur qui embarque
   * seulement les dépendances réellement utilisées, au lieu d'exiger le
   * node_modules complet à l'exécution.
   */
  output: "standalone",

  /*
   * Les métadonnées de découverte OAuth, servies à la racine du domaine.
   *
   * **Elles doivent y être, et Caddy n'y envoie pas.** Un client OAuth dérive
   * l'adresse des métadonnées du serveur d'autorisation de son identifiant :
   * pour `https://hôte`, il ira chercher `https://hôte/.well-known/…`, et nulle
   * part ailleurs (RFC 8414). Or Caddy ne route vers l'API que `/v1/*`,
   * `/health` et `/mcp/*` — tout le reste arrive ici.
   *
   * Recopier les métadonnées en TypeScript aurait été plus court et faux : ce
   * document nomme les points d'entrée du serveur d'autorisation, et deux
   * exemplaires divergent au premier qu'on déplace. L'API reste donc la seule
   * source, et l'interface se contente de relayer.
   *
   * Le second chemin, avec `/mcp` en suffixe, est la forme que prend l'adresse
   * quand la ressource vit sous un chemin : les clients essaient l'une ou
   * l'autre selon leur lecture de la spécification, et servir les deux coûte
   * une ligne.
   */
  async rewrites() {
    return [
      {
        source: "/.well-known/oauth-protected-resource",
        destination: `${API_INTERNE}/v1/oauth/metadata/resource`,
      },
      {
        source: "/.well-known/oauth-protected-resource/mcp",
        destination: `${API_INTERNE}/v1/oauth/metadata/resource`,
      },
      {
        source: "/.well-known/oauth-authorization-server",
        destination: `${API_INTERNE}/v1/oauth/metadata/server`,
      },
      {
        source: "/.well-known/openid-configuration",
        destination: `${API_INTERNE}/v1/oauth/metadata/server`,
      },
    ];
  },
};

export default nextConfig;
