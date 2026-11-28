# Modèle de données

PostgreSQL. Noms de tables et colonnes en `snake_case`, modèles Lucid en `camelCase`. Toutes les tables ont `created_at` et `updated_at` (`timestamptz`), sauf mention contraire.

## Conventions

- **Identifiants** : UUIDv7, générés côté application dans un hook `beforeCreate` commun aux modèles ([ADR 0002](adr/0002-postgresql-uuidv7.md)). Fonctionne quelle que soit la version de PostgreSQL. Exceptions : les tables gérées par une bibliothèque, `remember_me_tokens` et `rate_limits` (voir plus bas).
- **Énumérations** : colonnes `text` avec contrainte `CHECK`, et l'énumération TypeScript correspondante dans le modèle. Ajouter une valeur = une migration qui modifie la contrainte.
- **Booléens** : `boolean not null default false` (jamais une chaîne).
- **Tokens** : seul le hash SHA-256 est stocké ; le token en clair n'existe que dans le lien.
- **Dates et heures** : instants stockés en `timestamptz` (absolus, indépendants du fuseau). Seules les dates « calendaires » sans heure (`started_on`) sont en `date`. Conversion vers et depuis le fuseau de l'utilisateur (`users.timezone`) uniquement à l'affichage et à la saisie.
- **Suppression** : physique, avec `on delete cascade` sur les données qui appartiennent à leur parent. **Pas de soft delete** (`deleted_at`) : il obligerait chaque requête à filtrer les lignes supprimées, compliquerait les contraintes d'unicité (un email supprimé bloque-t-il une invitation ?) et les cascades. Les besoins sont couverts autrement :
  - un vivarium ne se supprime pas, il s'**archive** ; il n'est supprimé qu'avec le compte de son propriétaire ;
  - les suppressions restantes (compte, relevé, mesure) demandent une confirmation ;
  - le filet de sécurité d'une instance auto-hébergée, ce sont ses **sauvegardes** ([architecture](architecture.md)).

## Schéma

```
users 1───* vivariums 1───* tracked_measures *───1 measure_types
  │              │                                   │
  │              └────────* measures *───────────────┘
  ├───* invitations (invited_by_id)
  ├───* password_reset_tokens
  └───* remember_me_tokens
```

## Tables

