# 02 — Authentification, inscription par invitation, profil

## Objectif
Permettre aux personnes invitées de créer leur compte, de se connecter, de retrouver l'accès à leur compte et de gérer leur profil.

## User stories
- En tant que personne invitée, je veux créer mon compte depuis le lien reçu.
- En tant qu'utilisateur, je veux me connecter et rester connecté sur mon téléphone.
- En tant qu'utilisateur, je veux réinitialiser mon mot de passe si je l'ai oublié.
- En tant qu'utilisateur, je veux modifier mon nom, ma langue, mon fuseau horaire et mon mot de passe.

## Règles métier

### Connexion
- Par email (insensible à la casse) et mot de passe.
- Case « se souvenir de moi » : remember me token valable 1 an. Sans elle, la session expire à la fermeture du navigateur.
- **Limite connue** : la session est gardée dans un cookie chiffré, sans trace côté serveur ([architecture](../architecture.md)). Ce cookie n'a ni `Max-Age` ni `Expires`, et son contenu chiffré n'a pas de date d'expiration. Seule la copie du navigateur disparaît à sa fermeture, et seulement si le navigateur ne restaure pas la session. Une copie du cookie, rejouée hors du navigateur ou gardée par la restauration de session du navigateur, reste valide **sans limite de durée**, tant que `APP_KEY` ne change pas. Le serveur ne peut pas la révoquer. Les actions suivantes ne touchent qu'aux remember me tokens (en base), pas aux sessions déjà ouvertes :
  - la déconnexion vide la session du navigateur courant et supprime le remember me token de cet appareil ;
  - la réinitialisation du mot de passe supprime tous les remember me tokens de l'utilisateur ;
  - le changement de mot de passe supprime ceux des autres appareils et garde celui de l'appareil courant.
- Message d'erreur unique « identifiants invalides », que l'email existe ou non.
- Limitation des échecs de connexion, deux compteurs cumulés (`limiter.multi`) :
  - **IP + email** : 5 échecs en 15 minutes. Freine la recherche du mot de passe d'un compte précis. Une connexion réussie remet à zéro ce compteur (pas l'historique des blocages) ;
  - **IP seule** : 20 échecs en 15 minutes, tous emails confondus. Freine l'essai d'une liste d'identifiants depuis une même machine. Une connexion réussie ne remet pas ce compteur à zéro : sinon, un compte valide permettrait de relancer l'essai d'une liste d'identifiants.
- **Blocage progressif** : quand un compteur est dépassé, la clé est bloquée 15 minutes, puis la durée double à chaque nouveau blocage de la même clé (30 min, 1 h, 2 h…), plafonnée à 24 h. L'historique des blocages d'une clé est oublié 24 h après la fin de son dernier blocage.
- Pendant un blocage, le message indique quand réessayer, sans dire quel compteur a été dépassé.
- Les IP sont celles du client réel : derrière un reverse proxy, il doit être déclaré de confiance ([architecture](../architecture.md)), sinon tous les utilisateurs partageraient l'IP du proxy et se bloqueraient mutuellement.
- Pages accessibles sans connexion : connexion, inscription par invitation, mot de passe oublié, réinitialisation. Toutes les autres redirigent vers la connexion, puis vers la page demandée après connexion. La redirection vers la connexion n'emporte pas les paramètres de la page demandée (`?type=ph`) ; ils sont rendus avec elle après connexion.
- Ces quatre pages sont réservées aux visiteurs : un utilisateur déjà connecté qui en ouvre une est redirigé vers l'accueil avec un message.

