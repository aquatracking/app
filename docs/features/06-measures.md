# 06 — Mesures : relevé, historique, correction

## Objectif
Saisir en quelques secondes les valeurs d'un test, retrouver tous les relevés passés et corriger une erreur de saisie.

## User stories
- En tant qu'utilisateur, devant mon bac avec mon téléphone, je veux saisir d'un coup les résultats de mes tests.
- En tant qu'utilisateur, je veux saisir un relevé fait plus tôt (ce matin, la semaine dernière).
- En tant qu'utilisateur, je veux consulter l'historique de mes mesures, filtré par paramètre.
- En tant qu'utilisateur, je veux compléter un relevé (un test fait un peu plus tard), corriger une valeur saisie par erreur ou supprimer un relevé.

## Règles métier

### Relevé ([ADR 0006](../adr/0006-releve-sans-entite.md))
- Accessible depuis le tableau de bord du vivarium par un bouton « Nouveau relevé » toujours visible (bouton flottant sur mobile). S'ouvre dans une fenêtre (plein écran sur mobile).
- Champs : date et heure (défaut maintenant), saisies et affichées dans le **fuseau de l'utilisateur** ([CONTEXT](../CONTEXT.md)), puis un champ numérique par **mesure suivie**, dans l'ordre des mesures suivies, avec l'unité affichée et au plus le nombre de décimales du type ([05](05-tracked-measures.md), sens de `decimals`).
- Les champs vides sont ignorés. Il faut au moins une valeur.
- Un nouveau relevé ne peut contenir que des types **suivis** par le vivarium (la modification accepte en plus les types déjà présents dans le groupe, voir plus bas).
- Chaque valeur doit être dans les bornes de plausibilité du type ([05](05-tracked-measures.md)). La virgule et le point sont acceptés comme séparateur décimal. Les zéros finaux ne comptent pas comme décimales (`25,30` vaut 25,3).
- La date ne peut pas être dans le futur (tolérance 5 minutes) ni antérieure à la mise en service du vivarium. La comparaison avec la mise en service se fait sur la **date locale** du relevé, dans le fuseau de l'utilisateur.
- **Changement d'heure** : l'heure saisie est convertie en instant avec les règles du fuseau à cette date (un relevé de janvier et un de juillet à « 18:00 » à Paris donnent 17:00 et 16:00 UTC).
  - Heure **inexistante** (passage à l'heure d'été, ex. 02:30 le dernier dimanche de mars à Paris) : refusée avec un message qui l'explique.
  - Heure **ambiguë** (passage à l'heure d'hiver, ex. 02:30 qui existe deux fois fin octobre) : la première occurrence (heure d'été) est retenue.
- L'instant est **tronqué à la minute** (secondes et millisecondes à zéro), y compris pour la valeur par défaut « maintenant ». Saisir la même date et la même heure qu'un relevé existant revient donc à le rejoindre. Les mesures de capteurs (hors 2.0) garderont leur précision à la seconde.
- Chaque valeur crée une `Measure` (`source = manual`), toutes avec le même `measured_at`. L'ensemble est enregistré dans une transaction.
- **Unicité** : un vivarium ne peut pas avoir deux mesures du même type au même instant (contrainte unique en base). Si un nouveau relevé tombe sur une minute qui contient déjà une valeur d'un des types saisis, il est refusé en entier, avec un message qui propose de modifier le relevé existant. Cela empêche aussi les doublons par double envoi du formulaire : quand deux envois simultanés passent la vérification en même temps, la contrainte unique refuse le second, présenté comme le même conflit et jamais comme une erreur serveur.
- Après enregistrement : retour au tableau de bord, mis à jour, avec un message « Relevé enregistré (n mesures) ».
- Impossible sur un vivarium archivé.
- Si le vivarium ne suit aucun type, le formulaire n'a aucun champ de valeur : il invite à ajouter des mesures suivies ([05](05-tracked-measures.md)), avec un lien vers leur page.

### Historique
- Page par vivarium, relevés les plus récents en premier : chaque groupe réunit les mesures de même `measured_at` (un groupe = un relevé).
- Filtre par type de mesure (tous les types ayant au moins une mesure, suivis ou non). Un type inconnu dans l'URL (`?type=`) renvoie une liste vide.
- Pagination **par relevés** : 20 relevés par page. Un relevé n'est jamais coupé entre deux pages.
- Valeurs affichées telles que saisies, sans zéros forcés, et formatées selon la langue (`7,25` / `7.25`).

### Modifier un relevé
- Chaque groupe de l'historique a un bouton « Modifier ». Depuis l'historique filtré par type, cliquer sur une mesure ouvre de même son relevé. C'est le **seul** moyen de corriger des mesures : il n'y a pas d'édition mesure par mesure.
- Il ouvre le **même formulaire que le relevé**, prérempli avec la date et l'heure du groupe et ses valeurs. Champs proposés : les mesures suivies, plus les types présents dans le groupe même s'ils ne sont plus suivis.
- À l'enregistrement, dans une transaction :
  - valeur modifiée → mise à jour ;
  - champ rempli qui était vide → nouvelle mesure, c'est ainsi qu'on **complète** un relevé ;
  - champ vidé → la mesure est supprimée ;
  - date ou heure modifiée → toutes les mesures du groupe sont déplacées.
- Mêmes règles qu'à la création : au moins une valeur, bornes, décimales, dates, troncature à la minute, unicité. Déplacer un relevé vers une minute qui contient déjà un des mêmes types est refusé ; vers une minute qui ne contient que d'autres types, les deux relevés n'en forment plus qu'un.
- Si le relevé n'existe plus au moment d'enregistrer (supprimé ou déplacé entre-temps, par exemple depuis un autre onglet), l'enregistrement répond 404 et ne recrée aucune mesure.
- Pour tout supprimer, on utilise « Supprimer le relevé » et non un formulaire vide.

### Supprimer un relevé
- Depuis l'historique : supprime toutes les mesures du groupe (même vivarium, même `measured_at`), avec une confirmation qui indique le nombre de mesures.
- Le bouton n'est pas proposé dans l'historique filtré par type : il supprimerait aussi les mesures des autres types, qui n'y sont pas affichées. « Modifier » y reste disponible.

### Vivarium archivé
- Création, modification et suppression de relevés sont refusées.

### Ajouts à la feature 04
La 04 a été livrée avant la table `measures`. La 06 y ajoute :
- la **date du dernier relevé** sur les cartes de l'accueil et des archivés (une seule requête pour tous les vivariums de la liste, pas de N+1) ;
- la règle de modification de la mise en service ([04](04-vivariums.md)) : la nouvelle date `started_on` ne peut pas être postérieure à la date locale (fuseau de l'utilisateur) du plus ancien relevé du vivarium ; le message indique cette date (critère VIV-12, reporté ici). La règle ne s'applique que si `started_on` change : une modification qui garde la date enregistrée est acceptée.

## Données
`measures` (création, lecture, modification et suppression par relevé), `tracked_measures` et `measure_types` (lecture), `vivariums` (lecture : `started_on`, `archived_at` ; validation de la modification de `started_on`).

## Routes et pages
| Méthode | Route | Action | Page |
|---|---|---|---|
| POST | `/vivariums/:id/readings` | `measures.storeReading` | — (fenêtre sur `vivariums/show`) |
| GET | `/vivariums/:id/measures` | `measures.index` | `measures/index` |
| GET | `/vivariums/:id/readings/:measuredAt/edit` | `measures.editReading` | — (fenêtre sur `measures/index`) |
| PUT | `/vivariums/:id/readings/:measuredAt` | `measures.updateReading` | — |
| DELETE | `/vivariums/:id/readings/:measuredAt` | `measures.destroyReading` | — |

`:measuredAt` est l'instant du relevé en ISO 8601 UTC (`2026-11-26T17:42:00Z`). Un relevé qui n'existe pas (aucune mesure à cet instant sur ce vivarium) répond 404.

## Critères d'acceptation
- **MEA-1** Un relevé avec trois valeurs remplies sur cinq champs crée exactement trois mesures avec le même `measured_at`, en une seule transaction : une erreur sur l'une des mesures n'en laisse aucune.
- **MEA-2** Un relevé sans aucune valeur est refusé.
- **MEA-3** Une valeur hors bornes de plausibilité (ex. pH 15) est refusée avec un message sur le champ, et aucune mesure du relevé n'est créée.
- **MEA-4** `7,5` et `7.5` sont acceptés et enregistrés comme 7,5.
- **MEA-5** Une date dans le futur (au-delà de 5 minutes) ou antérieure à la mise en service est refusée.
- **MEA-6** Un relevé sur un vivarium archivé est refusé.
- **MEA-7** Un nouveau relevé ne peut contenir que des types suivis par le vivarium ; la modification accepte en plus les types déjà présents dans le groupe.
- **MEA-8** L'historique affiche les relevés du plus récent au plus ancien, 20 par page, et toutes les mesures d'un relevé sont sur la même page.
- **MEA-9** Le filtre par type ne renvoie que les mesures de ce type, y compris pour un type qui n'est plus suivi.
- **MEA-10** Modifier un relevé met à jour les valeurs changées, crée les valeurs ajoutées, supprime les valeurs vidées et déplace toutes les mesures si la date change, en une seule transaction ; une valeur hors bornes annule tout.
- **MEA-11** Supprimer un relevé supprime toutes les mesures de ce vivarium à ce `measured_at`, et seulement celles-là.
- **MEA-12** Toutes les routes répondent 404 pour le vivarium d'un autre utilisateur, ou pour un relevé qui n'existe pas sur le vivarium de l'URL.
- **MEA-13** Pour un utilisateur en `Europe/Paris`, un relevé saisi le 15 janvier à 18:00 est enregistré à 17:00 UTC, et un relevé saisi le 15 juillet à 18:00 à 16:00 UTC ; les deux s'affichent à 18:00.
- **MEA-14** Une heure inexistante dans le fuseau de l'utilisateur (ex. 2027-03-28 02:30 à Paris) est refusée ; une heure ambiguë (2027-10-31 02:30 à Paris) est enregistrée à 00:30 UTC.
- **MEA-15** La même mesure s'affiche à des heures locales différentes pour deux utilisateurs de fuseaux différents ; l'instant stocké ne change pas.
- **MEA-16** Une valeur avec plus de décimales que permis par le type (ex. température `25,35`) est refusée ; `10` saisi en nitrates s'affiche « 10 » et non « 10,0 ».
- **MEA-17** Un relevé saisi à 18:42:37 est enregistré à 18:42:00 ; un second relevé saisi à « 18:42 » le même jour avec d'autres types rejoint le même groupe.
- **MEA-18** Un nouveau relevé qui contient un type déjà mesuré à la même minute est refusé en entier, sans créer aucune mesure. Deux envois simultanés du même relevé créent ses mesures une seule fois : le second est refusé avec le message de conflit sur la date, pas par une erreur 500.
- **MEA-19** Déplacer un relevé vers une minute qui contient déjà un des mêmes types est refusé ; vers une minute qui ne contient que d'autres types, les deux groupes fusionnent.
- **MEA-20** Il n'existe aucune route pour modifier ou supprimer une mesure seule.
- **MEA-21** ([VIV-12](04-vivariums.md)) Déplacer la mise en service d'un vivarium après la date locale de son plus ancien relevé est refusé ; à cette date ou avant, c'est accepté ; une modification qui garde la date enregistrée est acceptée même si elle est postérieure. Les cartes de l'accueil affichent la date du dernier relevé.
- **MEA-22** ([VIV-13](04-vivariums.md)) Supprimer un utilisateur depuis l'administration supprime les mesures de ses vivariums.
- **MEA-23** ([TRK-3](05-tracked-measures.md)) Les bornes et les décimales d'un type marqué `retired` valident toujours la modification d'un relevé qui le contient.
- **MEA-24** ([05](05-tracked-measures.md)) Sur un vivarium qui ne suit aucun type, le relevé invite à ajouter des mesures suivies.
- **MEA-25** Enregistrer la modification d'un relevé supprimé ou déplacé entre-temps répond 404 et ne crée aucune mesure.
