# 05 — Catalogue des types de mesure et mesures suivies

## Objectif
Fournir dès l'installation un catalogue de paramètres utiles, et permettre à chaque utilisateur de choisir les paramètres qu'il suit sur chaque vivarium, pré-remplis selon le profil du bac.

## User stories
- En tant qu'utilisateur, je veux qu'un nouveau bac suive déjà les paramètres courants pour son profil.
- En tant qu'utilisateur, je veux ajouter, retirer et réordonner les paramètres suivis sur un bac.

## Catalogue

Défini dans `app/catalog/measure_types.ts` ([ADR 0005](../adr/0005-catalogue-types-de-mesure-fixe.md)). Chaque entrée : `code`, `unit`, `decimals`, `min`/`max` de plausibilité, liste des profils où le type est suivi par défaut.

| Code | Libellé (fr) | Unité | Déc. | Plausibilité | Suivi par défaut |
|---|---|---|---|---|---|
| `temperature` | Température | °C | 1 | −10 – 60 | tous |
| `ph` | pH | | 2 | 0 – 14 | eau douce, saumâtre, mer |
| `gh` | Dureté totale (GH) | °dGH | 0 | 0 – 50 | eau douce |
| `kh` | Dureté carbonatée (KH) | °dKH | 1 | 0 – 50 | eau douce, saumâtre, mer |
| `no2` | Nitrites (NO₂) | mg/L | 2 | 0 – 50 | eau douce, saumâtre |
| `no3` | Nitrates (NO₃) | mg/L | 1 | 0 – 500 | eau douce, saumâtre, mer |
| `nh3` | Ammoniac / ammonium (NH₃/NH₄⁺) | mg/L | 2 | 0 – 50 | — |
| `po4` | Phosphates (PO₄) | mg/L | 2 | 0 – 50 | mer |
| `salinity` | Salinité | ppt | 1 | 0 – 50 | saumâtre, mer |
| `ca` | Calcium (Ca) | mg/L | 0 | 0 – 1000 | mer |
| `mg` | Magnésium (Mg) | mg/L | 0 | 0 – 3000 | mer |
| `co2` | CO₂ | mg/L | 0 | 0 – 200 | — |
| `fe` | Fer (Fe) | mg/L | 2 | 0 – 10 | — |
| `conductivity` | Conductivité | µS/cm | 0 | 0 – 100000 | — |
| `humidity` | Humidité | % | 0 | 0 – 100 | terrarium (tous climats), paludarium |
| `illuminance` | Luminosité | lux | 0 | 0 – 200000 | — |

« Eau douce / saumâtre / mer » s'applique aux aquariums et à la partie aquatique des paludariums. Exemple : un paludarium eau douce tropical suit par défaut température, pH, GH, KH, NO₂, NO₃ et humidité.

### Synchronisation
- Le seeder `catalog_seeder` est lancé à chaque démarrage. Pour chaque entrée : insère le code s'il est absent, met à jour `unit`, `decimals`, `position` sinon.
- Un code retiré du catalogue reste en base s'il a des mesures (affiché dans l'historique, plus proposable au suivi, mais conservé dans les mesures suivies existantes) ; sinon il est supprimé avec les mesures suivies qui le référencent.
- Les libellés et une courte description de chaque type sont dans `resources/lang/{fr,en}/measure_types.json`.

## Règles métier — mesures suivies
- À la création d'un vivarium, une mesure suivie est créée pour chaque type « suivi par défaut » de son profil, dans l'ordre du catalogue.
- L'utilisateur peut **ajouter** n'importe quel type du catalogue non encore suivi (ajouté en dernière position), **retirer** un type suivi et **réordonner** les types suivis (glisser-déposer, flèches sur mobile).
- Retirer un type ne supprime aucune mesure. Le réajouter fait réapparaître sa dernière valeur et son historique.
- Un vivarium peut ne suivre aucun type ; le tableau de bord et le relevé l'invitent alors à en ajouter.
- Impossible sur un vivarium archivé.
- Changer le type d'eau ou le climat d'un vivarium ne touche pas aux mesures suivies.

## Données
`measure_types` (lecture), `tracked_measures`.

## Routes et pages
| Méthode | Route | Action | Page |
|---|---|---|---|
| GET | `/vivariums/:id/tracked-measures` | `tracked_measures.index` | `tracked_measures/index` |
| POST | `/vivariums/:id/tracked-measures` | `tracked_measures.store` | — |
| PUT | `/vivariums/:id/tracked-measures/order` | `tracked_measures.reorder` | — |
| DELETE | `/vivariums/:id/tracked-measures/:trackedMeasureId` | `tracked_measures.destroy` | — |

## Critères d'acceptation
- **TRK-1** Sur une base vide, après démarrage, `measure_types` contient tous les codes du catalogue ; relancer le seeder ne crée pas de doublon.
- **TRK-2** Modifier l'unité d'un type dans le catalogue puis relancer le seeder met à jour la base.
- **TRK-3** Un type retiré du catalogue mais qui a des mesures reste en base et n'est plus proposé à l'ajout.
- **TRK-4** Un aquarium d'eau de mer créé suit par défaut température, pH, KH, NO₃, PO₄, salinité, Ca et Mg, dans l'ordre du catalogue.
- **TRK-5** Un terrarium désertique créé suit par défaut température et humidité.
- **TRK-6** Ajouter un type déjà suivi est refusé ; ajouter un code absent du catalogue est refusé.
- **TRK-7** Retirer un type suivi conserve ses mesures ; le réajouter les rend de nouveau visibles sur le tableau de bord.
- **TRK-8** Réordonner enregistre les nouvelles positions ; une liste qui ne correspond pas exactement aux types suivis est refusée.
- **TRK-9** Toute modification des mesures suivies d'un vivarium archivé est refusée.
- **TRK-10** Les routes répondent 404 pour le vivarium d'un autre utilisateur.
