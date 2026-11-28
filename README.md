# AquaTracking

Suivi des paramètres de vos aquariums, terrariums et paludariums : relevés rapides, historique et graphes. Application auto-hébergée.

La version **2.0** est livrée : c'est une réécriture complète (AdonisJS 7, Vue, PostgreSQL), qui succède à la 1.x.

## Fonctionnalités

- **Installation depuis le navigateur** : la première personne qui ouvre l'instance crée le compte administrateur.
- **Comptes sur invitation**, gérés par les administrateurs ; envoi d'emails optionnel (sans SMTP, les liens sont affichés pour être transmis à la main).
- **Vivariums** : aquariums, terrariums et paludariums, avec leurs caractéristiques et une image ; archivage en lecture seule.
- **Paramètres suivis** par vivarium, choisis et ordonnés dans un catalogue (température, pH, nitrites, humidité…), préremplis selon le type de bac.
- **Relevés** saisis en quelques secondes depuis un téléphone, historique et correction.
- **Tableau de bord et graphes** de l'évolution de chaque paramètre.
- Interface en français et en anglais, affichage dans le fuseau horaire de chaque utilisateur.

## Installer

Une image Docker (`ghcr.io/aquatracking/app:2`, amd64 et arm64) et une base PostgreSQL 16 ou plus récente, derrière un reverse proxy HTTPS. Tout est décrit dans le [guide de déploiement](docs/deployment.md) : `compose.yml` d'exemple, variables d'environnement, sauvegarde, restauration et mises à jour.

## Documentation

- [Déploiement](docs/deployment.md)
- [Vision et périmètre](docs/vision.md)
- [Glossaire](docs/CONTEXT.md)
- [Architecture](docs/architecture.md)
- [Modèle de données](docs/data-model.md)
- [Décisions (ADR)](docs/adr/)
- [Specs des features](docs/features/)

## Développer

Installation locale, commandes et règles de contribution : voir [AGENTS.md](AGENTS.md).

## Licence

[MIT](LICENSE)
