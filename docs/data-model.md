# Modèle de données

PostgreSQL. Noms de tables et colonnes en `snake_case`, modèles Lucid en `camelCase`. Toutes les tables ont `created_at` et `updated_at` (`timestamptz`), sauf mention contraire.

## Conventions

- **Identifiants** : UUIDv7, générés côté application dans un hook `beforeCreate` commun aux modèles ([ADR 0002](adr/0002-postgresql-uuidv7.md)). Fonctionne quelle que soit la version de PostgreSQL.
- **Énumérations** : colonnes `text` avec contrainte `CHECK`, et l'énumération TypeScript correspondante dans le modèle. Ajouter une valeur = une migration qui modifie la contrainte.
- **Booléens** : `boolean not null default false` (jamais une chaîne).
- **Tokens** : seul le hash SHA-256 est stocké ; le token en clair n'existe que dans le lien.
- **Dates et heures** : instants stockés en `timestamptz` (absolus, indépendants du fuseau). Seules les dates « calendaires » sans heure (`started_on`) sont en `date`. Conversion vers et depuis le fuseau de l'utilisateur (`users.timezone`) uniquement à l'affichage et à la saisie.
- **Suppression** : physique, avec `on delete cascade` sur les données qui appartiennent à leur parent.

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
| `locale` | text | nullable, `CHECK in ('fr','en')` |
| `timezone` | text | requis, nom de fuseau IANA valide (validé côté application), défaut `UTC` |

Règle d'intégrité applicative : il reste toujours au moins un utilisateur avec `is_admin = true`.

### `remember_me_tokens`
Table standard d'`@adonisjs/auth` (`tokenable_id` → `users.id` en cascade).

### `invitations`
| Colonne | Type | Règles |
|---|---|---|
| `id` | uuid | PK |
| `email` | text | requis, unique, en minuscules |
| `token_hash` | text | unique |
| `expires_at` | timestamptz | création + 7 jours |
| `invited_by_id` | uuid | FK `users`, `on delete set null`, nullable |

Une invitation est supprimée quand elle est utilisée ou révoquée. La renouveler régénère le token et repousse `expires_at`.

### `password_reset_tokens`
| Colonne | Type | Règles |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK `users` cascade |
| `token_hash` | text | unique |
| `expires_at` | timestamptz | création + 24 heures |

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
| `volume_liters` | numeric(7,1) | nullable, > 0 |
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
| `unit` | text | ex. `°C`, `mg/L`, vide pour le pH |
| `decimals` | smallint | 0–3 |
| `position` | smallint | ordre d'affichage dans le catalogue |

Le libellé vient de l'i18n (`measure_types.<code>`). Les bornes de plausibilité et les profils par défaut restent dans le code du catalogue : ce sont des règles, pas des données. Un type retiré du catalogue n'est jamais supprimé s'il a des mesures.

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
| `source` | text | `CHECK in ('manual','device')`, défaut `manual` |

Index (`vivarium_id`, `measure_type_id`, `measured_at desc`) : sert à la dernière valeur, à l'historique filtré et aux graphes.

Une mesure peut exister pour un type qui n'est plus suivi : l'historique reste consultable.

## Requêtes clés

- **Dernière valeur par type** d'un vivarium : `DISTINCT ON (measure_type_id) … ORDER BY measure_type_id, measured_at DESC`, servi par l'index.
- **Série d'un graphe** : valeurs brutes si la plage contient ≤ 500 points, sinon moyenne, min et max par intervalle pour revenir sous 500 points. Les intervalles d'un jour ou plus sont calculés dans le fuseau de l'utilisateur (`date_bin(…, measured_at AT TIME ZONE :tz, …)`), pour qu'un « jour » corresponde au jour local, y compris les jours de 23 ou 25 heures au changement d'heure.
