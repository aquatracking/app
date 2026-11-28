# Architecture

## Stack

| Couche | Choix | Pourquoi |
|---|---|---|
| Runtime | Node.js 26 LTS, pnpm | AdonisJS 7 demande Node 24 au minimum ; 26 est la LTS active. Version fixée dans `.node-version`, pnpm dans `packageManager` |
| Framework | AdonisJS 7, starter kit **Inertia + Vue** | Auth, validation, autorisations et typage fournis ; un seul projet à maintenir ([ADR 0001](adr/0001-monolithe-inertia-vue.md)) |
| Rendu | Inertia 3 + Vue 3, SSR activé | Pages serveur sans API à écrire, navigation SPA |
| UI | Tailwind + shadcn-vue, graphes shadcn-vue (Unovis) | Composants copiés dans le repo, cohérents entre eux |
| Listes triables | `vue-draggable-plus` (SortableJS) | Glisser-déposer aussi au toucher, pour l'ordre des mesures suivies |
| Base | PostgreSQL ≥ 16 via Lucid | Séries temporelles, `date_trunc`, fonctions de fenêtrage ([ADR 0002](adr/0002-postgresql-uuidv7.md)) |
| Fichiers | `@adonisjs/drive`, disque local | Images de vivarium hors base |
| Images | `sharp` | Redimensionnement et conversion WebP |
| Emails | `@adonisjs/mail`, SMTP **optionnel** | Instances sans SMTP supportées ([ADR 0003](adr/0003-invitation-sans-verification-email.md)) |
| Tests | Japa (`@japa/plugin-adonisjs`, client API, assertions Inertia) | Fourni par Adonis |

Les numéros de versions exacts des paquets sont fixés au moment du scaffolding (`npm init adonisjs@latest`) et suivis par `pnpm-lock.yaml`.

## Besoin → brique Adonis

On n'écrit pas ce que le framework fournit. Avant d'ajouter une abstraction, vérifier ce tableau.

