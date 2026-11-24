# 01 — Installation

## Objectif
Une instance fraîchement déployée doit devenir utilisable sans variable d'environnement contenant un mot de passe : la première personne qui l'ouvre crée le compte administrateur.

## User stories
- En tant que personne qui vient de déployer AquaTracking, je veux créer le compte administrateur depuis le navigateur pour commencer à utiliser l'instance.

## Règles métier
- L'instance est **en installation** tant que la table `users` est vide.
- Pendant l'installation, toute requête vers une page de l'application redirige vers `/setup`. Les routes de santé et les fichiers statiques restent accessibles.
- Une fois un utilisateur créé, `/setup` répond 404 et la redirection disparaît.
- Le compte créé est administrateur. La création et la vérification « aucun utilisateur » se font dans une transaction avec verrou : deux soumissions simultanées ne créent qu'un administrateur.
- Après création, l'administrateur est connecté et arrive sur la page d'accueil.
- La langue du formulaire suit le navigateur ; la langue choisie est enregistrée comme `locale`.

## Données
Écrit dans `users` (`is_admin = true`).

## Routes et pages
| Méthode | Route | Action | Page |
|---|---|---|---|
| GET | `/setup` | `setup.show` | `setup/show` |
| POST | `/setup` | `setup.store` | — (redirige vers l'accueil) |

Middleware global `setup` : redirige vers `/setup` si aucun utilisateur n'existe (résultat mis en cache en mémoire une fois l'installation faite, pour ne pas interroger la base à chaque requête).

## Formulaire
Prénom (requis), nom (facultatif), email (requis, format email), mot de passe (requis, ≥ 8 caractères) et confirmation, langue (fr/en, préremplie depuis le navigateur).

## Cas d'erreur
- Validation : messages par champ.
- Soumission alors qu'un utilisateur existe déjà : 404.
- Limitation : 10 soumissions par minute et par IP.

## Critères d'acceptation
- **INS-1** Avec une base vide, `GET /` redirige vers `/setup`.
- **INS-2** Avec une base vide, `GET /health/live` répond 200 sans redirection.
- **INS-3** Soumettre un formulaire valide crée un utilisateur administrateur, le connecte et redirige vers l'accueil.
- **INS-4** Après installation, `GET /setup` et `POST /setup` répondent 404.
- **INS-5** Deux `POST /setup` simultanés valides ne créent qu'un seul utilisateur.
- **INS-6** Un mot de passe de moins de 8 caractères ou une confirmation différente est refusé avec un message sur le champ.
