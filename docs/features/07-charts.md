# 07 — Tableau de bord du vivarium et graphes

## Objectif
Voir d'un coup d'œil l'état actuel d'un bac et l'évolution de chaque paramètre dans le temps.

## User stories
- En tant qu'utilisateur, je veux voir la dernière valeur de chaque paramètre suivi et depuis quand elle date.
- En tant qu'utilisateur, je veux voir l'évolution d'un paramètre sur une période et ses statistiques.
- En tant qu'utilisateur, je veux comparer rapidement les tendances de tous mes paramètres.

## Règles métier

### Tableau de bord (`/vivariums/:id`)
- En-tête : créé par [04](04-vivariums.md) (image, nom, type et profil, volume, âge, actions modifier et archiver, bandeau archivé avec « Désarchiver »). Les liens « Paramètres suivis » ([05](05-tracked-measures.md), page des mesures suivies) et « Historique » ([06](06-measures.md)) y sont ajoutés par leurs features ; sur un vivarium archivé, seuls « Désarchiver » et « Historique » restent.
- Une **tuile par mesure suivie**, dans l'ordre des mesures suivies :
  - libellé, dernière valeur avec unité, ancienneté (« il y a 3 jours ») ;
  - variation par rapport à la mesure précédente du même type (flèche et écart, ex. « ▲ 0,3 ») ;
  - mini-courbe des 30 derniers jours (même bornes que la plage `30d`), sur un axe temporel réel et sans axes, si au moins 2 mesures sur la période ;
  - « Aucune mesure » si le type n'a jamais été mesuré.
- Si le vivarium ne suit aucun type, à la place des tuiles : un message qui invite à en ajouter, avec un lien vers les mesures suivies ([05](05-tracked-measures.md)), sauf si archivé.
- Cliquer sur une tuile ouvre le graphe du type.
- Bouton « Nouveau relevé » ([06](06-measures.md)), sauf si archivé.
- Pas de couleur liée à une valeur « bonne » ou « mauvaise » : ce sera le rôle des seuils (hors périmètre 2.0).

### Graphe d'un type (`/vivariums/:id/charts/:code`)
- Plages : 7 jours, 30 jours (défaut), 3 mois, 6 mois, 1 an, tout. La plage choisie est dans l'URL : `?range=` parmi `7d`, `30d`, `3m`, `6m`, `1y`, `all`.
- Bornes d'une plage : elle se termine maintenant et commence à minuit local, de sorte qu'elle compte sa durée **aujourd'hui compris** : `7d` est aujourd'hui et les 6 jours précédents, `3m` commence le lendemain de la même date 3 mois plus tôt (de même pour `30d`, `6m`, `1y`). `all` commence à minuit local du jour de la première mesure du type.
- Courbe des valeurs dans le temps, axe des abscisses temporel réel (des mesures irrégulières ne sont pas espacées régulièrement), points visibles quand il y a moins de 100 points.
- Infobulle : date et heure, valeur.
- Axe, infobulles et statistiques en heure locale du **fuseau de l'utilisateur**. Les limites de plage (« 7 jours ») et les intervalles d'agrégation d'un jour ou plus sont calculés en jours locaux : un jour de changement d'heure dure 23 ou 25 heures et reste un seul intervalle.
- **Agrégation** : si la plage contient plus de `MAX_CHART_POINTS` (500, justification dans [data-model](../data-model.md)) mesures, le serveur renvoie au plus 500 intervalles (`date_bin`), avec moyenne, min et max par intervalle ; le graphe affiche la moyenne et une bande min–max. Sinon, valeurs brutes.
  - La durée d'un intervalle est la plus petite de 1, 5, 15 et 30 minutes, 1, 3, 6 et 12 heures qui découpe la plage en au plus 500 intervalles (ex. `7d` → 30 min, `30d` → 3 h). Au-delà, c'est un nombre entier de jours : le nombre de jours de la plage plus un (marge pour les jours de 25 heures), divisé par 500 et arrondi à l'entier supérieur (ex. `1y` → 1 jour ; une plage de 999,5 jours → 3 jours, et non 2). Les intervalles commencent au début de la plage.
  - Les intervalles de moins d'un jour sont en temps absolu ; ceux d'un jour ou plus en jours locaux.
  - Infobulle d'un intervalle : sa période, la moyenne, le min–max et le nombre de mesures. Sous le graphe, une phrase indique la durée des intervalles.
- La courbe relie les points par des segments droits : elle n'invente pas de valeur entre deux mesures.
- Statistiques de la plage : dernière valeur, minimum, maximum, moyenne, nombre de mesures, plus grande variation entre deux mesures consécutives (avec les dates). Elles portent sur les mesures brutes, même quand la série est agrégée.
  - Plus grande variation : le plus grand écart en valeur absolue entre deux mesures consécutives de la plage, affiché avec son signe (« ▼ 0,6 ») ; à égalité, la plus récente. Aucune avec une seule mesure.
