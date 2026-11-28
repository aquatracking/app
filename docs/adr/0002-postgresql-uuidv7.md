# 0002 — PostgreSQL et identifiants UUIDv7

- **Statut** : acceptée (2026-11)

## Contexte
Les versions précédentes utilisaient MariaDB puis MySQL. Le cœur de l'application est une série temporelle de mesures : dernière valeur par type, agrégation par intervalle pour les graphes, et plus tard des volumes plus importants avec les capteurs. Les identifiants étaient des UUID v4, mal adaptés aux index B-tree (insertions dispersées).

## Décision
- Base **PostgreSQL** (version 16 minimum, l'image de dev utilise la dernière stable).
- Identifiants **UUIDv7** pour toutes les tables de l'application, générés côté application (hook `beforeCreate` commun) pour ne pas dépendre de `uuidv7()` de PostgreSQL 18.
- Exceptions : les tables dont le format est imposé par une bibliothèque, qui les écrit elle-même ([data-model](../data-model.md)) :
  - `remember_me_tokens` (table standard d'`@adonisjs/auth`) : clé `id` entière auto-incrémentée, car le fournisseur de tokens insère les lignes sans identifiant ; sa colonne `tokenable_id` reste un UUID vers `users` ;
  - `rate_limits` (store database d'`@adonisjs/limiter`) : clé primaire `key` (texte), au format de `rate-limiter-flexible`.

## Conséquences
- `DISTINCT ON`, `date_bin`/`date_trunc`, `timestamptz` et contraintes `CHECK` disponibles sans contournement.
- Les UUIDv7 sont triés dans le temps : bons pour les index, et les identifiants dans les URLs ne sont pas devinables par incrément.
- Pas de migration des données des anciennes versions (aucune donnée de production à reprendre).
- Extension possible vers TimescaleDB si les capteurs produisent de gros volumes.
