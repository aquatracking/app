# 02 — Authentification, inscription par invitation, profil

## Objectif
Permettre aux personnes invitées de créer leur compte, de se connecter, de retrouver l'accès à leur compte et de gérer leur profil.

## User stories
- En tant que personne invitée, je veux créer mon compte depuis le lien reçu.
- En tant qu'utilisateur, je veux me connecter et rester connecté sur mon téléphone.
- En tant qu'utilisateur, je veux réinitialiser mon mot de passe si je l'ai oublié.
- En tant qu'utilisateur, je veux modifier mon nom, mon email, ma langue et mon mot de passe.

## Règles métier

### Connexion
- Par email (insensible à la casse) et mot de passe.
- Case « se souvenir de moi » : remember me token valable 1 an. Sans elle, la session expire à la fermeture du navigateur.
- Message d'erreur unique « identifiants invalides », que l'email existe ou non.
- Limitation : 5 tentatives par 15 minutes par couple IP + email, puis blocage 15 minutes.
- Pages accessibles sans connexion : connexion, inscription par invitation, mot de passe oublié, réinitialisation. Toutes les autres redirigent vers la connexion, puis vers la page demandée après connexion.

### Inscription par invitation
- Le lien contient un token. S'il est inconnu ou expiré, la page affiche « invitation invalide ou expirée » et un renvoi vers la connexion.
- L'email est celui de l'invitation et n'est pas modifiable.
- Champs : prénom, nom (facultatif), mot de passe et confirmation, langue (préremplie depuis le navigateur), fuseau horaire (prérempli avec celui du navigateur, modifiable ; UTC s'il est absent ou invalide).
- À la création du compte, l'invitation est supprimée et l'utilisateur est connecté.
- Un utilisateur déjà connecté qui ouvre un lien d'invitation est redirigé vers l'accueil avec un message.

### Mot de passe oublié
- **Avec SMTP** : l'utilisateur saisit son email ; si un compte existe, un email contient un lien valable 1 h. La réponse est la même que le compte existe ou non. Limitation : 3 demandes par heure par IP.
- **Sans SMTP** : la page explique de demander un lien à un administrateur (voir [03-admin](03-admin.md)).
- Générer un lien supprime les liens précédents de l'utilisateur.
- La page de réinitialisation vérifie le token dès l'affichage. Nouveau mot de passe + confirmation. Après succès : token supprimé, remember me tokens de l'utilisateur supprimés, utilisateur connecté.

### Profil
- Modifiable : prénom, nom, email, langue (fr ou en), fuseau horaire (liste IANA avec recherche, ex. « Europe/Paris »).
- Si le fuseau du navigateur diffère du fuseau enregistré, le profil le signale avec un bouton « Utiliser Europe/Paris » (utile après un déménagement). Rien n'est changé automatiquement.
- Un fuseau qui n'est pas un nom IANA valide est refusé. Les décalages fixes (`+01:00`, `UTC+1`) ne sont pas proposés : ils ignoreraient le changement d'heure.
- Changer l'email ou le mot de passe demande le mot de passe actuel.
- Le nouvel email doit être libre (ni utilisateur, ni invitation en attente).
- Changer le mot de passe supprime les remember me tokens des autres appareils.

### Déconnexion
- Supprime la session et le remember me token courant, redirige vers la connexion.

## Données
`users`, `remember_me_tokens`, `invitations` (lecture, suppression), `password_reset_tokens`.

## Routes et pages
| Méthode | Route | Action | Page |
|---|---|---|---|
| GET/POST | `/login` | `auth/session.create` / `store` | `auth/login` |
| POST | `/logout` | `auth/session.destroy` | — |
| GET/POST | `/invitations/:token` | `auth/registration.create` / `store` | `auth/register` |
| GET/POST | `/forgot-password` | `auth/password_reset.create` / `store` | `auth/forgot_password` |
| GET/POST | `/reset-password/:token` | `auth/password_reset.edit` / `update` | `auth/reset_password` |
| GET | `/profile` | `profile.edit` | `profile/edit` |
| PUT | `/profile` | `profile.update` | — |
| PUT | `/profile/password` | `profile.updatePassword` | — |

## Emails (si SMTP)
- Réinitialisation de mot de passe (lien, durée de validité), dans la langue de l'utilisateur ou, à défaut, celle de la requête.

## Critères d'acceptation
- **AUTH-1** Des identifiants valides connectent l'utilisateur et redirigent vers l'accueil ou la page demandée.
- **AUTH-2** Un email inconnu et un mauvais mot de passe produisent le même message.
- **AUTH-3** Après 5 échecs pour un même email et une même IP, la tentative suivante est refusée même avec le bon mot de passe.
- **AUTH-4** Avec « se souvenir de moi », un remember me token est créé.
- **AUTH-5** Un lien d'invitation valide affiche le formulaire avec l'email verrouillé ; le soumettre crée le compte (non admin), supprime l'invitation et connecte l'utilisateur.
- **AUTH-6** Un lien d'invitation expiré, inconnu ou déjà utilisé affiche le message d'invitation invalide et ne permet pas de créer de compte.
- **AUTH-7** Avec SMTP, « mot de passe oublié » envoie un email pour un compte existant et aucun pour un email inconnu, avec la même réponse affichée.
- **AUTH-8** Sans SMTP, la page « mot de passe oublié » n'affiche pas de formulaire et renvoie vers l'administrateur.
- **AUTH-9** Un lien de réinitialisation expiré ou déjà utilisé est refusé dès l'affichage.
- **AUTH-10** Une réinitialisation réussie change le mot de passe, invalide le token et supprime les remember me tokens.
- **AUTH-11** Modifier l'email sans le bon mot de passe actuel est refusé ; avec, il est enregistré en minuscules.
- **AUTH-12** Choisir une langue change la langue de l'interface à la page suivante ; l'inscription par invitation enregistre la langue préremplie depuis le navigateur (`en` si elle n'est ni `fr` ni `en`).
- **AUTH-13** Une page protégée demandée sans connexion redirige vers la connexion.
- **AUTH-14** L'inscription par invitation enregistre le fuseau envoyé par le navigateur ; un fuseau absent ou invalide donne `UTC`.
- **AUTH-15** Modifier le fuseau dans le profil change l'heure affichée des mesures existantes sans modifier les instants stockés.
- **AUTH-16** Enregistrer un fuseau non IANA (`Mars/Olympus`, `+01:00`) est refusé.