| Besoin | Brique | Notes |
|---|---|---|
| Connexion, session, « se souvenir de moi » | `@adonisjs/auth` guard session + remember me tokens | `withAuthFinder` sur `User`. Session dans un cookie chiffré (store `cookie`), effacée à la fermeture du navigateur (`clearWithBrowser`) : voir la limite ci-dessous |
| Validation des entrées | VineJS, un validator par action | Messages traduits via i18n |
| « Ce vivarium est-il à moi ? » | Bouncer, `VivariumPolicy` | Aucun contrôle de propriété écrit à la main dans les contrôleurs |
| Réservé aux admins | Bouncer, `UserPolicy` / `InvitationPolicy` + middleware `admin` | Le middleware vérifie l'ability `administer` (`app/abilities/main.ts`). Un refus répond 403 avec la page `errors/forbidden`, formulaires compris |
| Forme des données envoyées aux pages | **Transformers** (`app/transformers/`) | Pas de DTO écrits à la main ; jamais de `serialize()` brut de modèle vers une page |
| Typage des props de page | Props Inertia générées par Adonis 7 | `inertia.render` est vérifié à la compilation |
| URLs | `urlFor` (serveur et client), routes nommées automatiquement `controller.method` | Jamais d'URL écrite en dur |
| Limitation de débit | `@adonisjs/limiter`, store **database** (PostgreSQL) | Connexion, mot de passe oublié, installation. Compteurs et historique des blocages dans la table `rate_limits` : ils survivent à un redémarrage et restent partagés si plusieurs instances tournent, sans ajouter Redis. Store `memory` en tests |
| Tokens à usage unique (invitation, reset) | Token aléatoire, **haché** en base | Voir [data-model](data-model.md) |
| Traductions | `@adonisjs/i18n` (serveur) + mêmes fichiers côté Vue | Un seul jeu de fichiers `resources/lang/{fr,en}/*.json`. Le client ne charge que la langue de la page (un chunk par langue), avant de la rendre, et jamais `emails.json` ni `validator.json`, utilisés seulement par le serveur (`inertia/composables/use_i18n.ts`) |
| Fichiers | Drive, disque `vivariums` local | Servis par un contrôleur protégé par la policy |
| Envois de fichiers | Bodyparser, `multipart.autoProcess` limité à une route | Voir [Envois de fichiers](#envois-de-fichiers) |
| Santé | Route `/health/live` seulement, servie par un contrôleur simple (`HealthChecksController`) qui répond 200 | Sonde de vivacité pour Docker et les orchestrateurs : elle dit seulement que le serveur HTTP répond, il n'y a rien à vérifier. La classe `HealthChecks` d'Adonis sert aux rapports de disponibilité (base, mémoire, disque), qu'on n'expose pas : pas de `/health/ready` public, son rapport expose des détails du serveur (versions, mémoire, disque) |
| Variables d'environnement | `start/env.ts`, `Env.schema` | Secrets en `Env.schema.secret()`. Le préfixe `file:` (Docker secrets) n'est résolu que dans un fichier `.env`, pas dans l'environnement du processus ([déploiement](deployment.md#secrets-dans-des-fichiers)) |
| Données de référence | Seeder idempotent du catalogue | Lancé à chaque démarrage, comme les migrations |
| Mise à jour en direct *(après 2.0)* | `@adonisjs/transmit` (SSE) + `router.reload({ only })` d'Inertia | Canal `vivariums/:id` autorisé par `VivariumPolicy` ; le serveur recalcule les props, aucune logique dupliquée côté client. Transport en mémoire pour une instance, Redis si plusieurs. Le reverse proxy doit désactiver le buffering sur la route SSE |

**Limite des sessions.** Le store `cookie` garde la session dans le navigateur, sans trace côté serveur : le serveur ne peut donc pas la révoquer. Avec `clearWithBrowser`, `@adonisjs/session` ne pose ni `Max-Age` ni `Expires` sur le cookie, et le cookie chiffré n'a aucune durée de validité. Seule la copie du navigateur disparaît à sa fermeture. Une copie du cookie, rejouée hors du navigateur ou gardée par la restauration de session du navigateur, reste valide **sans limite de durée**, tant que `APP_KEY` ne change pas. C'est vrai même après une déconnexion, une réinitialisation ou un changement de mot de passe : ces actions ne suppriment que des remember me tokens, qui sont en base. La déconnexion supprime celui de l'appareil courant, la réinitialisation tous, le changement de mot de passe ceux des autres appareils ([02](features/02-auth-profile.md)). L'option `age` de `config/session.ts` est sans effet avec `clearWithBrowser` et le store `cookie` : elle n'est donc pas renseignée. Choix assumé pour une instance auto-hébergée servie en HTTPS (cookie `HttpOnly`, `Secure`, `SameSite=Lax`) ; révoquer les sessions demanderait le store `database`.

### Envois de fichiers

- **Un seul motif de route lit les fichiers** : `/vivariums/:id/image` ([04](features/04-vivariums.md)), dont seul `PUT` attend un fichier. `multipart.autoProcess` de `config/bodyparser.ts` ne liste que ce motif ; il ne distingue pas les méthodes, donc un corps `multipart/form-data` envoyé en `DELETE` sur ce motif est lu aussi, et ses fichiers supprimés par le middleware ci-dessous. Sur tout autre motif, un corps `multipart/form-data` n'est pas lu : le corps de la requête est vide et aucun fichier n'est écrit. Une nouvelle route qui reçoit un fichier ajoute son motif à cette liste.
- **Limite de 16 Mo** pour l'ensemble des fichiers d'un corps `multipart/form-data` (`multipart.limit`, qui ne compte que les fichiers) : une image de 15 Mo au plus, avec une marge. Au-delà, la requête répond 413. Les champs texte sont limités à part, à 2 Mo (valeur par défaut de `maxFieldsSize` de multiparty, `multipart.fieldsLimit` n'étant pas renseigné). Le reverse proxy doit laisser passer au moins cette taille ([déploiement](deployment.md#https-et-reverse-proxy)).
- **Fichiers temporaires** : le bodyparser écrit le fichier dans le dossier temporaire du système (`os.tmpdir()`) avant shield (CSRF), l'authentification et la validation, et ne le supprime que si son écriture échoue. Le middleware `delete_uploaded_files_middleware`, placé juste avant le bodyparser dans `start/kernel.ts`, supprime les fichiers temporaires de la requête quand elle se termine, quelle qu'en soit l'issue (acceptée, refusée, en erreur, y compris un 413 levé par le bodyparser après un premier fichier reçu). Une suppression qui échoue est journalisée sans changer la réponse. Un service qui reçoit un fichier le lit sur place et ne le déplace pas.
- **Tests** : les tests qui envoient des fichiers les font écrire dans un dossier temporaire propre à chaque test (`useUploadDirectory`, `tests/helpers/uploads.ts`), qu'ils vérifient vide après la requête, puis suppriment.

## Organisation du code

Structure standard d'Adonis 7, fichiers créés avec `node ace make:*`. À l'intérieur des dossiers standards, on regroupe par domaine quand il y a plus de 3 fichiers.

```
app/
  abilities/main.ts              # abilities Bouncer hors policy
  catalog/measure_types.ts       # catalogue des types de mesure + mesures suivies par défaut
  catalog/timezones.ts           # liste des fuseaux acceptés
  controllers/
    setup_controller.ts
    health_checks_controller.ts  # /health/live
    auth/…                       # session, password_reset, registration
    profile_controller.ts
    admin/…                      # users, invitations
    vivariums_controller.ts
    vivarium_images_controller.ts
    tracked_measures_controller.ts
    measures_controller.ts       # relevé, historique, correction
    charts_controller.ts
  exceptions/                    # handler.ts, NotifiedException et une classe par erreur métier (code E_…)
  helpers/instants.ts            # instants et points de séries envoyés aux pages (ISO, UTC), partagés par les transformers
  mails/                         # invitation_notification, password_reset_notification
  models/                        # user, invitation, password_reset_token, vivarium, measure_type, tracked_measure, measure
    mixins/                      # with_uuid_v7, with_one_time_token
  policies/                      # vivarium_policy, user_policy, invitation_policy
  transformers/                  # une classe par forme de données exposée
  validators/                    # un fichier par ressource, un validator par action
    rules/                       # règles Vine propres au projet (fuseau, valeur de mesure, format d'image…)
  services/                      # opérations métier appelables hors HTTP, une classe par domaine :
                                 # setup, login, registration, invitation, password_reset, profile,
                                 # user_administration, vivarium, vivarium_image, tracked_measure,
                                 # reading, measure_series, measure_type_catalog
  middleware/                    # dont setup, admin, last_seen, delete_uploaded_files
inertia/
  pages/                         # un dossier par ressource, miroir des contrôleurs
  components/ui/                 # shadcn-vue (généré)
  components/                    # composants métier
  composables/                   # use_dates, use_i18n, use_measures, use_now, use_vivarium
  layouts/app.vue
database/
  migrations/
  seeders/catalog_seeder.ts
resources/lang/{fr,en}/
start/                           # routes, kernel (middleware), env, limiter, session, validator
tests/functional/<feature>/…
tests/helpers/
```

### Règles

- **Contrôleurs fins** : valider → autoriser → appeler le modèle ou un service → transformer → rendre ou rediriger. Pas de SQL brut dans un contrôleur.
- **Modèles** : colonnes, relations, *query scopes* et petites méthodes métier sur l'instance (`vivarium.isArchived`). Pas d'envoi d'email ni d'accès au conteneur depuis un modèle.
- **Services** : les **opérations métier** vivent dans des services appelables hors requête HTTP, car d'autres points d'entrée les appelleront (outils MCP, API capteurs, après 2.0). Sont concernés au minimum :
  - créer, modifier et supprimer un relevé (`ReadingService`) ;
  - calculer les dernières valeurs et les séries de graphes (`MeasureSeriesService`) ;
  - créer les mesures suivies par défaut d'un vivarium ;
  - archiver et désarchiver un vivarium, trouver la date locale de son premier relevé (`VivariumService`).

  Un service reçoit des données déjà validées (validators Vine) et l'utilisateur concerné, et non le `HttpContext`. L'autorisation reste faite par l'appelant avec les policies Bouncer, utilisables hors HTTP. Un simple CRUD sans règle (renommer un vivarium) peut rester dans le contrôleur. Pas de couche *repository* : Lucid en tient lieu.
- **Points d'entrée** : les contrôleurs, et plus tard les outils MCP et l'API capteurs, ne font que brancher validation, autorisation, service et transformer. Aucune règle métier ne doit exister dans un seul d'entre eux.
- **Un nom par concept** : celui de `CONTEXT.md`. Pas de synonymes dans le code ni les identifiants (`tank`, `biotope`, `setting`…). Dans l'interface, les libellés sont ceux que le glossaire donne : « bac » (fr) et « tank » (en) pour un vivarium, « paramètre » (« parameter ») pour un type de mesure ou une mesure suivie.
- **Erreurs métier** : exceptions Adonis nommées (`E_INVALID_INVITATION`…) traduites, rendues en messages flash.
- **Dates** : `DateTime` Luxon côté serveur, en UTC dans le code et en base. Conversion vers le **fuseau de l'utilisateur** (`user.timezone`) seulement pour l'affichage et l'interprétation des saisies. Jamais de décalage fixe : toujours un nom de zone IANA, pour que Luxon applique les changements d'heure de la date concernée.
- **Pas de code mort** : pas d'alias d'import, de dépendance ou de colonne sans usage. Exception : les alias `#…` du champ `imports` de `package.json` (`#models/*`, `#mails/*`, `#events/*`…) sont ceux du framework, utilisés par les commandes `node ace make:*` : ils restent même si le dossier n'existe pas encore.

## Rendu et formulaires

- Formulaires avec le composant `<Form>` d'Inertia et routes typées ; les erreurs de validation reviennent par session.
- Les messages de succès ou d'erreur métier passent par un flash `notification` partagé par le middleware Inertia, posé avec `session.notify(type, message)` (macro de `start/session.ts`). Un lien à usage unique généré par un administrateur (invitation, réinitialisation) passe par un flash `generatedLink`, seul moment où il est connu, posé avec `session.showLink(link)` (macro du même fichier).
- Données partagées à toutes les pages (`InertiaMiddleware`) : utilisateur courant (transformé), langue, fuseau de l'utilisateur, notification, `mailEnabled` et `now`, l'instant de la réponse. Les durées relatives (« il y a 3 h ») et la date du jour (âge d'un vivarium) se calculent à partir de `now` pendant le rendu SSR et l'hydratation, qui donnent ainsi le même texte ; une fois la page montée, elles suivent l'horloge du navigateur, rafraîchie chaque minute, y compris sur une page restaurée par un retour arrière sans requête (`useNow`, `inertia/composables/use_now.ts`).
- Les listes de valeurs que le serveur accepte (langues, fuseaux, kinds, types d'eau, climats) arrivent aux pages qui en ont besoin dans leurs props, depuis les constantes du serveur (`LOCALES`, `TIMEZONES`, `VIVARIUM_KINDS`…) : elles ne sont pas recopiées côté client.
- **Fuseau horaire** : stocké sur l'utilisateur. Les formulaires d'installation, d'inscription et de profil le font choisir dans une liste avec recherche, fournie par le serveur (`app/catalog/timezones.ts` : `UTC` et une entrée par zone géographique de `zone.tab` (IANA), sous le nom qu'il lui donne à une exception près (`America/Coral_Harbour`, voir [02](features/02-auth-profile.md#profil)), figée pour ne pas dépendre de la version d'ICU et rester reconnue par PostgreSQL ; c'est la liste que le validateur accepte). L'installation et l'inscription la préremplissent après montage avec `Intl.DateTimeFormat().resolvedOptions().timeZone`, ramené à l'entrée de la liste qui désigne la même zone, comme un nom enregistré qui n'est pas dans la liste ; le serveur refuse tout nom hors de la liste et l'enregistre. Rendu SSR et client utilisent ce même fuseau partagé : pas d'écart à l'hydratation. Pas de cookie ni de détection à chaque requête.
- Interface pensée **mobile d'abord** : le relevé se fait souvent devant le bac, téléphone en main.

## Environnement

| Variable | Obligatoire | Rôle |
|---|---|---|
| `APP_KEY` | oui | Chiffrement, signatures |
| `APP_URL` | oui | Construction des liens envoyés (invitations, reset) |
| `PORT`, `HOST`, `LOG_LEVEL` | non | Valeurs par défaut fournies |
| `TZ` | non | Fuseau du processus, `UTC` conseillé. N'a **aucun effet** sur l'affichage, qui suit le fuseau de chaque utilisateur |
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` | oui | PostgreSQL |
| `DB_PORT` | non | Port PostgreSQL (défaut `5432`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_SECURE` | non | Si `SMTP_HOST` est vide, l'envoi d'email est désactivé |
| `MAIL_FROM_ADDRESS` | si SMTP | Expéditeur. Le démarrage échoue si `SMTP_HOST` est renseigné sans elle |
| `MAIL_FROM_NAME` | non | Nom de l'expéditeur (défaut `AquaTracking`) |
| `TRUSTED_PROXIES` | si reverse proxy | Adresses des proxys de confiance (`trustProxy` d'Adonis), pour lire l'IP réelle du client dans `X-Forwarded-For`. Indispensable pour la limitation de débit derrière Traefik, Nginx, Caddy… |
| `DRIVE_ROOT` | non | Dossier des images (défaut `storage/`), à monter en volume Docker |
| `SESSION_DRIVER` | non | Stockage des sessions : `cookie` (défaut) ou `memory` (tests) |
| `LIMITER_STORE` | non | Store du limiter : `database` (défaut) ou `memory` (tests) |

## Démarrage et déploiement

Guide d'installation, de mise à jour, de sauvegarde et de restauration : [deployment.md](deployment.md).

- **Dev** : `compose.yml` fournit PostgreSQL et Mailpit. `node ace migration:run`, `node ace db:seed` (catalogue, à relancer quand il change), puis `node ace serve --hmr`. Les tests lancent eux-mêmes migrations et seeder.
- **Image Docker** unique, multi-étapes, pour `linux/amd64` et `linux/arm64`. Les étapes de build tournent sur la plateforme de la machine de build (leur résultat ne dépend pas de l'architecture) ; seules les dépendances de production, qui contiennent des binaires natifs (`sharp`), sont installées pour la plateforme cible. Image de base `node:26-alpine` épinglée par le digest de son index multi-plateforme, à côté de son tag : deux builds du même commit partent de la même image (Dependabot met le digest à jour). Utilisateur non root `node` : le code de l'application (`build`, `node_modules`) appartient à `root` et n'est que lisible par `node` ; seul `storage` (`DRIVE_ROOT`) lui est modifiable. Les tests, leur lanceur (`bin/test.ts`) et les factories (`database/factories`) sont exclus du contexte de build (`.dockerignore`) : ils ne sont pas dans l'image. `HEALTHCHECK` sur `/health/live`. Au démarrage : `migration:run --force` (le flag confirme l'exécution en production, où Adonis la refuse sinon ; il ne rejoue ni ne supprime rien), puis `db:seed --files database/seeders/catalog_seeder.js` (le seeder compilé, voir `docker/entrypoint.sh`), puis le serveur. Les deux premières étapes sont idempotentes.
- **Migrations** : une migration fusionnée sur `main` n'est plus jamais modifiée. Tout changement de schéma passe par une nouvelle migration : le serveur d'intégration (image `main`) et les instances déjà installées ont appliqué l'ancienne au démarrage, et Adonis ne rejoue pas une migration déjà exécutée.
- Volume à persister : `DRIVE_ROOT`.
- **HTTPS obligatoire** : en production, les cookies de session sont `Secure` et HSTS est actif ; servie en HTTP, l'application ne garde pas la session. Déploiement prévu derrière un reverse proxy (Traefik, Nginx, Caddy…) qui termine le HTTPS, avec `TRUSTED_PROXIES` renseigné.
- **Sauvegardes** : il n'y a ni corbeille ni soft delete. La [doc de déploiement](deployment.md#sauvegarde) explique comment sauvegarder ensemble la base (`pg_dump`) et le dossier `DRIVE_ROOT`, et comment restaurer.

## Tests

- Chaque critère d'acceptation d'une spec correspond à au moins un test fonctionnel Japa dans `tests/functional/<feature>/`.
- La base de test est réinitialisée par transaction globale par test. Exception : un test qui a besoin de plusieurs connexions simultanées (concurrence, verrous) vide la base par troncature, car la transaction globale réunirait ses requêtes sur une seule connexion. Pour que les requêtes se chevauchent, le test tient un verrou dans sa propre transaction et ne le relâche que lorsqu'elles l'attendent toutes (`waitForLockWaiters`, `tests/helpers/locks.ts`).
- Les emails sont capturés avec `mail.fake()`.
- Une seule suite, `functional` : pas de suite `unit`. Ce qui serait testé unitairement l'est par les tests fonctionnels de sa feature, avec la base. Le calcul des séries (`MeasureSeriesService`) se fait en SQL : ses tests appellent directement le service (`tests/functional/charts/measure_series.spec.ts`) ; le catalogue est testé par les critères TRK et le seeder. Une suite `unit` ne sera déclarée dans `adonisrc.ts` qu'avec son premier test.

## CI (GitHub Actions)

- Sur chaque PR (`.github/workflows/ci.yml`) et sur chaque push sur `main` (`ci.yml` rejoué par `main.yml`, voir ci-dessous) :
  - `lint` ;
  - `typecheck`, après avoir vérifié que les fichiers générés de `.adonisjs/` sont à jour ;
  - `test` sur PostgreSQL 16 (version minimale, [ADR 0002](adr/0002-postgresql-uuidv7.md)) et 18, puis vérification que `database/schema.ts` correspond aux migrations ;
  - `build` de l'image, puis démarrage contre une base PostgreSQL neuve et **smoke test** (`.github/scripts/smoke_test.sh`) : migrations et seeder passés, `/health/live` répond, puis `/` mène à `/setup`, dont le HTML doit être rendu par le serveur (élément racine Inertia marqué `data-server-rendered`, langue `fr` demandée par `Accept-Language`, titre et bouton de la page traduits dans le HTML : ces textes viennent des traductions des bundles, jamais des props), le script et la feuille de style qu'il référence sous `/assets/` sont servis, et le formulaire d'installation envoyé vide (avec le jeton CSRF du cookie `XSRF-TOKEN`) revient sur `/setup` avec un message de validation en français, qui n'existe que dans les fichiers de langue du serveur (`resources/lang`). Le test échoue si le bundle SSR, un fichier sous `/assets/` ou les fichiers de langue du serveur manquent. Chaque requête a un délai maximal : un serveur qui ne répond plus fait échouer le test. Le formulaire vide ne crée aucun compte : la base reste neuve.
- **Publication de l'image** : `.github/workflows/publish.yml`, workflow réutilisable (`workflow_call`) appelé par `release.yml` et `main.yml` une fois leur CI passée. Il reçoit les tags à poser, la version du label OCI et, en option, le digest d'une image déjà publiée depuis ce commit :
  1. `publish` : construction pour `linux/amd64` et `linux/arm64` et envoi sur **GHCR seul** (`ghcr.io/aquatracking/app`) **par digest, sans aucun tag**. Labels et annotations OCI (titre, description, source, version, révision) posés par `docker/metadata-action`, attestations de provenance (`mode=max`) et SBOM jointes à l'image. Construite sans cache, pour qu'aucun job précédent ne puisse influencer l'image publiée. Sauté si un digest est fourni : rien n'est construit ;
  2. `smoke-test` : démarrage de ce digest (envoyé ou fourni) sur chaque architecture (runner natif) contre une base PostgreSQL neuve, avec le même smoke test que la CI (page `/setup` rendue par le serveur, assets, message de validation traduit), puis vérification de l'architecture du processus ;
  3. `tag` : seulement si le démarrage a réussi, pose des tags demandés sur le digest testé (`docker buildx imagetools create`). Une image qui échoue au démarrage reste sans tag : personne ne la reçoit.

  Les deux workflows appelants ne publient que depuis `aquatracking/app` (`if: github.repository == 'aquatracking/app'`) : sur un fork, la CI tourne mais rien n'est publié.
- Sur un tag `v2.*` (`.github/workflows/release.yml`), une publication à la fois (groupe de concurrence `release`, sans annulation) :
  1. `version` : vérification que le tag correspond à la version de `package.json` et pointe sur un commit de `main` ; calcul des tags de l'image (voir ci-dessous). Cherche aussi si `ghcr.io/aquatracking/app:X.Y.Z` existe déjà : si oui, son digest est repris (après avoir vérifié que son label `org.opencontainers.image.revision` est bien le commit tagué, sinon échec), et seule l'absence (« not found ») autorise une construction : toute autre erreur de lecture arrête l'exécution ;
  2. `ci` : les vérifications ci-dessus, rejouées sur le commit tagué (`ci.yml` est appelé comme workflow réutilisable) ;
  3. `publish` : `publish.yml` avec le tag `X.Y.Z` et les tags flottants ([ADR 0007](adr/0007-versionnement-v2.md)), label de version `X.Y.Z`. Si `X.Y.Z` existe déjà, le digest trouvé par `version` est passé à `publish.yml` : pas de construction, le smoke test tourne sur ce digest, puis les tags y sont reposés. `X.Y.Z` ne change donc jamais ;
  4. `github-release` : création de la GitHub Release avec des notes générées (marquée pré-version si le tag en est une), seulement après la pose des tags. Si elle existe déjà (exécution précédente, ou créée à la main), elle est gardée telle quelle : les Releases de ce dépôt sont immuables.
- Sur chaque push sur `main` (`.github/workflows/main.yml`), l'image du serveur d'intégration :
  1. `version` : calcul du SHA court (7 caractères) et de la version du label OCI, `<version de package.json>-main.<SHA court>` (par exemple `2.0.0-main.afd1564`), pour qu'une image de `main` ne soit jamais prise pour une version publiée. Vérifie aussi si `sha-<SHA court>` existe déjà sur GHCR ;
  2. `ci` : `ci.yml`, seule exécution de la CI pour ce push (`ci.yml` n'a pas de déclencheur `push`). Elle tourne pour chaque push, sans attendre les publications en cours ;
  3. `publish` : `publish.yml` avec le tag fixe `sha-<SHA court>` et le tag flottant `main`. Jamais `latest` ni un tag de version. Sauté si `sha-<SHA court>` existe déjà : une relance ne reconstruit pas l'image, qui aurait un autre digest, et un tag `sha-…` désigne donc toujours la même image.
- **Image `main`** : instable par nature, elle sert au serveur d'intégration et aux essais, jamais à la production ([déploiement](deployment.md#limage)). Le tag `main` désigne la plus récente image publiée d'un commit qui était encore la tête de `main` au moment de la pose des tags. Il ne recule jamais vers un commit plus ancien :
  - une publication à la fois (groupe de concurrence `main-image` sur le job `publish`, distinct de `release` puisque les tags écrits sont différents, sans annulation) ;
  - juste avant de poser les tags, le job `tag` lit la tête de `main` (API GitHub, `git/ref/heads/main`). Si `main` a avancé depuis, il pose `sha-<SHA court>` mais pas `main` : la publication du commit plus récent s'en charge. Cela couvre aussi la relance d'une ancienne exécution ;
  - `main` peut donc rester en retard : si le commit plus récent échoue à la CI ou au démarrage, `main` garde l'image précédente jusqu'au prochain push qui passe ;
  - GitHub ne garde qu'une publication en attente par groupe : si plusieurs PR sont fusionnées pendant une publication, la CI tourne pour chacune mais les commits intermédiaires n'ont pas de tag `sha-…` (une relance de leur exécution le pose, sans toucher `main`).
- **Tags flottants** : ils ne reculent jamais. `X.Y` n'est posé que si la version est la plus haute version stable de la ligne `X.Y`, `X` que si elle est la plus haute de la ligne `X`, `latest` que si elle est la plus haute de toutes. Seuls comptent les tags git `vX.Y.Z` atteignables depuis `main` (`git tag --merged origin/main`), triés en semver. Un correctif `v2.0.5` poussé après `v2.1.0` reçoit `2.0.5` et `2.0`, sans toucher `2` ni `latest`. Une pré-version (`2.1.0-rc.1`) n'a que son propre tag.
- **Publier une version, en pratique** :
  - pousser les tags **un par un**, en attendant la fin de chaque exécution : GitHub ne garde qu'une exécution en attente par groupe de concurrence, et un troisième tag poussé pendant que deux attendent annule celle du deuxième ;
  - après un échec, relancer `release.yml` avec **« Re-run all jobs »**, quel que soit le job qui a échoué. Si `X.Y.Z` n'a pas été posé, l'image est construite comme la première fois. S'il l'a été (échec de `github-release`, par exemple), rien n'est reconstruit : le digest de `X.Y.Z` est testé à nouveau, `X.Y.Z` et les tags flottants recalculés y sont reposés (un tag flottant déjà passé à une version plus haute n'est pas touché), puis la Release est créée si elle manque. « Re-run failed jobs » réutilise les sorties des jobs réussis, dont les tags calculés par `version` : faux si un autre tag a été publié entre-temps ;
  - un tag invalide (mauvaise version, commit hors de `main`) fait échouer `version` avant toute publication. Le supprimer (`git push --delete origin vX.Y.Z` puis `git tag -d vX.Y.Z`), corriger, puis le poser à nouveau. Un tag supprimé n'est plus compté dans le calcul des tags flottants ; un digest déjà envoyé sans tag reste dans GHCR, sans effet (à supprimer à la main si besoin).
- Les workflows n'utilisent que `GITHUB_TOKEN`, avec les permissions minimales de chaque job : `contents: read` pour lire le dépôt et la tête de `main`, `packages: write` pour l'envoi par digest et la pose des tags, `packages: read` pour lire un tag existant (`version` de `release.yml` et `main.yml`) et pour le démarrage du digest, `contents: write` pour la Release. Un job qui appelle un workflow réutilisable lui accorde les permissions dont ses jobs ont besoin (`contents: read` et `packages: write` pour `publish.yml`). Toutes les actions des workflows sont épinglées par SHA de commit, version en commentaire. Les checkouts ne gardent pas le jeton (`persist-credentials: false`).
- **Dependabot** (`.github/dependabot.yml`) passe chaque semaine :
  - actions GitHub : SHA et commentaire de version, dans une seule PR groupée ;
  - images Docker, épinglées par digest à côté de leur tag (`image:tag@sha256:…`) : `node:26-alpine` du `Dockerfile` (écosystème `docker`) et PostgreSQL et Mailpit de `compose.yml` (écosystème `docker-compose`), une PR groupée par écosystème. Dependabot met à jour le digest quand le tag reçoit une nouvelle image ; les versions majeures de Node (qui suit `.node-version`) et de PostgreSQL (qui demande une migration des données) ne sont jamais proposées ;
  - les images PostgreSQL des services des workflows (`ci.yml`, `publish.yml`), épinglées de la même façon, ne sont lues par aucun écosystème de Dependabot : elles sont mises à jour à la main, en même temps que celle de `compose.yml` pour PostgreSQL 18 (digest de l'index lu avec `docker buildx imagetools inspect postgres:16`) ;
  - dépendances npm (`pnpm-lock.yaml`) : les mises à jour mineures et correctives sont groupées (paquets Adonis, VineJS, Japa et Tuyau ensemble ; Vue, Inertia, Vite, Tailwind et bibliothèques d'interface ensemble ; puis le reste des dépendances de dev, puis le reste des dépendances de production). Chaque version majeure a sa propre PR. Cinq PR npm ouvertes au plus. `@types/node` ne change pas de majeure (elle suit `.node-version`) et `decode-uri-component` est exclu (voir « Audit des dépendances »).
  - les « Dependabot security updates » (réglage du dépôt) complètent ce passage pour les failles signalées entre deux semaines.
- Docker Hub n'est pas utilisé pour l'instant : il pourra être ajouté plus tard (secret d'accès, second nom d'image dans le job `tag` de `publish.yml`).

**Audit des dépendances.** `pnpm audit --prod` ignore deux avis sur `decode-uri-component` 0.2.2 (`GHSA-qr28-fpjm-wq7f`, `GHSA-vcc3-ghjq-m6fr`, déclarés dans `pnpm.auditConfig.ignoreGhsas` de `package.json`). Le paquet n'est atteint que par `vite > stylus > css > source-map-resolve`, qui ne sert qu'à compiler du Stylus, absent du projet : ce code n'est jamais exécuté, ni au build ni en production. Les versions corrigées (≥ 0.5.0) ne sont publiées qu'en ESM, alors que `source-map-resolve` les charge avec `require()` : forcer la mise à jour casserait ce chemin au lieu de le corriger. Les alertes Dependabot correspondantes sont à rejeter dans GitHub (« Dismiss », motif « Vulnerable code is not actually used ») avec la même justification. À retirer quand `vite` ou `stylus` ne dépendront plus de `css`.
