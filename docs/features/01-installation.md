# 01 — Installation

## Objectif
Une instance fraîchement déployée doit devenir utilisable sans qu'aucune variable d'environnement ne contienne le mot de passe d'un compte de l'application : la première personne qui l'ouvre crée le compte administrateur.

## User stories
- En tant que personne qui vient de déployer AquaTracking, je veux créer le compte administrateur depuis le navigateur pour commencer à utiliser l'instance.

## Règles métier
- L'instance est **en installation** tant que la table `users` est vide.
- Pendant l'installation, toute requête vers une page de l'application redirige vers `/setup`. Les routes de santé et les fichiers statiques restent accessibles.
- Une fois un utilisateur créé, `/setup` répond 404 et la redirection disparaît.
- Le compte créé est administrateur. La création et la vérification « aucun utilisateur » se font dans une transaction avec verrou : deux soumissions simultanées ne créent qu'un administrateur.
- Après création, l'administrateur est connecté et arrive sur la page d'accueil.
- La langue du formulaire suit le navigateur (`Accept-Language`), l'anglais s'il ne demande ni `fr` ni `en` ; la langue choisie est enregistrée comme `locale`.
- Le fuseau horaire est un champ visible : une liste avec recherche des fuseaux acceptés ([02](02-auth-profile.md#profil)), préremplie après chargement avec celui du navigateur (ou le nom de la liste qui lui correspond, `UTC` si le navigateur n'en donne pas), et enregistré comme `timezone`. Un nom hors de la liste (décalage fixe `+01:00` ou `Etc/GMT+5`, abréviation `EST`, nom inconnu) est refusé comme toute autre erreur de validation.

## Données
Écrit dans `users` (`is_admin = true`, `locale`, `timezone`, `invited_by_id` vide). `rate_limits` via le limiter (limite de soumission).

## Routes et pages
| Méthode | Route | Action | Page |
|---|---|---|---|
| GET | `/setup` | `setup.show` | `setup/show` |
| POST | `/setup` | `setup.store` | — (redirige vers l'accueil) |

Middleware global `setup` : redirige vers `/setup` si aucun utilisateur n'existe (résultat mis en cache en mémoire une fois l'installation faite, pour ne pas interroger la base à chaque requête).

## Formulaire
Prénom (requis, 100 caractères maximum ; les espaces autour sont retirés, et un prénom fait d'espaces est refusé comme un prénom vide), nom de famille (facultatif, 100 caractères maximum ; vide ou fait d'espaces, il est enregistré comme absent, `null`), email (requis, format email, 254 caractères maximum), mot de passe (requis, ≥ 8 caractères) et confirmation, langue (fr/en, préremplie depuis le navigateur), fuseau horaire (liste avec recherche, préremplie depuis le navigateur, modifiable).

## Cas d'erreur
- Validation : messages par champ.
- Soumission alors qu'un utilisateur existe déjà : 404.
- Limitation : 10 soumissions par minute et par IP. Au-delà, le formulaire affiche une notification « trop de tentatives ».

## Critères d'acceptation
- **INS-1** Avec une base vide, `GET /` redirige vers `/setup`.
- **INS-2** Avec une base vide, `GET /health/live` répond 200 sans redirection.
- **INS-3** Soumettre un formulaire valide crée un utilisateur administrateur, le connecte et redirige vers l'accueil.
- **INS-4** Après installation, `GET /setup` et `POST /setup` répondent 404.
- **INS-5** Deux `POST /setup` simultanés valides ne créent qu'un seul utilisateur.
- **INS-6** Un mot de passe de moins de 8 caractères ou une confirmation différente est refusé avec un message sur le champ.
- **INS-7** Le fuseau soumis (ex. `Europe/Paris`) est enregistré sur l'administrateur ; un nom hors de la liste des fuseaux (`Mars/Olympus_Mons`, `+01:00`, `Etc/GMT+5`, `EST`) est refusé avec un message sur le champ.
- **INS-8** Au-delà de 10 soumissions par minute depuis une même IP, la soumission suivante est refusée sans être traitée, même valide : une soumission du formulaire de la page (requête Inertia) revient sur la page avec la notification « trop de tentatives » ; toute autre requête reçoit une réponse 429.
- **INS-9** Un email de plus de 254 caractères est refusé avec un message sur le champ.
- **INS-10** Un prénom vide ou fait d'espaces, un prénom ou un nom de famille de plus de 100 caractères sont refusés avec un message sur le champ ; un prénom et un nom de famille de 100 caractères sont acceptés.
- **INS-11** Un nom de famille fait d'espaces est enregistré comme absent (`null`) ; les espaces autour du prénom sont retirés.
- **INS-12** Le formulaire s'affiche dans la langue du navigateur (`Accept-Language`), en anglais si elle n'est ni `fr` ni `en`, et la langue préremplie est celle-ci. Les textes sont vérifiés sur la page rendue par le serveur (SSR) ; la langue préremplie, sur la langue partagée avec la page (prop `locale`), à laquelle le champ est lié.
