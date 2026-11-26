# 06 — Mesures : relevé, historique, correction

## Objectif
Saisir en quelques secondes les valeurs d'un test, retrouver tous les relevés passés et corriger une erreur de saisie.

## User stories
- En tant qu'utilisateur, devant mon bac avec mon téléphone, je veux saisir d'un coup les résultats de mes tests.
- En tant qu'utilisateur, je veux saisir un relevé fait plus tôt (ce matin, la semaine dernière).
- En tant qu'utilisateur, je veux consulter l'historique de mes mesures, filtré par paramètre.
- En tant qu'utilisateur, je veux corriger ou supprimer une mesure saisie par erreur.

## Règles métier

### Relevé ([ADR 0006](../adr/0006-releve-sans-entite.md))
- Accessible depuis le tableau de bord du vivarium par un bouton « Nouveau relevé » toujours visible (bouton flottant sur mobile). S'ouvre dans une fenêtre (plein écran sur mobile).
- Champs : date et heure (défaut maintenant), saisies et affichées dans le **fuseau de l'utilisateur** ([CONTEXT](../CONTEXT.md)), puis un champ numérique par **mesure suivie**, dans l'ordre des mesures suivies, avec l'unité affichée et au plus le nombre de décimales du type ([05](05-tracked-measures.md), sens de `decimals`).
- Les champs vides sont ignorés. Il faut au moins une valeur.
- Chaque valeur doit être dans les bornes de plausibilité du type ([05](05-tracked-measures.md)). La virgule et le point sont acceptés comme séparateur décimal.
- La date ne peut pas être dans le futur (tolérance 5 minutes) ni antérieure à la mise en service du vivarium.
- **Changement d'heure** : l'heure saisie est convertie en instant avec les règles du fuseau à cette date (un relevé de janvier et un de juillet à « 18:00 » à Paris donnent 17:00 et 16:00 UTC).
  - Heure **inexistante** (passage à l'heure d'été, ex. 02:30 le dernier dimanche de mars à Paris) : refusée avec un message qui l'explique.
  - Heure **ambiguë** (passage à l'heure d'hiver, ex. 02:30 qui existe deux fois fin octobre) : la première occurrence (heure d'été) est retenue.
- Chaque valeur crée une `Measure` (`source = manual`), toutes avec le même `measured_at`. L'ensemble est enregistré dans une transaction.
- Après enregistrement : retour au tableau de bord, mis à jour, avec un message « Relevé enregistré (n mesures) ».
- Impossible sur un vivarium archivé.

### Historique
- Page par vivarium, mesures les plus récentes en premier, **regroupées par date et heure identiques** (un groupe = un relevé à l'affichage).
- Filtre par type de mesure (tous les types ayant au moins une mesure, suivis ou non).
- Pagination : 50 mesures par page.
- Valeurs affichées telles que saisies, sans zéros forcés, et formatées selon la langue (`7,25` / `7.25`).

### Correction
- Modifier une mesure : valeur et date et heure (mêmes règles que le relevé). Le type n'est pas modifiable : on supprime et on ressaisit.
- Supprimer une mesure : confirmation simple.
- Supprimer un relevé entier depuis l'historique : supprime toutes les mesures du groupe (même vivarium, même `measured_at`), avec confirmation qui indique le nombre de mesures.
- Impossible sur un vivarium archivé.

## Données
`measures` (création, lecture, modification, suppression), `tracked_measures` et `measure_types` (lecture).

## Routes et pages
| Méthode | Route | Action | Page |
|---|---|---|---|
| POST | `/vivariums/:id/readings` | `measures.storeReading` | — (fenêtre sur `vivariums/show`) |
| GET | `/vivariums/:id/measures` | `measures.index` | `measures/index` |
| PUT | `/vivariums/:id/measures/:measureId` | `measures.update` | — |
| DELETE | `/vivariums/:id/measures/:measureId` | `measures.destroy` | — |
| DELETE | `/vivariums/:id/readings` (avec `measuredAt`) | `measures.destroyReading` | — |

## Critères d'acceptation
- **MEA-1** Un relevé avec trois valeurs remplies sur cinq champs crée exactement trois mesures avec le même `measured_at`.
- **MEA-2** Un relevé sans aucune valeur est refusé.
- **MEA-3** Une valeur hors bornes de plausibilité (ex. pH 15) est refusée avec un message sur le champ, et aucune mesure du relevé n'est créée.
- **MEA-4** `7,5` et `7.5` sont acceptés et enregistrés comme 7,5.
- **MEA-5** Une date dans le futur (au-delà de 5 minutes) ou antérieure à la mise en service est refusée.
- **MEA-6** Un relevé sur un vivarium archivé est refusé.
- **MEA-7** Un relevé ne peut contenir que des types suivis par le vivarium.
- **MEA-8** L'historique affiche les mesures de la plus récente à la plus ancienne, regroupées par `measured_at`, 50 par page.
- **MEA-9** Le filtre par type ne renvoie que les mesures de ce type, y compris pour un type qui n'est plus suivi.
- **MEA-10** Modifier la valeur et la date d'une mesure les enregistre ; une valeur hors bornes est refusée.
- **MEA-11** Supprimer un relevé supprime toutes les mesures de ce vivarium à ce `measured_at`, et seulement celles-là.
- **MEA-12** Toutes les routes répondent 404 pour le vivarium d'un autre utilisateur, ou pour une mesure qui n'appartient pas au vivarium de l'URL.
- **MEA-13** Pour un utilisateur en `Europe/Paris`, un relevé saisi le 15 janvier à 18:00 est enregistré à 17:00 UTC, et un relevé saisi le 15 juillet à 18:00 à 16:00 UTC ; les deux s'affichent à 18:00.
- **MEA-14** Une heure inexistante dans le fuseau de l'utilisateur (ex. 2027-03-28 02:30 à Paris) est refusée ; une heure ambiguë (2027-10-31 02:30 à Paris) est enregistrée à 00:30 UTC.
- **MEA-15** La même mesure s'affiche à des heures locales différentes pour deux utilisateurs de fuseaux différents ; l'instant stocké ne change pas.
- **MEA-16** Une valeur avec plus de décimales que permis par le type (ex. température `25,35`) est refusée ; `10` saisi en nitrates s'affiche « 10 » et non « 10,0 ».
