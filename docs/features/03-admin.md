# 03 — Administration : utilisateurs et invitations

## Objectif
Permettre aux administrateurs d'inviter des personnes et de gérer les comptes de l'instance, avec ou sans SMTP.

## User stories
- En tant qu'administrateur, je veux inviter quelqu'un par son email et lui transmettre le lien moi-même si l'instance n'envoie pas d'email.
- En tant qu'administrateur, je veux voir les invitations en attente, les renouveler ou les révoquer.
- En tant qu'administrateur, je veux voir les utilisateurs, nommer d'autres administrateurs, supprimer un compte et générer un lien de réinitialisation de mot de passe.

## Règles métier

### Accès
- Section accessible aux seuls administrateurs (middleware `admin` + policies). Un non-admin reçoit 403.
- Lien « Administration » dans la navigation, visible seulement des administrateurs.
- Un administrateur ne voit **aucune** donnée de vivarium des autres utilisateurs, seulement leur nombre de vivariums.

### Invitations
- Créer : un email. Refusé si un utilisateur a déjà cet email. Si une invitation existe déjà pour cet email, elle est renouvelée.
- Après création ou renouvellement, l'interface **affiche le lien** avec un bouton « copier ». C'est le seul moment où le lien est visible : le token n'est stocké que haché.
- Si SMTP est configuré, un email d'invitation est aussi envoyé (dans la langue de l'administrateur).
- Renouveler : nouveau token, expiration repoussée à +7 jours, l'ancien lien ne fonctionne plus.
- Révoquer : supprime l'invitation.
- Liste : email, invité par, date d'expiration, statut (en attente / expirée).

### Utilisateurs
- Liste : nom affiché, email, administrateur oui/non, nombre de vivariums, date de création.
- Nommer ou retirer administrateur. Impossible de retirer le dernier administrateur. Un administrateur ne peut pas se retirer lui-même ses droits.
- Supprimer un compte : confirmation en saisissant l'email du compte. Supprime aussi ses vivariums, mesures et images. Impossible de supprimer son propre compte depuis cette page, ou le dernier administrateur.
- Générer un lien de réinitialisation pour un utilisateur : même logique que [02](02-auth-profile.md) (1 h, remplace les précédents ; l'administrateur en régénère un s'il a expiré avant d'être utilisé). Le lien est affiché avec « copier » et, si SMTP, peut aussi être envoyé par email.

## Données
`users`, `invitations`, `password_reset_tokens`, suppression en cascade de `vivariums` et des fichiers images.

## Routes et pages
| Méthode | Route | Action | Page |
|---|---|---|---|
| GET | `/admin/users` | `admin/users.index` | `admin/users/index` |
| PUT | `/admin/users/:id/admin` | `admin/users.toggleAdmin` | — |
| DELETE | `/admin/users/:id` | `admin/users.destroy` | — |
| POST | `/admin/users/:id/password-reset` | `admin/users.createPasswordReset` | — |
| GET | `/admin/invitations` | `admin/invitations.index` | `admin/invitations/index` |
| POST | `/admin/invitations` | `admin/invitations.store` | — |
| POST | `/admin/invitations/:id/renew` | `admin/invitations.renew` | — |
| DELETE | `/admin/invitations/:id` | `admin/invitations.destroy` | — |

Le lien généré (invitation ou reset) revient à la page par un flash dédié, affiché dans une fenêtre avec bouton « copier ».

## Critères d'acceptation
- **ADM-1** Un utilisateur non admin reçoit 403 sur toutes les routes `/admin/*`.
- **ADM-2** Créer une invitation pour un email libre crée l'invitation et affiche un lien qui permet de s'inscrire ([AUTH-5](02-auth-profile.md)).
- **ADM-3** Créer une invitation pour l'email d'un utilisateur existant est refusé.
- **ADM-4** Créer une invitation pour un email déjà invité la renouvelle : l'ancien lien devient invalide.
- **ADM-5** Avec SMTP, créer une invitation envoie un email à l'adresse invitée ; sans SMTP, aucun email n'est envoyé.
- **ADM-6** Révoquer une invitation rend son lien invalide.
- **ADM-7** Retirer les droits du dernier administrateur est refusé ; retirer ses propres droits est refusé.
- **ADM-8** Supprimer un utilisateur supprime ses vivariums, ses mesures et ses fichiers images.
- **ADM-9** Supprimer son propre compte depuis l'administration est refusé.
- **ADM-10** Générer un lien de réinitialisation affiche un lien utilisable une fois ([AUTH-10](02-auth-profile.md)) et invalide les liens précédents.
- **ADM-11** La page des utilisateurs n'expose ni noms ni contenus de vivariums.
