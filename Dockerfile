# syntax=docker/dockerfile:1

# --- Dépendances -------------------------------------------------------------
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- Compilation -------------------------------------------------------------
FROM oven/bun:1 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* est figé à la compilation : l'URL de l'API doit donc être
# connue ici, pas au démarrage du conteneur.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Raccourcis de connexion : réservés aux environnements de recette.
ARG NEXT_PUBLIC_DEV_LOGIN
ARG NEXT_PUBLIC_DEV_ACCOUNTS
ENV NEXT_PUBLIC_DEV_LOGIN=$NEXT_PUBLIC_DEV_LOGIN
ENV NEXT_PUBLIC_DEV_ACCOUNTS=$NEXT_PUBLIC_DEV_ACCOUNTS
ENV NEXT_TELEMETRY_DISABLED=1

# L'adresse interne de l'API, pour les seules réécritures des métadonnées OAuth
# (`next.config.ts`). Elle est lue **à la construction**, parce que la table des
# réécritures est figée dans l'image -- et elle n'est délibérément pas préfixée
# `NEXT_PUBLIC_` : rien de tout cela n'a à entrer dans le bundle du navigateur.
ARG CRM_INTERNAL_API_URL
ENV CRM_INTERNAL_API_URL=$CRM_INTERNAL_API_URL

# La version du bundle. Le bandeau la compare à celle de l'API : différentes,
# c'est qu'un déploiement a eu lieu depuis le chargement de la page.
ARG NEXT_PUBLIC_BUILD_COMMIT
ARG NEXT_PUBLIC_BUILT_AT
ENV NEXT_PUBLIC_BUILD_COMMIT=$NEXT_PUBLIC_BUILD_COMMIT
ENV NEXT_PUBLIC_BUILT_AT=$NEXT_PUBLIC_BUILT_AT

RUN bun run build

# --- Exécution ---------------------------------------------------------------
# La sortie « standalone » embarque le strict nécessaire : pas de node_modules
# complet dans l'image finale.
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
