# 0007 — La refonte est la version 2

- **Statut** : acceptée (2026-11)

## Contexte
Versions publiées jusqu'ici : application Flutter `1.x` (seule version stable), serveur `0.0.1`, application Adonis 6 `0.1.0` et `0.1.1` (image Docker `aquatracking/app`). Les tentatives après la 1.x n'ont jamais atteint de version stable.

## Décision
- La refonte est la **v2**, sur la branche `rewrite/v2` puis `main`.
- Pré-versions `2.0.0-alpha.N` pendant le développement ; `2.0.0` quand les 7 features du périmètre 2.0 sont livrées.
- Semver ensuite. Tags git `vX.Y.Z`, images Docker `X`, `X.Y`, `X.Y.Z` et `latest`.
- Dans les specs, on parle de « périmètre 2.0 » et jamais de « V1 ».

## Conséquences
- Pour les utilisateurs, la suite de la 1.x est claire.
- Les tags `v0.1.x` restent dans l'historique sans être poursuivis.