- Les valeurs calculées (moyennes des intervalles, moyenne, variation) sont affichées arrondies à la précision maximale du type (`decimals`), sans zéros forcés.
- Plage sans mesure : message qui renvoie au bouton « Nouveau relevé » de la page ([06](06-measures.md), sauf si archivé ; après enregistrement, retour au tableau de bord).
- Navigation vers les autres types suivis sans revenir au tableau de bord : liste déroulante des types suivis, dans leur ordre, plus le type affiché s'il n'est plus suivi.
- Fonctionne aussi pour un type qui n'est plus suivi mais qui a des mesures : un bandeau le signale. Accès depuis l'historique filtré sur ce type (« Voir le graphe »).
- Lecture seule : consultable aussi sur un vivarium archivé.

### Performance
- Le tableau de bord exécute un nombre de requêtes **constant**, quel que soit le nombre de mesures suivies : une requête `LATERAL` pour la dernière et l'avant-dernière valeur de chaque mesure suivie (deux lignes par type, lues à rebours sur l'index unique), une requête pour les mini-courbes (pas de N+1, cf. le correctif de la v0.1.1).
- La série d'un graphe est calculée par `MeasureSeriesService`. Ses tests appellent directement le service (agrégation, statistiques), dans la suite `functional` car le calcul se fait en SQL ([architecture](../architecture.md#tests)).

## Données
`measures`, `tracked_measures`, `measure_types`, `vivariums` (en-tête) en lecture.

## Routes et pages
| Méthode | Route | Action | Page |
|---|---|---|---|
| GET | `/vivariums/:id` | `vivariums.show` | `vivariums/show` |
| GET | `/vivariums/:id/charts/:code` | `charts.show` | `charts/show` |

## Critères d'acceptation
- **CHT-1** Le tableau de bord affiche une tuile par mesure suivie, dans l'ordre, avec la dernière valeur et la variation par rapport à la précédente.
- **CHT-2** Une mesure suivie sans aucune mesure affiche « Aucune mesure ».
- **CHT-3** Le nombre de requêtes SQL du tableau de bord est le même avec 2 et avec 15 mesures suivies.
- **CHT-4** Le graphe renvoie les valeurs brutes de la plage demandée, et seulement celles-ci, quand elles sont au plus 500.
- **CHT-5** Avec plus de 500 mesures sur la plage, la série contient au plus 500 points, chacun avec moyenne, min et max corrects ; les statistiques (min, max, moyenne, nombre, plus grande variation) restent calculées sur les mesures brutes, et non sur les intervalles.
- **CHT-6** Les statistiques (min, max, moyenne, nombre, plus grande variation) sont exactes sur un jeu de données connu.
- **CHT-7** Une plage invalide dans l'URL revient à la plage par défaut (30 jours).
- **CHT-8** Un code de type inconnu, ou sans mesure et non suivi par le vivarium, répond 404.
- **CHT-9** Les routes répondent 404 pour le vivarium d'un autre utilisateur.
- **CHT-10** Pour un utilisateur en `Europe/Paris`, des mesures du 31 octobre 2027 entre 00:00 et 23:59 heure locale (25 heures réelles) tombent dans un même intervalle journalier, et aucune mesure du 30 ou du 1er novembre n'y est comptée ; de même pour le 28 mars 2027 (23 heures réelles). Les intervalles de moins d'un jour durent le même temps réel de part et d'autre d'un changement d'heure : sur la plage `7d` qui contient le 31 octobre 2027, chaque intervalle dure 30 minutes et les deux occurrences de 02:00–02:30 sont deux intervalles.
- **CHT-11** ([TRK-7](05-tracked-measures.md)) Retirer un type suivi conserve ses mesures ; le réajouter fait réapparaître sa tuile avec sa dernière valeur.
- **CHT-12** ([05](05-tracked-measures.md)) Un vivarium qui ne suit aucun type affiche l'invitation à en ajouter à la place des tuiles.
- **CHT-13** Chaque tuile reçoit les bornes de la plage `30d` en jours locaux du fuseau de l'utilisateur : début à minuit local, 29 jours avant aujourd'hui, et fin à l'instant de la requête, quelles que soient les dates des mesures. La mini-courbe les prend pour axe temporel.
- **CHT-14** Chaque plage commence à minuit local et compte sa durée aujourd'hui compris (`7d` : aujourd'hui et les 6 jours précédents ; `3m` : le lendemain de la même date 3 mois plus tôt) ; `all` commence à minuit local du jour de la première mesure.
- **CHT-15** Une plage agrégée est découpée en au plus 500 intervalles qui partent de son début. Les intervalles de moins d'un jour sont la plus petite durée de la liste qui le permet (le 10 mars à midi : `7d` → 30 min, `30d` → 3 h, `3m` → 6 h, `6m` → 12 h) ; au-delà, le nombre de jours de la plage plus un, divisé par 500 et arrondi à l'entier supérieur (`1y` → 1 jour, `all` de 999,5 jours → 3 jours).
- **CHT-16** À égalité, la plus grande variation retenue est la plus récente ; avec une seule mesure, il n'y en a aucune.
