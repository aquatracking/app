# 0001 — Monolithe AdonisJS 7 Inertia + Vue

- **Statut** : acceptée (2026-11)

## Contexte
Les tentatives précédentes ont alterné API séparée + front (Fastify + Nuxt, Fastify + Flutter, branche `cleaning` en monorepo) et monolithe Inertia (Adonis 6). Les versions à deux projets ont demandé de dupliquer les types (DTO copiés à la main) et de maintenir deux stacks, sans qu'aucune n'atteigne les fonctionnalités clés. Adonis 7 apporte des props de page Inertia typées et générées, des routes typées (`urlFor`) et des transformers.

## Décision
Une seule application AdonisJS 7, créée depuis le starter kit **Inertia + Vue** avec SSR. Pas d'API JSON publique dans le périmètre 2.0. Les futurs capteurs utiliseront quelques routes JSON authentifiées par access token dans la même application. L'UI reprend shadcn-vue.

## Conséquences
- Un seul déploiement, un seul jeu de types, de bout en bout.
- Pas d'application mobile native : l'interface web doit être confortable sur téléphone.
- Si une application mobile revient, il faudra une API (Tuyau peut générer un client typé) : ce sera une nouvelle décision.
