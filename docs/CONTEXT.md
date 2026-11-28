# Glossaire du domaine

Termes utilisés dans les specs, le code et l'interface. Le code est en anglais : chaque terme indique son nom dans le code. Si un terme manque ou devient ambigu, on met ce fichier à jour **avant** d'écrire le code.

## Instance et utilisateurs

**Instance** — Une installation d'AquaTracking (un serveur, une base). Auto-hébergée, elle sert un petit groupe de personnes.

**Utilisateur** (`User`) — Personne qui a un compte sur l'instance. Possède des vivariums. A un prénom, un nom facultatif, un email (identifiant de connexion, non modifiable en 2.0), une langue et un fuseau horaire.

**Administrateur** (`User.isAdmin`) — Utilisateur qui gère l'instance : invitations, comptes. Un administrateur **ne voit pas** les vivariums des autres utilisateurs. Il y a toujours au moins un administrateur.

**Installation** (`setup`) — État de l'instance tant qu'aucun utilisateur n'existe. Seul l'écran de création du premier administrateur est accessible.

**Invitation** (`Invitation`) — Lien à usage unique, valable 7 jours, qui permet à une adresse email de créer un compte. C'est le seul moyen d'inscription. L'invitation prouve que l'adresse appartient à la personne : il n'y a pas de vérification d'email.

**Invitant** (`User.invitedBy`) — Administrateur qui a envoyé l'invitation utilisée pour créer le compte : celui qui l'a créée ou, si elle a été renouvelée, celui qui l'a renouvelée en dernier. Les invitations acceptées sont supprimées : c'est l'utilisateur qui garde la trace de qui l'a invité, et sa date d'inscription celle de quand. Vide pour le premier administrateur ou si l'invitant a été supprimé.

**Lien de réinitialisation** (`PasswordResetToken`) — Lien à usage unique, valable 1 heure, qui permet de choisir un nouveau mot de passe. Demandé par l'utilisateur et envoyé par email si l'instance a un SMTP ; un administrateur peut aussi en générer un et le transmettre lui-même, avec ou sans SMTP.

**Se souvenir de moi** (`rememberMe`) — Option de connexion qui garde la session ouverte jusqu'à 1 an sur l'appareil (remember me token d'Adonis).

**Blocage progressif** — Blocage temporaire des tentatives de connexion après trop d'échecs, dont la durée double à chaque récidive (15 min, 30 min, 1 h… jusqu'à 24 h).

