# Architecture

## Stack

| Couche | Choix | Pourquoi |
|---|---|---|
| Runtime | Node.js 26 LTS, pnpm | AdonisJS 7 demande Node 24 au minimum ; 26 est la LTS active. Version fixée dans `.node-version`, pnpm dans `packageManager` |
| Framework | AdonisJS 7, starter kit **Inertia + Vue** | Auth, validation, autorisations et typage fournis ; un seul projet à maintenir ([ADR 0001](adr/0001-monolithe-inertia-vue.md)) |
| Rendu | Inertia 3 + Vue 3, SSR activé | Pages serveur sans API à écrire, navigation SPA |
| UI | Tailwind + shadcn-vue, graphes shadcn-vue (Unovis) | Composants copiés dans le repo, cohérents entre eux |
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
| Connexion, session, « se souvenir de moi » | `@adonisjs/auth` guard session + remember me tokens | `withAuthFinder` sur `User` |
| Validation des entrées | VineJS, un validator par action | Messages traduits via i18n |
| « Ce vivarium est-il à moi ? » | Bouncer, `VivariumPolicy` | Aucun contrôle de propriété écrit à la main dans les contrôleurs |
| Réservé aux admins | Bouncer, `UserPolicy` / `InvitationPolicy` + middleware `admin` | |
| Forme des données envoyées aux pages | **Transformers** (`app/transformers/`) | Pas de DTO écrits à la main ; jamais de `serialize()` brut de modèle vers une page |
| Typage des props de page | Props Inertia générées par Adonis 7 | `inertia.render` est vérifié à la compilation |
| URLs | `urlFor` (serveur et client), routes nommées automatiquement `controller.method` | Jamais d'URL écrite en dur |
| Limitation de débit | `@adonisjs/limiter`, store **database** (PostgreSQL) | Connexion, mot de passe oublié, installation. Compteurs et historique des blocages dans la table `rate_limits` : ils survivent à un redémarrage et restent partagés si plusieurs instances tournent, sans ajouter Redis. Store `memory` en tests |
| Tokens à usage unique (invitation, reset) | Token aléatoire, **haché** en base | Voir [data-model](data-model.md) |
| Traductions | `@adonisjs/i18n` (serveur) + mêmes fichiers côté Vue | Un seul jeu de fichiers `resources/lang/{fr,en}/*.json` |
| Fichiers | Drive, disque `vivariums` local | Servis par un contrôleur protégé par la policy |
| Santé | Health checks Adonis, route `/health/live` seulement | Pour Docker et les orchestrateurs. Pas de `/health/ready` public : son rapport expose des détails du serveur (versions, mémoire, disque) |
| Variables d'environnement | `start/env.ts`, `Env.schema` | Secrets en `Env.schema.secret()`, support `file:` pour Docker secrets |
| Données de référence | Seeder idempotent du catalogue | Lancé à chaque démarrage, comme les migrations |
| Mise à jour en direct *(après 2.0)* | `@adonisjs/transmit` (SSE) + `router.reload({ only })` d'Inertia | Canal `vivariums/:id` autorisé par `VivariumPolicy` ; le serveur recalcule les props, aucune logique dupliquée côté client. Transport en mémoire pour une instance, Redis si plusieurs. Le reverse proxy doit désactiver le buffering sur la route SSE |

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
  - créer les mesures suivies par défaut d'un vivarium.

  Un service reçoit des données déjà validées (validators Vine) et l'utilisateur concerné, et non le `HttpContext`. L'autorisation reste faite par l'appelant avec les policies Bouncer, utilisables hors HTTP. Un simple CRUD sans règle (renommer un vivarium) peut rester dans le contrôleur. Pas de couche *repository* : Lucid en tient lieu.
- **Points d'entrée** : les contrôleurs, et plus tard les outils MCP et l'API capteurs, ne font que brancher validation, autorisation, service et transformer. Aucune règle métier ne doit exister dans un seul d'entre eux.
- **Un nom par concept** : celui de `CONTEXT.md`. Pas de synonymes (`tank`, `biotope`, `setting`…).
- **Erreurs métier** : exceptions Adonis nommées (`E_INVITATION_EXPIRED`…) traduites, rendues en messages flash.
- **Dates** : `DateTime` Luxon côté serveur, en UTC dans le code et en base. Conversion vers le **fuseau de l'utilisateur** (`user.timezone`) seulement pour l'affichage et l'interprétation des saisies. Jamais de décalage fixe : toujours un nom de zone IANA, pour que Luxon applique les changements d'heure de la date concernée.
- **Pas de code mort** : pas d'alias d'import, de dépendance ou de colonne sans usage. Exception : les alias `#…` du champ `imports` de `package.json` (`#models/*`, `#mails/*`, `#events/*`…) sont ceux du framework, utilisés par les commandes `node ace make:*` : ils restent même si le dossier n'existe pas encore.

## Rendu et formulaires

- Formulaires avec le composant `<Form>` d'Inertia et routes typées ; les erreurs de validation reviennent par session.
- Les messages de succès ou d'erreur métier passent par un flash `notification` partagé par le middleware Inertia.
- Données partagées à toutes les pages (`InertiaMiddleware`) : utilisateur courant (transformé), langue, fuseau de l'utilisateur, notification, `mailEnabled`.
- **Fuseau horaire** : stocké sur l'utilisateur. Les formulaires d'installation et d'inscription le préremplissent avec `Intl.DateTimeFormat().resolvedOptions().timeZone` ; le serveur le valide (nom IANA) et l'enregistre. Rendu SSR et client utilisent ce même fuseau partagé : pas d'écart à l'hydratation. Pas de cookie ni de détection à chaque requête.
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

- **Dev** : `compose.yml` fournit PostgreSQL et Mailpit. `node ace serve --hmr`.
- **Image Docker** unique, multi-étapes. Au démarrage : `migration:run --force` (le flag confirme l'exécution en production, où Adonis la refuse sinon ; il ne rejoue ni ne supprime rien), puis `db:seed --files catalog_seeder`, puis le serveur. Les deux premières étapes sont idempotentes.
- Volume à persister : `DRIVE_ROOT`.
- **HTTPS obligatoire** : en production, les cookies de session sont `Secure` et HSTS est actif ; servie en HTTP, l'application ne garde pas la session. Déploiement prévu derrière un reverse proxy (Traefik, Nginx, Caddy…) qui termine le HTTPS, avec `TRUSTED_PROXIES` renseigné.
- **Sauvegardes** : il n'y a ni corbeille ni soft delete, la doc de déploiement doit donc expliquer comment sauvegarder régulièrement la base (`pg_dump`) et le dossier `DRIVE_ROOT`, et comment restaurer.

## Tests

- Chaque critère d'acceptation d'une spec correspond à au moins un test fonctionnel Japa dans `tests/functional/<feature>/`.
- La base de test est réinitialisée par transaction globale par test.
- Les emails sont capturés avec `mail.fake()`.
- Tests unitaires seulement pour la logique pure (catalogue, calcul des séries).

## CI (GitHub Actions)

- Sur chaque PR et sur `main` :
  - `lint` ;
  - `typecheck`, après avoir vérifié que les fichiers générés de `.adonisjs/` sont à jour ;
  - `test` sur PostgreSQL 16 (version minimale, [ADR 0002](adr/0002-postgresql-uuidv7.md)) et 18, puis vérification que `database/schema.ts` correspond aux migrations ;
  - `build` de l'image, puis démarrage contre PostgreSQL (migrations, seeder, `/health/live` et `/`).
- Sur un tag `v2.*` : publication de l'image sur GHCR et Docker Hub (`aquatracking/app`).
