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
| Santé | Route `/health/live` seulement, servie par un contrôleur simple (`HealthChecksController`) qui répond 200 | Sonde de vivacité pour Docker et les orchestrateurs : elle dit seulement que le serveur HTTP répond, il n'y a rien à vérifier. La classe `HealthChecks` d'Adonis sert aux rapports de disponibilité (base, mémoire, disque), qu'on n'expose pas : pas de `/health/ready` public, son rapport expose des détails du serveur (versions, mémoire, disque) |
| Variables d'environnement | `start/env.ts`, `Env.schema` | Secrets en `Env.schema.secret()`. Le préfixe `file:` (Docker secrets) n'est résolu que dans un fichier `.env`, pas dans l'environnement du processus ([déploiement](deployment.md#secrets-dans-des-fichiers)) |
| Données de référence | Seeder idempotent du catalogue | Lancé à chaque démarrage, comme les migrations |
| Mise à jour en direct *(après 2.0)* | `@adonisjs/transmit` (SSE) + `router.reload({ only })` d'Inertia | Canal `vivariums/:id` autorisé par `VivariumPolicy` ; le serveur recalcule les props, aucune logique dupliquée côté client. Transport en mémoire pour une instance, Redis si plusieurs. Le reverse proxy doit désactiver le buffering sur la route SSE |

**Limite des sessions.** Le store `cookie` garde la session dans le navigateur, sans trace côté serveur : le serveur ne peut donc pas la révoquer. Avec `clearWithBrowser`, `@adonisjs/session` ne pose ni `Max-Age` ni `Expires` sur le cookie, et le cookie chiffré n'a aucune durée de validité. Seule la copie du navigateur disparaît à sa fermeture. Une copie du cookie, rejouée hors du navigateur ou gardée par la restauration de session du navigateur, reste valide **sans limite de durée**, tant que `APP_KEY` ne change pas. C'est vrai même après une déconnexion, une réinitialisation ou un changement de mot de passe : ces actions ne suppriment que des remember me tokens, qui sont en base. La déconnexion supprime celui de l'appareil courant, la réinitialisation tous, le changement de mot de passe ceux des autres appareils ([02](features/02-auth-profile.md)). L'option `age` de `config/session.ts` est sans effet avec `clearWithBrowser` et le store `cookie` : elle n'est donc pas renseignée. Choix assumé pour une instance auto-hébergée servie en HTTPS (cookie `HttpOnly`, `Secure`, `SameSite=Lax`) ; révoquer les sessions demanderait le store `database`.

## Organisation du code

Structure standard d'Adonis 7, fichiers créés avec `node ace make:*`. À l'intérieur des dossiers standards, on regroupe par domaine quand il y a plus de 3 fichiers.

```
app/
  catalog/measure_types.ts      # catalogue des types de mesure + mesures suivies par défaut
  controllers/
    setup_controller.ts
    auth/…                       # session, password_reset, registration
    profile_controller.ts
    admin/…                      # users, invitations
    vivariums_controller.ts
    vivarium_images_controller.ts
    tracked_measures_controller.ts
    measures_controller.ts       # relevé, historique, correction
    charts_controller.ts
  models/                        # user, invitation, password_reset_token, vivarium, measure_type, tracked_measure, measure
  policies/                      # vivarium_policy, user_policy, invitation_policy
  transformers/                  # une classe par forme de données exposée
  validators/                    # un fichier par ressource, un validator par action
  services/                      # opérations métier appelables hors HTTP (relevés, séries, dernières valeurs, mesures suivies par défaut)
  middleware/
inertia/
  pages/                         # un dossier par ressource, miroir des contrôleurs
  components/ui/                 # shadcn-vue (généré)
  components/                    # composants métier
database/
  migrations/
  seeders/catalog_seeder.ts
resources/lang/{fr,en}/
tests/functional/<feature>/…
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
- **Erreurs métier** : exceptions Adonis nommées (`E_INVITATION_EXPIRED`…) traduites, rendues en messages flash.
- **Dates** : `DateTime` Luxon côté serveur, en UTC dans le code et en base. Conversion vers le **fuseau de l'utilisateur** (`user.timezone`) seulement pour l'affichage et l'interprétation des saisies. Jamais de décalage fixe : toujours un nom de zone IANA, pour que Luxon applique les changements d'heure de la date concernée.
- **Pas de code mort** : pas d'alias d'import, de dépendance ou de colonne sans usage. Exception : les alias `#…` du champ `imports` de `package.json` (`#models/*`, `#mails/*`, `#events/*`…) sont ceux du framework, utilisés par les commandes `node ace make:*` : ils restent même si le dossier n'existe pas encore.