### Champs communs
- Mêmes règles à l'installation ([01](01-installation.md)), à l'inscription et dans le profil : prénom requis (100 caractères maximum), nom facultatif (100 caractères maximum ; vide ou fait d'espaces, il est enregistré comme absent, `null` ; absent de la requête du profil, il reste inchangé), email au format email de 254 caractères maximum (installation, mot de passe oublié, invitation de [03](03-admin.md)), mot de passe d'au moins 8 caractères avec confirmation, langue `fr` ou `en`, fuseau de la liste des fuseaux.

### Inscription par invitation
- Le lien contient un token. S'il est inconnu ou expiré, la page affiche « invitation invalide ou expirée » et un renvoi vers la connexion.
- L'email est celui de l'invitation et n'est pas modifiable.
- Champs : prénom, nom (facultatif), mot de passe et confirmation, langue (préremplie depuis le navigateur), fuseau horaire (liste avec recherche, préremplie après chargement avec celui du navigateur, `UTC` s'il n'en donne pas, modifiable ; un nom hors de la liste est refusé, voir [Profil](#profil)).
- À la création du compte, l'auteur de l'invitation est enregistré comme `invited_by_id` du nouvel utilisateur, puis l'invitation est supprimée et l'utilisateur est connecté.
- Si un compte existe déjà avec l'email de l'invitation au moment de la soumission (créé entre-temps, par exemple par une autre invitation), l'inscription est refusée avec le message « invitation invalide ou expirée » et aucun compte n'est créé. La vérification est faite dans la transaction qui verrouille l'invitation.
- Un utilisateur déjà connecté qui ouvre un lien d'invitation est redirigé vers l'accueil avec un message (comme pour les autres pages réservées aux visiteurs) ; l'invitation reste valable.

### Mot de passe oublié
- **Avec SMTP** : l'utilisateur saisit son email ; si un compte existe, un email contient un lien valable 1 h. La réponse est la même que le compte existe ou non. Limitation : 3 demandes par heure par IP.
- **Sans SMTP** : la page explique de demander un lien à un administrateur (voir [03-admin](03-admin.md)). Une soumission du formulaire répond 404.
- Générer un lien supprime les liens précédents de l'utilisateur.
- La page de réinitialisation vérifie le token dès l'affichage. Nouveau mot de passe + confirmation. Après succès : token supprimé, remember me tokens de l'utilisateur supprimés, utilisateur connecté.

### Profil
- Modifiable : prénom, nom, langue (fr ou en), fuseau horaire (liste IANA avec recherche, ex. « Europe/Paris »).
- Si la zone du navigateur diffère de la zone **enregistrée** (comparées en entrées de la liste, et non avec la valeur en cours de saisie), le profil le signale avec un bouton « Utiliser Europe/Paris » (utile après un déménagement). Rien n'est changé automatiquement.
- **Liste des fuseaux** : `UTC` et une entrée par zone géographique du fichier `zone.tab` de l'IANA (une ligne par pays et par zone), sous le nom que ce fichier lui donne (`Asia/Kolkata`, `Europe/Kyiv`, `America/Nuuk`). Ce nom n'est pas toujours celui d'une zone principale de l'IANA : de nombreuses entrées sont des liens (`Europe/Amsterdam`, lien vers `Europe/Brussels`), gardés car `zone.tab` donne une entrée par pays. Seule exception à `zone.tab` : `America/Coral_Harbour`, nom CLDR d'`America/Atikokan`, que `Intl` ne liste pas sous ce dernier nom. La liste est figée dans le code (`app/catalog/timezones.ts`) et non lue dans `Intl.supportedValuesOf('timeZone')`, qui donne des noms CLDR historiques (`Asia/Calcutta`, `Europe/Kiev`) variables selon la version d'ICU, dont certains sont inconnus de PostgreSQL (les graphes convertissent avec `AT TIME ZONE`). Chaque nom est reconnu par `Intl` et par PostgreSQL.
- Le navigateur, ou un nom enregistré avant cette liste, peut désigner une zone sous un autre nom (`Asia/Calcutta`, `America/Montreal`) : le formulaire affiche, préremplit et propose alors l'entrée de la liste qui désigne la même zone (`Asia/Kolkata`, `America/Toronto`), jamais un nom hors de la liste.
- Un fuseau hors de la liste est refusé, y compris un nom IANA qui ne désigne qu'un décalage fixe (`Etc/GMT+5`) ou une abréviation (`EST`, `CET`) : ils ignoreraient le changement d'heure. Les décalages écrits (`+01:00`, `UTC+1`) sont refusés aussi. La casse est corrigée (`europe/paris` devient `Europe/Paris`).
- L'**email n'est pas modifiable** dans le périmètre 2.0 : c'est l'identifiant de connexion, et sans SMTP on ne peut pas vérifier une nouvelle adresse. Voir la piste dans [vision](../vision.md).
- Changer le mot de passe demande le mot de passe actuel.
- Changer le mot de passe supprime les remember me tokens des autres appareils.

### Déconnexion
- Vide la session et supprime le remember me token courant, redirige vers la connexion.

### Dernière activité
- Un middleware, sur toute requête authentifiée (y compris quand la session est restaurée par « se souvenir de moi »), met à jour `users.last_seen_at` si elle est vide ou date de plus d'une heure. La mise à jour est une requête conditionnelle qui ne touche pas `updated_at`. Affichée dans l'administration ([03](03-admin.md), ADM-13).

## Données
`users` (création avec `invited_by_id` repris de l'invitation, `locale`, `timezone` ; mise à jour du profil, du mot de passe et de `last_seen_at`), `remember_me_tokens`, `invitations` (lecture de `email` et `invited_by_id`, suppression), `password_reset_tokens`, `rate_limits` via le limiter (connexion, mot de passe oublié).

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
- Réinitialisation de mot de passe (lien, durée de validité), dans la langue de l'utilisateur.

## Critères d'acceptation
- **AUTH-1** Des identifiants valides connectent l'utilisateur et redirigent vers l'accueil ou la page demandée.
- **AUTH-2** Un email inconnu et un mauvais mot de passe produisent le même message.
- **AUTH-3** Après 5 échecs pour un même email et une même IP, la tentative suivante est refusée même avec le bon mot de passe.
- **AUTH-4** Avec « se souvenir de moi », un remember me token est créé.
- **AUTH-5** Un lien d'invitation valide affiche le formulaire avec l'email verrouillé ; le soumettre crée le compte (non admin), supprime l'invitation et connecte l'utilisateur.
- **AUTH-6** Un lien d'invitation expiré, inconnu ou déjà utilisé affiche le message d'invitation invalide et ne permet pas de créer de compte ; une invitation dont l'email a déjà un compte au moment de la soumission est refusée avec le même message, sans créer de compte.
- **AUTH-7** Avec SMTP, « mot de passe oublié » envoie un email pour un compte existant et aucun pour un email inconnu, avec la même réponse affichée.
- **AUTH-8** Sans SMTP, la page « mot de passe oublié » n'affiche pas de formulaire et renvoie vers l'administrateur.
- **AUTH-9** Un lien de réinitialisation expiré ou déjà utilisé est refusé dès l'affichage.
- **AUTH-10** Une réinitialisation réussie change le mot de passe, invalide le token et supprime les remember me tokens.
- **AUTH-11** Le formulaire de profil ne permet pas de modifier l'email : un email envoyé est ignoré. Changer le mot de passe sans le bon mot de passe actuel est refusé.
- **AUTH-12** Choisir une langue change la langue de l'interface à la page suivante ; l'inscription par invitation enregistre la langue préremplie depuis le navigateur (`en` si elle n'est ni `fr` ni `en`).
- **AUTH-13** Une page protégée demandée sans connexion redirige vers la connexion.
- **AUTH-14** L'inscription par invitation enregistre le fuseau soumis ; un nom hors de la liste des fuseaux (`Mars/Olympus`, `+01:00`, `Etc/GMT+5`, `EST`) est refusé avec un message sur le champ.
- **AUTH-15** Modifier le fuseau dans le profil change l'heure affichée des mesures existantes sans modifier les instants stockés.
- **AUTH-16** Enregistrer dans le profil un fuseau hors de la liste des fuseaux (`Mars/Olympus`, `+01:00`, `Etc/GMT+5`, `EST`, `Asia/Calcutta`) est refusé ; la page du profil propose exactement la liste des fuseaux, dont chaque nom est reconnu par `Intl` et par PostgreSQL (`AT TIME ZONE`).
- **AUTH-17** Après 20 échecs depuis une même IP sur des emails différents, toute tentative depuis cette IP est refusée, y compris pour un autre compte.
- **AUTH-18** Un deuxième blocage de la même clé dure 30 minutes, un troisième 1 heure ; la durée ne dépasse jamais 24 heures.
- **AUTH-19** Une connexion réussie remet à zéro le compteur IP + email.
- **AUTH-20** Dans « mot de passe oublié », un email de plus de 254 caractères est refusé avec un message sur le champ, sans envoi.
- **AUTH-21** Un utilisateur connecté qui ouvre la connexion, un lien d'invitation, « mot de passe oublié » ou la réinitialisation est redirigé vers l'accueil avec le message « vous êtes déjà connecté » ; l'invitation reste valable.
- **AUTH-22** Sans SMTP, une soumission du formulaire « mot de passe oublié » répond 404, sans envoi ni lien créé.
- **AUTH-23** Un profil enregistré sans le champ nom garde le nom enregistré.
- **AUTH-24** Une page protégée demandée sans connexion avec des paramètres (`?type=ph&page=2`) redirige vers `/login` sans ces paramètres ; après connexion, l'utilisateur revient à la page demandée avec ses paramètres.
- **AUTH-25** À l'inscription et dans le profil, un prénom absent ou fait d'espaces, un prénom ou un nom de plus de 100 caractères sont refusés avec un message sur le champ, sans rien enregistrer ; un prénom et un nom de 100 caractères sont acceptés. L'installation est testée par INS-10 ([01](01-installation.md)).
- **AUTH-26** À l'inscription et dans le profil, un nom fait d'espaces est enregistré comme absent (`null`) ; les espaces autour du prénom sont retirés. L'installation est testée par INS-11 ([01](01-installation.md)).
- **AUTH-27** L'historique des blocages d'une clé est oublié 24 heures après la fin de son dernier blocage (et non 24 heures après son début) ; une fois oublié, un nouveau blocage dure de nouveau 15 minutes.
- **AUTH-28** Dans le profil, un nouveau mot de passe de moins de 8 caractères ou une confirmation différente est refusé avec un message sur le champ, et le mot de passe reste inchangé ; un mot de passe de 8 caractères est accepté.
- **AUTH-29** Sans « se souvenir de moi », le cookie de session posé à la connexion n'a ni `Max-Age` ni `Expires` : il disparaît à la fermeture du navigateur.