### `users`
| Colonne | Type | Règles |
|---|---|---|
| `id` | uuid | PK |
| `first_name` | text | requis, 1–100 caractères |
| `last_name` | text | nullable, ≤ 100 caractères |
| `email` | text | requis, unique (insensible à la casse : stocké en minuscules) |
| `password` | text | hash (scrypt) |
| `is_admin` | boolean | défaut `false` |
| `locale` | text | requis, `CHECK in ('fr','en')`, défaut `en` |
| `timezone` | text | requis, nom de la liste des fuseaux (`app/catalog/timezones.ts` : `UTC` ou une zone géographique sous le nom que lui donne `zone.tab` de l'IANA, reconnu par PostgreSQL ; validé côté application), défaut `UTC` |
| `invited_by_id` | uuid | nullable, FK `users`, `on delete set null`. Qui a envoyé l'invitation utilisée ; vide pour le premier administrateur ou si l'invitant a été supprimé. Avec `created_at` (date d'inscription), c'est l'historique « qui a invité qui, et quand » |
| `last_seen_at` | timestamptz | nullable. Dernière activité : mise à jour par un middleware sur les requêtes authentifiées, au plus une fois par heure par utilisateur |

Règle d'intégrité applicative : il reste toujours au moins un utilisateur avec `is_admin = true`.

### `remember_me_tokens`
Table standard d'`@adonisjs/auth` (`tokenable_id` uuid → `users.id` en cascade, `hash` unique, `expires_at`). Exception à la convention des identifiants : sa clé `id` est un entier auto-incrémenté, car le fournisseur de tokens d'Adonis insère les lignes sans identifiant. Gérée par le fournisseur de tokens d'Adonis ; l'application n'y fait qu'une requête directe, la suppression des tokens d'un utilisateur (réinitialisation et changement de mot de passe). Exclue de la génération de `database/schema.ts`.

### `rate_limits`
Table gérée par `@adonisjs/limiter` (store database), créée par sa migration standard : une ligne par clé limitée (`key`, `points`, `expire`). Exception à la convention des identifiants : sa clé primaire est `key` (texte), au format imposé par `rate-limiter-flexible`, sans `id` ni `created_at`/`updated_at`. Contient aussi les clés qui comptent les blocages successifs pour le blocage progressif. Jamais lue ni écrite en dehors du limiter. Nettoyage des lignes expirées : assuré par la bibliothèque sous-jacente (`rate-limiter-flexible`, option `clearExpiredByTimeout` activée dans `config/limiter.ts`) : toutes les 5 minutes, suppression des lignes expirées depuis plus d'une heure. Exclue de la génération de `database/schema.ts` (aucun modèle).

### `invitations`
| Colonne | Type | Règles |
|---|---|---|
| `id` | uuid | PK |
| `email` | text | requis, unique, en minuscules |
| `token_hash` | text | unique |
| `expires_at` | timestamptz | création + 7 jours |
| `invited_by_id` | uuid | FK `users`, `on delete set null`, nullable. Administrateur qui a créé l'invitation ou l'a renouvelée en dernier |

Une invitation est supprimée quand elle est utilisée ou révoquée. La renouveler régénère le token, repousse `expires_at` et remplace `invited_by_id` par l'administrateur qui renouvelle.

### `password_reset_tokens`
| Colonne | Type | Règles |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK `users` cascade |
| `token_hash` | text | unique |
| `expires_at` | timestamptz | création + 1 heure |

Au plus un token actif par utilisateur : en générer un supprime les précédents. Supprimé après usage.

### `vivariums`
| Colonne | Type | Règles |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK `users` cascade, indexé |
| `kind` | text | `CHECK in ('aquarium','terrarium','paludarium')`, non modifiable |
| `name` | text | requis, 1–100 caractères |
| `description` | text | nullable, ≤ 2000 caractères |
| `water_type` | text | nullable, `CHECK in ('fresh','brackish','salt')` |
| `climate` | text | nullable, `CHECK in ('tropical','desert','temperate')` |
| `length_cm`, `width_cm`, `height_cm` | integer | nullables, 1–1000 |
| `volume_liters` | numeric(7,1) | nullable, > 0 et ≤ 999 999,9 (limite du type), une décimale au plus |
| `started_on` | date | requis, pas dans le futur |
| `archived_at` | timestamptz | nullable |
| `image_path` | text | nullable, chemin dans le disque Drive |

Contrainte `CHECK` de cohérence du profil :
- `aquarium` : `water_type` non nul, `climate` nul ;
- `terrarium` : `water_type` nul, `climate` non nul ;
- `paludarium` : les deux non nuls.

### `measure_types`
Données de référence, **écrites uniquement par le seeder du catalogue**. Pas de `timestamps`.

| Colonne | Type | Règles |
|---|---|---|
| `id` | uuid | PK |
| `code` | text | unique, stable (`temperature`, `ph`, `no2`…) |
| `unit` | text | requis, ex. `°C`, `mg/L` ; chaîne vide pour le pH et la densité |
| `decimals` | smallint | `CHECK` 0–3. Précision **maximale** de saisie et d'affichage, pas un arrondi de stockage |
| `position` | smallint | ordre d'affichage dans le catalogue |

Le libellé vient de l'i18n (`measure_types.<code>`). Les bornes de plausibilité et les profils par défaut restent dans le code du catalogue : ce sont des règles, pas des données. Un type abandonné reste dans le catalogue avec `retired: true` et sa ligne reste en base ; aucune entrée n'est jamais retirée du code ([ADR 0005](adr/0005-catalogue-types-de-mesure-fixe.md)).

### `tracked_measures`
| Colonne | Type | Règles |
|---|---|---|
| `id` | uuid | PK |
| `vivarium_id` | uuid | FK `vivariums` cascade |
| `measure_type_id` | uuid | FK `measure_types` restrict |
| `position` | smallint | ordre des tuiles et des champs du relevé |

Unique (`vivarium_id`, `measure_type_id`). Accueillera plus tard `min_value`, `max_value` et les préférences d'alerte.

### `measures`
| Colonne | Type | Règles |
|---|---|---|
| `id` | uuid | PK |
| `vivarium_id` | uuid | FK `vivariums` cascade |
| `measure_type_id` | uuid | FK `measure_types` restrict |
| `value` | numeric(10,3) | requis, dans les bornes de plausibilité du type |
| `measured_at` | timestamptz | requis |
| `source` | text | `CHECK in ('manual','device')`, défaut `manual`. Toujours `manual` en 2.0 : exception assumée à la règle « pas de colonne sans usage », pour ne pas migrer la plus grosse table à l'arrivée des capteurs |

Index **unique** (`vivarium_id`, `measure_type_id`, `measured_at`) : interdit deux mesures du même type au même instant sur un vivarium, et sert à la dernière valeur, à l'historique filtré et aux graphes (PostgreSQL le parcourt aussi en ordre décroissant). Les mesures manuelles ont un `measured_at` tronqué à la minute.

Index (`vivarium_id`, `measured_at`) : sert aux lectures de toutes les mesures d'un vivarium par date, sans filtre de type (historique non filtré, date du dernier et du plus ancien relevé).

Une mesure peut exister pour un type qui n'est plus suivi : l'historique reste consultable.

## Requêtes clés

- **Dernière et avant-dernière valeur par type** (tuiles du tableau de bord) : `tracked_measures CROSS JOIN LATERAL (… ORDER BY measured_at DESC LIMIT 2)`, qui parcourt l'index unique à rebours. Le coût dépend du nombre de mesures suivies, pas du nombre de mesures du vivarium.
- **Date du dernier relevé** de chaque vivarium d'une liste (une sous-requête `max(measured_at)` par vivarium, en une seule requête) et **plus ancien relevé** (`min(measured_at)`) : servis par l'index (`vivarium_id`, `measured_at`), qui donne la valeur sans lire les mesures.
- **Historique** : les instants distincts des relevés, du plus récent, 20 par page, puis leurs mesures. Non filtré, la page parcourt l'index (`vivarium_id`, `measured_at`) à rebours et s'arrête à la page ; filtré par type, elle utilise l'index unique. Le nombre total de relevés (pagination) compte encore tous les instants, en lisant l'index seul.
- **Types mesurés** d'un vivarium (filtres de l'historique) : une semi-jointure de `measure_types` vers l'index unique, une recherche par type du catalogue.
- **Série d'un graphe** : valeurs brutes si la plage contient ≤ `MAX_CHART_POINTS` (500) points, sinon moyenne, min et max par intervalle pour revenir sous cette limite. 500 est une heuristique : un graphe fait 300 à 1000 px de large, au-delà d'un point par pixel rien ne se voit ; la série pèse ~20 Ko et reste fluide en SVG sur téléphone. En saisie manuelle (≈ 365 mesures/an) les valeurs brutes suffisent presque toujours ; l'agrégation sert surtout aux capteurs et à la plage « tout ». À revoir avec les capteurs (nombre de points selon la largeur du graphe, ou algorithme LTTB). Les intervalles d'un jour ou plus sont calculés dans le fuseau de l'utilisateur (`date_bin(…, measured_at AT TIME ZONE :tz, …)`), pour qu'un « jour » corresponde au jour local, y compris les jours de 23 ou 25 heures au changement d'heure.
