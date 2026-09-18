#!/usr/bin/env bash
# Publier une version : scripts/release.sh 0.2.0
#
# Écrit la version là où elle vit (package.json, que lit tauri.conf.json, et
# Cargo.toml pour que les deux ne se contredisent pas), commite, étiquette et
# pousse. C'est l'étiquette qui déclenche .github/workflows/release.yml :
# construction macOS + Windows, signature, publication.
set -euo pipefail

version="${1:-}"
if ! [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "usage : scripts/release.sh X.Y.Z" >&2
  exit 1
fi

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [ "$(git branch --show-current)" != "main" ]; then
  echo "Une version se publie depuis main." >&2
  exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "L'arbre de travail n'est pas propre : commitez d'abord." >&2
  exit 1
fi
git fetch --quiet origin main --tags
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "main n'est pas à jour avec origin/main." >&2
  exit 1
fi
if git rev-parse -q --verify "refs/tags/v$version" >/dev/null; then
  echo "L'étiquette v$version existe déjà." >&2
  exit 1
fi

current="$(jq -r .version package.json)"
# Une version ne recule jamais : l'application installée ne se mettrait pas à
# jour vers un numéro plus petit que le sien.
if [ "$(printf '%s\n%s\n' "$current" "$version" | sort -V | tail -1)" != "$version" ] \
  || [ "$current" = "$version" ]; then
  echo "La version $version n'est pas plus récente que $current." >&2
  exit 1
fi

tmp="$(mktemp)"
jq --arg v "$version" '.version = $v' package.json > "$tmp" && mv "$tmp" package.json
# La première ligne `version =` seulement : celle du paquet, pas d'une dépendance.
perl -0pi -e "s/^version = \"[^\"]*\"/version = \"$version\"/m" src-tauri/Cargo.toml
(cd src-tauri && cargo update --quiet --workspace --offline 2>/dev/null || cargo update --quiet --workspace)

git add package.json src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit --quiet -m "chore(release): v$version"
git tag -a "v$version" -m "OMPT CRM v$version"
git push --quiet origin main "v$version"

echo "v$version poussée. Suivi : gh run watch \$(gh run list --workflow release.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
