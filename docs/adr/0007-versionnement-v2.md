# 0007 — La refonte est la version 2

- **Statut** : acceptée (2026-11), modifiée (2026-11) pour publier aussi les images de `main`

## Contexte
Versions publiées jusqu'ici : application Flutter `1.x` (seule version stable), serveur `0.0.1`, application Adonis 6 `0.1.0` et `0.1.1` (image Docker `aquatracking/app`). Les tentatives après la 1.x n'ont jamais atteint de version stable.

## Décision
- La refonte est la **v2**, sur la branche `rewrite/v2` puis `main`.
- Pré-versions `2.0.0-alpha.N` pendant le développement ; `2.0.0` quand les 7 features du périmètre 2.0 sont livrées.
- Semver ensuite. Tags git `vX.Y.Z`, images Docker `X`, `X.Y`, `X.Y.Z` et `latest`. Une pré-version (`X.Y.Z-rc.N`) n'a que son propre tag : ni `X`, ni `X.Y`, ni `latest`.
- Les tags flottants ne reculent jamais : `X.Y` désigne la plus haute version stable de la ligne `X.Y`, `X` celle de la ligne `X`, `latest` la plus haute de toutes. Un correctif d'une ancienne ligne (`2.0.5` publié après `2.1.0`) reçoit `2.0.5` et `2.0`, mais ni `2` ni `latest`.
- Les images sont publiées sur **GHCR seul** (`ghcr.io/aquatracking/app`), par le workflow `release.yml` au push d'un tag `v2.*`. GHCR suffit avec le `GITHUB_TOKEN` du dépôt, sans secret à gérer. Docker Hub pourra être ajouté plus tard si le besoin apparaît.
- Chaque push sur `main` publie aussi une image pour le serveur d'intégration (workflow `main.yml`) : tag fixe `sha-<SHA court>` (7 caractères) et tag flottant `main`, qui désigne la plus récente image publiée de `main` (CI et démarrage réussis) et ne recule jamais vers un commit plus ancien. Jamais `latest` ni un tag de version. Son label `org.opencontainers.image.version` est `<version de package.json>-main.<SHA court>` (par exemple `2.0.0-main.afd1564`), pour qu'elle ne soit jamais prise pour une version publiée. Ces images sont instables et réservées aux essais, jamais à la production.
- Dans les specs, on parle de « périmètre 2.0 » et jamais de « V1 ».

## Conséquences
- Pour les utilisateurs, la suite de la 1.x est claire.
- Les tags `v0.1.x` restent dans l'historique sans être poursuivis.
- Une migration fusionnée sur `main` n'est plus modifiée : le serveur d'intégration l'a déjà appliquée. Un changement de schéma passe par une nouvelle migration.
- L'image `aquatracking/app` de Docker Hub, qui contenait les versions `0.1.x`, est supprimée (2026-11) avec les secrets d'accès du dépôt : les images ne sont plus que sur `ghcr.io/aquatracking/app`.
