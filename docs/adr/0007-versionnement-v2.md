# 0007 — La refonte est la version 2

- **Statut** : acceptée (2026-11)

## Contexte
Versions publiées jusqu'ici : application Flutter `1.x` (seule version stable), serveur `0.0.1`, application Adonis 6 `0.1.0` et `0.1.1` (image Docker `aquatracking/app`). Les tentatives après la 1.x n'ont jamais atteint de version stable.

## Décision
- La refonte est la **v2**, sur la branche `rewrite/v2` puis `main`.
- Pré-versions `2.0.0-alpha.N` pendant le développement ; `2.0.0` quand les 7 features du périmètre 2.0 sont livrées.
- Semver ensuite. Tags git `vX.Y.Z`, images Docker `X`, `X.Y`, `X.Y.Z` et `latest`. Une pré-version (`X.Y.Z-rc.N`) n'a que son propre tag : ni `X`, ni `X.Y`, ni `latest`.
- Les images sont publiées sur **GHCR seul** (`ghcr.io/aquatracking/app`), par le workflow `release.yml` au push d'un tag `v2.*`. GHCR suffit avec le `GITHUB_TOKEN` du dépôt, sans secret à gérer. Docker Hub (`aquatracking/app`, où sont les images `0.1.x`) pourra être ajouté plus tard si le besoin apparaît.
- Dans les specs, on parle de « périmètre 2.0 » et jamais de « V1 ».

## Conséquences
- Pour les utilisateurs, la suite de la 1.x est claire.
- Les tags `v0.1.x` restent dans l'historique sans être poursuivis.
- Les utilisateurs des images `0.1.x` sur Docker Hub doivent passer à `ghcr.io/aquatracking/app` : l'image `aquatracking/app` de Docker Hub ne reçoit pas la v2.
