# Architecture

## Stack

| Couche | Choix | Pourquoi |
|---|---|---|
| Runtime | Node.js 24 LTS | Requis par AdonisJS 7 |
| Framework | AdonisJS 7, starter kit **Inertia + Vue** | Auth, validation, autorisations et typage fournis ; un seul projet à maintenir ([ADR 0001](adr/0001-monolithe-inertia-vue.md)) |
| Rendu | Inertia 2 + Vue 3, SSR activé | Pages serveur sans API à écrire, navigation SPA |
| UI | Tailwind + shadcn-vue, graphes shadcn-vue (Unovis) | Composants copiés dans le repo, cohérents entre eux |
| Base | PostgreSQL ≥ 16 via Lucid | Séries temporelles, `date_trunc`, fonctions de fenêtrage ([ADR 0002](adr/0002-postgresql-uuidv7.md)) |
| Fichiers | `@adonisjs/drive`, disque local | Images de vivarium hors base |
| Images | `sharp` | Redimensionnement et conversion WebP |
| Emails | `@adonisjs/mail`, SMTP **optionnel** | Instances sans SMTP supportées ([ADR 0003](adr/0003-invitation-sans-verification-email.md)) |
| Tests | Japa (`@japa/plugin-adonisjs`, client API, assertions Inertia) | Fourni par Adonis |

Les numéros de versions exacts des paquets sont fixés au moment du scaffolding (`npm init adonisjs@latest`) et suivis par `package-lock.json`.

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
| Limitation de débit | `@adonisjs/limiter` | Connexion, mot de passe oublié, installation |
| Tokens à usage unique (invitation, reset) | Token aléatoire, **haché** en base | Voir [data-model](data-model.md) |
| Traductions | `@adonisjs/i18n` (serveur) + mêmes fichiers côté Vue | Un seul jeu de fichiers `resources/lang/{fr,en}/*.json` |
| Fichiers | Drive, disque `vivariums` local | Servis par un contrôleur protégé par la policy |
| Santé | Health checks Adonis (`/health/live`, `/health/ready`) | Pour Docker et les orchestrateurs |
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
  services/                      # seulement pour une logique partagée ou non triviale (ex. séries de graphes)
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
- **Services** : créés seulement quand une logique est partagée par plusieurs contrôleurs ou trop longue pour une méthode (ex. `MeasureSeriesService` qui calcule les séries agrégées). Pas de couche *repository* : Lucid en tient lieu.
- **Un nom par concept** : celui de `CONTEXT.md`. Pas de synonymes (`tank`, `biotope`, `setting`…).
- **Erreurs métier** : exceptions Adonis nommées (`E_INVITATION_EXPIRED`…) traduites, rendues en messages flash.
- **Dates** : `DateTime` Luxon côté serveur ; affichage dans le fuseau de l'instance (`TZ`).
- **Pas de code mort** : pas d'alias d'import, de dépendance ou de colonne sans usage.

## Rendu et formulaires

- Formulaires avec le composant `<Form>` d'Inertia et routes typées ; les erreurs de validation reviennent par session.
- Les messages de succès ou d'erreur métier passent par un flash `notification` partagé par le middleware Inertia.
- Données partagées à toutes les pages (`InertiaMiddleware`) : utilisateur courant (transformé), langue, notification, `mailEnabled`.
- Interface pensée **mobile d'abord** : le relevé se fait souvent devant le bac, téléphone en main.

## Environnement

| Variable | Obligatoire | Rôle |
|---|---|---|
| `APP_KEY` | oui | Chiffrement, signatures |
| `APP_URL` | oui | Construction des liens envoyés (invitations, reset) |
| `PORT`, `HOST`, `LOG_LEVEL`, `TZ` | non | Valeurs par défaut fournies |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` | oui | PostgreSQL |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_SECURE` | non | Si `SMTP_HOST` est vide, l'envoi d'email est désactivé |
| `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` | si SMTP | Expéditeur |
| `DRIVE_ROOT` | non | Dossier des images (défaut `storage/`), à monter en volume Docker |

## Démarrage et déploiement

- **Dev** : `compose.yml` fournit PostgreSQL et Mailpit. `node ace serve --hmr`.
- **Image Docker** unique, multi-étapes. Au démarrage : `migration:run --force` (le flag confirme l'exécution en production, où Adonis la refuse sinon ; il ne rejoue ni ne supprime rien), puis `db:seed --files catalog_seeder`, puis le serveur. Les deux premières étapes sont idempotentes.
- Volume à persister : `DRIVE_ROOT`.

## Tests

- Chaque critère d'acceptation d'une spec correspond à au moins un test fonctionnel Japa dans `tests/functional/<feature>/`.
- La base de test est réinitialisée par transaction globale par test.
- Les emails sont capturés avec `mail.fake()`.
- Tests unitaires seulement pour la logique pure (catalogue, calcul des séries).

## CI (GitHub Actions)

- Sur chaque PR et sur `main` : `lint`, `typecheck`, `test` (service PostgreSQL), `build` de l'image.
- Sur un tag `v2.*` : publication de l'image sur GHCR et Docker Hub (`aquatracking/app`).
