# CLAUDE.md

L'application de bureau du CRM OMPT — macOS et Windows. Décidée le 18/09/2026 :
l'interface du CRM web est **reprise telle quelle**, exportée en fichiers
statiques et servie par la webview du système ; une coque Rust (Tauri v2) fait
ce que la page ne peut pas faire seule. L'API reste dans le dépôt `crm`
(`crm/api`), qui ne porte plus que le serveur.

Le code, les identifiants et les commits sont en anglais ; les commentaires, les
libellés et la doctrine en français, comme dans `crm`.

**La doctrine de l'interface** — modules, thème, cycle d'une affaire, chantiers,
agenda, messagerie — vit encore dans `crm/CLAUDE.md`, sections « Architecture du
front » et suivantes. Elle y reste jusqu'à la coupure du CRM web ; ce fichier ne
dit que ce que l'application change.

## Commandes

```bash
bun install
cargo tauri dev                 # la coque + `bun run dev` sur :3000
cargo tauri build               # export statique (`out/`) puis paquets
cargo tauri build --debug --bundles app   # un .app de travail, plus rapide
bun run lint
cd src-tauri && cargo test && cargo clippy --all-targets
```

`OMPT_API_URL` et `OMPT_WEB_URL` fixent à la compilation l'API et le portail
(défaut : `https://testbeforeproduction.xyz`). **Un `cargo tauri dev` contre
l'API de production échoue au CORS** : la page y vit sur `http://localhost:3000`,
que la production n'admet pas. Deux chemins : une API locale
(`OMPT_API_URL=http://localhost:8080`), ou un `build --debug`, dont la page vit
sur `tauri://localhost`, que la production admet.

## Structure

- `app/`, `modules/`, `shared/`, `components/` — l'interface, reprise de
  `crm/apps` avec son historique (`git subtree split`, 349 commits).
- `shared/desktop/` — tout ce que l'interface doit à la coque : configuration,
  session, liens externes, retours du navigateur. **Aucun autre dossier
  n'importe `@tauri-apps/*`.**
- `src-tauri/` — la coque : `config.rs` (les deux adresses), `keychain.rs`,
  `session.rs`, `links.rs`, `lib.rs`.

## Ce que l'application change, et pourquoi

**Tout le CRM supposait « même origine », et l'application la perd.** Sa page
vit sur `tauri://localhost` (macOS) ou `http(s)://tauri.localhost` (Windows).
L'API admet ces origines au CORS depuis `crm@99ddcbd` — et **pas** parmi celles
des passkeys (`crm/api/internal/desktop`).

**Le refresh token est tenu par la coque, jamais par le JavaScript.** Le cookie
`crm_refresh` (`SameSite=Lax`) ne part pas depuis la webview. La coque appelle
`/v1/auth/desktop/*`, où le jeton voyage dans le corps, et le garde dans le
trousseau du système (`keyring`). La page ne reçoit que la session sans lui :
c'est ce que `HttpOnly` garantissait. Un verrou (`tokio::Mutex`) sérialise tout
ce qui lit ou écrit le jeton, et `refreshSession()` partage sa promesse — la
détection de rejeu de l'API révoquerait sinon toutes les sessions du compte.

**La passkey se pose dans le navigateur.** Aucune clé ne se signe pour
`tauri://localhost` : le RPID est l'apex. « Se connecter avec une clé d'accès »
ouvre `<portail>/connexion-app?challenge=…&state=…` ; la personne s'y
authentifie, **clique** pour autoriser l'application, et le navigateur rend la
main par `omptcrm://auth?code=…&state=…`. La coque vérifie l'état, échange le
code avec son secret PKCE, et annonce la session (`session://opened`). La page
du portail n'émet le code **qu'au clic** : un défi fourni par un tiers lierait
sinon un code au compte de la victime. Créer une clé suit le même chemin — un
lien d'enrôlement pour soi, en QR code ou ouvert dans le navigateur.

**N'importe quelle page web peut ouvrir un lien `omptcrm://`.** D'où deux gardes
dans `links.rs` : un retour de connexion n'est honoré que s'il répond à la
demande en cours, et `omptcrm://app/<chemin>` ne mène qu'à un chemin interne
(`/…`, jamais `//…`).

**Google et Microsoft se raccordent dans le navigateur.** Google refuse les
webviews. L'API scelle l'origine de la page dans l'état OAuth, et une origine de
webview revient en `omptcrm://app/settings/…` ; l'écran, resté ouvert, relit ses
comptes lui-même.

**Les fiches portent leur identifiant en paramètre.** Un export statique ne
connaît pas `/customers/<id>` : `customerHref(id)` et `automationHref(id)`
(`shared/lib/routes.ts`) sont les seuls endroits où ces adresses s'écrivent, et
`appHref` traduit l'ancienne forme que la recherche du serveur sert encore.

