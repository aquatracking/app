# 07 — Tableau de bord du vivarium et graphes

## Objectif
Voir d'un coup d'œil l'état actuel d'un bac et l'évolution de chaque paramètre dans le temps.

## User stories
- En tant qu'utilisateur, je veux voir la dernière valeur de chaque paramètre suivi et depuis quand elle date.
- En tant qu'utilisateur, je veux voir l'évolution d'un paramètre sur une période et ses statistiques.
- En tant qu'utilisateur, je veux comparer rapidement les tendances de tous mes paramètres.

## Règles métier

### Tableau de bord (`/vivariums/:id`)
- En-tête : image, nom, type et profil, volume, âge, actions (modifier, archiver, mesures suivies, historique). Bandeau « archivé » le cas échéant ([04](04-vivariums.md)).
- Une **tuile par mesure suivie**, dans l'ordre des mesures suivies :
  - libellé, dernière valeur avec unité, ancienneté (« il y a 3 jours ») ;
  - variation par rapport à la mesure précédente du même type (flèche et écart, ex. « ▲ 0,3 ») ;
  - mini-courbe des 30 derniers jours si au moins 2 mesures sur la période ;
  - « Aucune mesure » si le type n'a jamais été mesuré.
- Cliquer sur une tuile ouvre le graphe du type.
- Bouton « Nouveau relevé » ([06](06-measures.md)), sauf si archivé.
- Pas de couleur liée à une valeur « bonne » ou « mauvaise » : ce sera le rôle des seuils (hors périmètre 2.0).

### Graphe d'un type (`/vivariums/:id/charts/:code`)
- Plages : 7 jours, 30 jours (défaut), 3 mois, 6 mois, 1 an, tout. La plage choisie est dans l'URL (`?range=30d`).
- Courbe des valeurs dans le temps, axe des abscisses temporel réel (des mesures irrégulières ne sont pas espacées régulièrement), points visibles quand il y a moins de 100 points.
- Infobulle : date et heure, valeur.
- Axe, infobulles et statistiques en heure locale du **fuseau de l'utilisateur**. Les limites de plage (« 7 jours ») et les intervalles d'agrégation d'un jour ou plus sont calculés en jours locaux : un jour de changement d'heure dure 23 ou 25 heures et reste un seul intervalle.
- **Agrégation** : si la plage contient plus de `MAX_CHART_POINTS` (500, justification dans [data-model](../data-model.md)) mesures, le serveur renvoie au plus 500 intervalles (`date_bin`), avec moyenne, min et max par intervalle ; le graphe affiche la moyenne et une bande min–max. Sinon, valeurs brutes.
- Statistiques de la plage : dernière valeur, minimum, maximum, moyenne, nombre de mesures, plus grande variation entre deux mesures consécutives (avec les dates).
- Plage sans mesure : message et lien vers le relevé.
- Navigation vers les autres types suivis sans revenir au tableau de bord (onglets ou liste déroulante).
- Fonctionne aussi pour un type qui n'est plus suivi mais qui a des mesures (accès depuis l'historique).

### Performance
- Le tableau de bord exécute un nombre de requêtes **constant**, quel que soit le nombre de mesures suivies : dernières valeurs avec `DISTINCT ON`, valeurs précédentes et mini-courbes en une requête chacune (pas de N+1, cf. le correctif de la v0.1.1).
- La série d'un graphe est calculée par `MeasureSeriesService` et testée unitairement (agrégation, statistiques).

## Données
`measures`, `tracked_measures`, `measure_types` en lecture.

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
- **CHT-5** Avec plus de 500 mesures sur la plage, la série contient au plus 500 points, chacun avec moyenne, min et max corrects.
- **CHT-6** Les statistiques (min, max, moyenne, nombre, plus grande variation) sont exactes sur un jeu de données connu.
- **CHT-7** Une plage invalide dans l'URL revient à la plage par défaut (30 jours).
- **CHT-8** Un code de type inconnu, ou sans mesure et non suivi par le vivarium, répond 404.
- **CHT-9** Les routes répondent 404 pour le vivarium d'un autre utilisateur.
- **CHT-10** Pour un utilisateur en `Europe/Paris`, des mesures du 31 octobre 2027 entre 00:00 et 23:59 heure locale (25 heures réelles) tombent dans un même intervalle journalier, et aucune mesure du 30 ou du 1er novembre n'y est comptée.