## Rendu et formulaires

- Formulaires avec le composant `<Form>` d'Inertia et routes typées ; les erreurs de validation reviennent par session.
- Les messages de succès ou d'erreur métier passent par un flash `notification` partagé par le middleware Inertia, posé avec `session.notify(type, message)` (macro de `start/session.ts`). Un lien à usage unique généré par un administrateur (invitation, réinitialisation) passe par un flash `generatedLink`, seul moment où il est connu.
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
- **Image Docker** unique, multi-étapes, pour `linux/amd64` et `linux/arm64`. Les étapes de build tournent sur la plateforme de la machine de build (leur résultat ne dépend pas de l'architecture) ; seules les dépendances de production, qui contiennent des binaires natifs (`sharp`), sont installées pour la plateforme cible. Utilisateur non root `node`, `HEALTHCHECK` sur `/health/live`. Au démarrage : `migration:run --force` (le flag confirme l'exécution en production, où Adonis la refuse sinon ; il ne rejoue ni ne supprime rien), puis `db:seed --files catalog_seeder`, puis le serveur. Les deux premières étapes sont idempotentes.
- Volume à persister : `DRIVE_ROOT`.
- **HTTPS obligatoire** : en production, les cookies de session sont `Secure` et HSTS est actif ; servie en HTTP, l'application ne garde pas la session. Déploiement prévu derrière un reverse proxy (Traefik, Nginx, Caddy…) qui termine le HTTPS, avec `TRUSTED_PROXIES` renseigné.
- **Sauvegardes** : il n'y a ni corbeille ni soft delete. La [doc de déploiement](deployment.md#sauvegarde) explique comment sauvegarder ensemble la base (`pg_dump`) et le dossier `DRIVE_ROOT`, et comment restaurer.

## Tests

- Chaque critère d'acceptation d'une spec correspond à au moins un test fonctionnel Japa dans `tests/functional/<feature>/`.
- La base de test est réinitialisée par transaction globale par test. Exception : un test qui a besoin de plusieurs connexions simultanées (concurrence, verrous) vide la base par troncature, car la transaction globale réunirait ses requêtes sur une seule connexion. Pour que les requêtes se chevauchent, le test tient un verrou dans sa propre transaction et ne le relâche que lorsqu'elles l'attendent toutes (`waitForLockWaiters`, `tests/helpers/locks.ts`).
- Les emails sont capturés avec `mail.fake()`.
- Une seule suite, `functional` : pas de suite `unit`. Ce qui serait testé unitairement l'est par les tests fonctionnels de sa feature, avec la base. Le calcul des séries (`MeasureSeriesService`) se fait en SQL : ses tests appellent directement le service (`tests/functional/charts/measure_series.spec.ts`) ; le catalogue est testé par les critères TRK et le seeder. Une suite `unit` ne sera déclarée dans `adonisrc.ts` qu'avec son premier test.

## CI (GitHub Actions)

- Sur chaque PR et sur `main` :
  - `lint` ;
  - `typecheck`, après avoir vérifié que les fichiers générés de `.adonisjs/` sont à jour ;
  - `test` sur PostgreSQL 16 (version minimale, [ADR 0002](adr/0002-postgresql-uuidv7.md)) et 18, puis vérification que `database/schema.ts` correspond aux migrations ;
  - `build` de l'image, puis démarrage contre PostgreSQL (migrations, seeder, `/health/live` et `/`).
- Sur un tag `v2.*` (`.github/workflows/release.yml`) :
  - vérification que le tag correspond à la version de `package.json` ;
  - les vérifications ci-dessus, rejouées sur le commit tagué (`ci.yml` est appelé comme workflow réutilisable) ;
  - publication de l'image sur **GHCR seul** (`ghcr.io/aquatracking/app`), pour `linux/amd64` et `linux/arm64`, avec les tags `X.Y.Z`, `X.Y`, `X` et `latest` ([ADR 0007](adr/0007-versionnement-v2.md)). Une pré-version (`2.1.0-rc.1`) n'a que son propre tag. Labels OCI (source, version, révision) posés par `docker/metadata-action` ;
  - création de la GitHub Release avec des notes générées (marquée pré-version si le tag en est une).
- Le workflow n'utilise que `GITHUB_TOKEN`, avec les permissions minimales de chaque job (`packages: write` pour la publication, `contents: write` pour la Release). Les actions sont épinglées par SHA de commit.
- Docker Hub n'est pas utilisé pour l'instant : il pourra être ajouté plus tard (secret d'accès, second nom d'image dans `docker/metadata-action`).