**Dernière activité** (`User.lastSeenAt`) — Moment approximatif (à l'heure près) de la dernière utilisation de l'application par l'utilisateur. Plus fiable qu'une « dernière connexion », car une session « se souvenir de moi » peut durer un an sans nouvelle connexion.

**Langue** (`User.locale`) — `fr` ou `en`. Toujours renseignée : préremplie depuis la langue du navigateur (`Accept-Language`, `en` à défaut) dans les formulaires d'installation et d'inscription, modifiable ensuite dans le profil. Avant connexion (pages de login, d'invitation…), l'interface suit la langue du navigateur.

**Fuseau horaire** (`User.timezone`) — Fuseau dans lequel l'utilisateur voit et saisit les dates et heures. Toujours un **nom de fuseau IANA** (`Europe/Paris`, `America/Toronto`), jamais un décalage fixe (`+01:00`) : le nom porte les règles de changement d'heure (heure d'été / heure d'hiver). Choisi dans la **liste des fuseaux** : `UTC` et une entrée par zone géographique du fichier `zone.tab` de l'IANA, sous le nom qu'il lui donne à une exception près (`America/Coral_Harbour`, voir [spec 02](features/02-auth-profile.md#profil)) : `Asia/Kolkata`, pas `Asia/Calcutta` ; ce nom peut être un lien IANA, comme `Europe/Amsterdam`. Elle est figée dans le code et reconnue par `Intl` comme par PostgreSQL ; les zones à décalage fixe (`Etc/GMT+5`) et les abréviations (`EST`, `CET`) n'en font pas partie. Toujours renseigné : liste avec recherche dans les formulaires d'installation et d'inscription, préremplie avec le fuseau du navigateur (`UTC` si le navigateur n'en donne pas), modifiable ensuite dans le profil. Un nom hors de la liste est refusé partout. Connu aussi hors requête (futurs emails d'alerte).

## Vivariums

**Vivarium** (`Vivarium`) — Tout bac qui héberge du vivant et dont on suit les paramètres. Terme générique du code et du glossaire ; l'interface dit plutôt « bac » en français et « tank » en anglais, ou utilise le type. « Bac » et « tank » sont des **libellés d'interface** seulement : jamais dans le code ni les identifiants. *Remplace « biotope » des versions précédentes, ambigu avec le « bac biotope » de l'aquariophilie.*

**Type de vivarium** (`Vivarium.kind`) — `aquarium`, `terrarium` ou `paludarium` (partie aquatique et partie terrestre). Fixé à la création.

**Type d'eau** (`Vivarium.waterType`) — `fresh` (douce), `brackish` (saumâtre) ou `salt` (mer). Obligatoire pour un aquarium ou un paludarium, absent pour un terrarium.

**Climat** (`Vivarium.climate`) — `tropical` (tropical humide), `desert` (désertique) ou `temperate` (tempéré). Obligatoire pour un terrarium ou un paludarium, absent pour un aquarium.

**Profil** (`Vivarium.profile`, calculé) — Combinaison du type de vivarium, du type d'eau et du climat. Détermine les mesures suivies par défaut. Ce n'est pas une entité : c'est une valeur calculée.

**Mise en service** (`Vivarium.startedOn`) — Date de mise en eau (aquarium, paludarium) ou d'installation (terrarium). Sert à afficher l'âge du bac. Ne peut pas être après la date du jour dans le fuseau de l'utilisateur. Aucun relevé ne peut lui être antérieur.

**Archivage** (`Vivarium.archivedAt`) — Un vivarium archivé est un bac démonté ou vendu. Il reste consultable avec tout son historique, mais il est en **lecture seule** : ni modification du vivarium (informations, image), ni relevé (création, modification, suppression), ni changement des mesures suivies. Seule action possible : le désarchiver. Un vivarium non archivé est **en service** (`Vivarium.active` dans le code) : c'est lui qu'affiche la page d'accueil. C'est le seul moyen pour un utilisateur de retirer un vivarium : il n'y a pas de suppression (voir [data-model](data-model.md)).

**Tableau de bord** (`vivariums.show`) — Page d'un vivarium : en-tête, une tuile par mesure suivie, accès au relevé, à l'historique et aux graphes.

**Tuile** (`Tile`) — Carré du tableau de bord pour une mesure suivie : dernière valeur, ancienneté, variation et mini-courbe.

**Mini-courbe** (`Tile.sparkline`) — Petite courbe sans axes d'une tuile : les mesures des 30 derniers jours, sur un axe temporel qui couvre toute la plage `30d`, affichée à partir de 2 mesures.

## Mesures

**Type de mesure** (`MeasureType`) — Paramètre mesurable : température, pH, nitrites… Les types forment un **catalogue fixe** défini dans le code ; les utilisateurs ne peuvent pas en créer. Chaque type a un code stable (`temperature`, `ph`, `no2`…), une unité, une précision maximale (nombre de décimales accepté à la saisie) et des bornes de plausibilité. L'interface dit « paramètre » (en anglais « parameter ») : c'est un **libellé d'interface**, le code garde `MeasureType` et les règles, données et critères d'acceptation des specs « type de mesure ». Les objectifs et récits utilisateur des specs, écrits du point de vue de l'utilisateur, emploient les libellés d'interface (« paramètre », « bac »).

**Catalogue** (`app/catalog/measure_types.ts`) — La source unique des types de mesure et des mesures suivies par défaut pour chaque profil. Synchronisé en base à chaque déploiement. Aucune entrée n'en est jamais retirée : un type qui ne doit plus être proposé y reste indéfiniment, marqué **retiré** (`retired`), et garde ses règles (bornes, décimales), qu'il ait des mesures ou non. Un code présent en base et absent du catalogue est donc toujours une erreur ([ADR 0005](adr/0005-catalogue-types-de-mesure-fixe.md)).

**Bornes de plausibilité** (`min`, `max` du catalogue) — Valeurs en dehors desquelles une saisie est forcément une erreur (pH hors de 0–14, température hors de −10–60 °C). Elles servent à la validation. Ce ne sont **pas** des seuils.

**Seuil** — *Hors périmètre 2.0.* Plage min/max souhaitée pour une mesure suivie sur un vivarium donné, qui déclenchera tuiles colorées et alertes.

**Péremption** — *Hors périmètre 2.0.* Durée, propre à chaque type de mesure, au-delà de laquelle la dernière valeur n'est plus représentative de l'état du bac.

**Mesure suivie** (`TrackedMeasure`) — Type de mesure que l'utilisateur suit sur un vivarium, avec sa position d'affichage. Les mesures suivies déterminent les tuiles du tableau de bord et les champs du formulaire de relevé. Ne plus suivre un type ne supprime pas ses mesures. L'interface dit « paramètre suivi » (« paramètres suivis », en anglais « tracked parameters »), comme pour le type de mesure ; le code garde `TrackedMeasure` et les specs « mesure suivie », hors objectifs et récits utilisateur (voir Type de mesure).

**Mesure** (`Measure`) — Une valeur d'un type de mesure, sur un vivarium, à un instant donné (`measuredAt`). A une source : `manual` (saisie) ou `device` (capteur, hors périmètre 2.0).

**Relevé** (`reading`) — Action de saisir en une fois plusieurs mesures prises au même moment (un test en bandelette, une série de tests en gouttes). Le formulaire de relevé crée une mesure par valeur remplie, toutes au même instant, tronqué à la minute. Un relevé est identifié par son vivarium et cet instant : saisir la même minute le complète, et « Modifier le relevé » permet de le corriger. Ce n'est **pas** une entité en base : `reading` n'existe que dans les routes, les actions et l'interface.

**Historique** (`measures.index`) — Liste des relevés d'un vivarium, du plus récent au plus ancien, filtrable par type de mesure.

**Dernière valeur** — Mesure la plus récente d'un type sur un vivarium. Affichée sur les tuiles du tableau de bord.

**Variation** — Écart entre la dernière valeur et la mesure précédente du même type.

**Plage** (`range`, de graphe) — Fenêtre de temps affichée : `7d`, `30d`, `3m`, `6m`, `1y`, `all` (7 jours, 30 jours, 3 mois, 6 mois, 1 an, tout).

**Agrégation** — Regroupement des mesures d'une plage en intervalles de temps (moyenne, min, max par intervalle) quand elles sont trop nombreuses pour être affichées une à une (`MAX_CHART_POINTS`).

**Intervalle** (`SeriesBin`) — Période d'une série agrégée, de durée fixe (de 1 minute à plusieurs jours), avec la moyenne, le minimum, le maximum et le nombre de ses mesures. Un intervalle d'un jour ou plus est compté en jours locaux.

## Hors périmètre 2.0

Termes réservés aux évolutions prévues dans la [vision](vision.md), à ne pas utiliser dans le code de la 2.0 :

**Capteur** (`device`) — Appareil qui envoie des mesures automatiquement. Seule exception : la valeur `device` de `measures.source`, déjà prévue pour ne pas migrer la table à l'arrivée des capteurs ([data-model](data-model.md#measures)). **Mesure calculée** — Type dérivé d'autres mesures, calculé à la lecture. **Journal** — Événements datés d'un vivarium (maintenance, population, notes). **Partage** — Accès d'autres utilisateurs à un vivarium.
