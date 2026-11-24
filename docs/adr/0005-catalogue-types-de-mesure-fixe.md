# 0005 — Catalogue fixe de types de mesure

- **Statut** : acceptée (2026-11)

## Contexte
Trois approches ont été essayées : catalogue géré par l'admin (serveur Fastify, sans données initiales : rien ne marchait à l'installation), liste en dur dans le code (Adonis 6, mais sans clé étrangère), et l'option de types personnalisés par utilisateur a été envisagée. Les types personnalisés complexifient tout : unicité, traductions, recommandations par profil, comparaisons entre vivariums.

## Décision
- Les types de mesure forment un **catalogue fixe** défini dans `app/catalog/measure_types.ts` : code, unité, décimales, bornes de plausibilité, profils pour lesquels le type est suivi par défaut.
- Un seeder idempotent synchronise la table `measure_types` à chaque démarrage (insertion des nouveaux codes, mise à jour des unités et positions). Il ne supprime jamais un type qui a des mesures.
- Les libellés et descriptions sont dans l'i18n.
- Ni les utilisateurs ni les administrateurs ne créent de types.

## Conséquences
- Une instance fraîchement installée est immédiatement utilisable.
- Ajouter un type (ex. silicates) demande une release : acceptable pour un catalogue qui évolue rarement.
- Les codes sont stables et servent de clé pour les traductions et, plus tard, pour l'API capteurs.