**La société ne se lit plus dans l'adresse.** Un compte lié garde la sienne ;
pour qui voit tout le groupe, le sélecteur de l'en-tête (`workspace-switcher`)
retient le choix sur le poste. Il remplace le bouton de retour au portail, qui
s'ouvre désormais dans le navigateur.

**Tout lien externe sort par le navigateur** (`interceptExternalLinks`, un seul
écouteur sur le document) : dans une webview, un `_blank` ne s'ouvre nulle part
et un lien ordinaire remplacerait l'interface sans barre d'adresse pour revenir.

**Les liens qu'on envoie pointent vers le portail** (`webUrl()`) : invitation,
enrôlement d'une clé. `window.location.origin` vaudrait `tauri://localhost`. Le
portail sert donc `/invitation/<jeton>` et `/cle/<jeton>` (`panel`, depuis le
18/09) ; le CRM web garde les siennes pour les liens déjà envoyés.

**La CSP est stricte, et une seule exception y est voulue.**
`dangerousDisableAssetCspModification: ["style-src"]` : sans elle, Tauri ajoute
un nonce à `style-src`, et un nonce annule `'unsafe-inline'` — les styles en
ligne de React et de Radix tomberaient. Les scripts, eux, restent hachés par
Tauri. L'adresse de l'API est écrite dans `connect-src` en plus de `config.rs` :
changer l'une impose de changer l'autre.

## Publier une version

```bash
scripts/release.sh 0.2.0     # depuis main, arbre propre, à jour avec origin
```

Le script écrit la version (`package.json`, que lit `tauri.conf.json`, et
`Cargo.toml`), commite, étiquette `v0.2.0` et pousse. L'étiquette déclenche
`.github/workflows/release.yml` : un brouillon de release, les paquets macOS
(universel, `.dmg` + archive de mise à jour) et Windows (NSIS `-setup.exe`) en
parallèle, puis la publication **seulement si les deux ont réussi**. Les notes
sont les commits depuis la version précédente ; réécrites sur la page de la
release, elles changent ce que l'avis de mise à jour affiche.

`.github/workflows/ci.yml` vérifie chaque poussée **sur Linux seulement** — le
dépôt est privé et une minute macOS y coûte dix minutes Linux. Une release
coûte de l'ordre de 250 minutes du forfait gratuit (2 000 par mois).

**Les mises à jour passent par l'API, parce que le dépôt est privé.**
L'application n'a aucun identifiant GitHub : elle interroge
`<API>/v1/desktop/update/latest.json`, que l'API relaie depuis la dernière
release publiée avec un jeton en lecture seule (`crm/api/internal/desktop/
releases.go`). `<API>/v1/desktop/install/{macos|windows}` renvoie vers
l'installateur du jour : c'est le lien à donner pour une première installation.

**Ce qui rend une mise à jour sûre, c'est la signature.** La clé privée vit
dans les secrets du dépôt (`TAURI_SIGNING_PRIVATE_KEY`,
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`) et dans `~/.tauri/ompt-crm.key` du poste
qui l'a créée ; la publique est dans `tauri.conf.json`. **La perdre, c'est ne
plus jamais pouvoir mettre à jour les applications installées** : elles
refuseraient toute version signée d'une autre clé. Elle se garde dans un
gestionnaire de mots de passe.

La coque cherche au démarrage puis toutes les quatre heures, et **n'impose
jamais la relance** (`shared/desktop/update-notice.tsx`) : elle ferait perdre
une saisie en cours. Une compilation de développement ne cherche rien.

**Sans certificat, les systèmes préviennent à la première installation** : sur
macOS le paquet est signé *ad hoc* (`signingIdentity: "-"`), il faut l'ouvrir
une fois par clic droit → Ouvrir ; Windows affiche SmartScreen (« Informations
complémentaires » → « Exécuter quand même »). Les mises à jour, elles, ne
déclenchent aucun avertissement : elles arrivent par la coque, pas par un
navigateur.

## Ce qui n'est pas fait

- Pas de certificat Apple ni Windows, donc pas de notarisation : les secrets
  `APPLE_CERTIFICATE`, `APPLE_ID`… lus par `tauri-action` suffiront à
  l'activer le jour où le compte Apple Developer existe. Les icônes sont
  encore celles de Tauri.
- `GET /v1/auth/sessions` reconnaît « cet appareil » au cookie : la ligne de
  l'application n'est jamais marquée courante.
- La visite guidée ne sait pas montrer l'écran de connexion (hors `AppShell`).

@AGENTS.md
