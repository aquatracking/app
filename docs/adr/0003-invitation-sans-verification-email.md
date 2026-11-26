# 0003 — Instance sur invitation, sans vérification d'email, SMTP optionnel

- **Statut** : acceptée (2026-11)

## Contexte
AquaTracking est auto-hébergé pour un petit groupe. Beaucoup d'instances n'auront pas de serveur SMTP configuré. Les versions précédentes imposaient l'email pour vérifier les adresses et réinitialiser les mots de passe, et créaient le premier admin via des variables d'environnement contenant un mot de passe.

## Décision
- **Inscription uniquement par invitation** créée par un administrateur. Pas d'inscription ouverte.
- **Pas de vérification d'email** : ouvrir le lien d'invitation prouve la possession de l'adresse (ou sa transmission volontaire par l'admin).
- **SMTP optionnel** : si `SMTP_HOST` est vide, aucun email n'est envoyé. L'admin copie les liens d'invitation et de réinitialisation depuis l'interface et les transmet lui-même.
- **Premier administrateur** créé par un écran d'installation, accessible uniquement tant qu'aucun utilisateur n'existe.

## Conséquences
- Aucune variable d'environnement ne contient de mot de passe.
- Entre le démarrage et l'installation, n'importe qui accédant à l'instance peut devenir administrateur : la documentation de déploiement doit dire de terminer l'installation immédiatement.
- Un utilisateur qui oublie son mot de passe sur une instance sans SMTP dépend d'un administrateur.
- Si une inscription ouverte devient nécessaire, la vérification d'email reviendra avec elle.
