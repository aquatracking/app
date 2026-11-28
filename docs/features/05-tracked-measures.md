# 05 — Catalogue des types de mesure et mesures suivies

## Objectif
Fournir dès l'installation un catalogue de paramètres utiles, et permettre à chaque utilisateur de choisir les paramètres qu'il suit sur chaque vivarium, pré-remplis selon le profil du bac.

## User stories
- En tant qu'utilisateur, je veux qu'un nouveau bac suive déjà les paramètres courants pour son profil.
- En tant qu'utilisateur, je veux ajouter, retirer et réordonner les paramètres suivis sur un bac.

## Catalogue

Défini dans `app/catalog/measure_types.ts` ([ADR 0005](../adr/0005-catalogue-types-de-mesure-fixe.md)). Chaque entrée : `code`, `unit`, `decimals`, `min`/`max` de plausibilité, liste des profils où le type est suivi par défaut.

**Sens de `decimals`** : c'est la précision **maximale** acceptée à la saisie et affichée, pas un format imposé.
- La valeur est stockée telle que saisie (`numeric(10,3)`), sans arrondi.
- Une saisie avec plus de décimales que permis est refusée, avec un message qui indique la précision attendue. Les zéros finaux ne comptent pas : `25,30` vaut 25,3 et est accepté en température (1 décimale).
- Affichage sans zéros forcés : `10` s'affiche « 10 », `7,25` reste « 7,25 », jamais « 10,0 ».
- Les futurs seuils compareront les valeurs stockées. Être généreux sur `decimals` ne coûte donc rien : il suffit qu'un kit ou un appareil courant ne soit jamais bloqué.

| Code | Libellé (fr) | Unité | Déc. | Plausibilité | Suivi par défaut |
|---|---|---|---|---|---|
| `temperature` | Température | °C | 1 | −10 – 60 | tous |
| `ph` | pH | | 2 | 0 – 14 | eau douce, saumâtre, mer |
| `gh` | Dureté totale (GH) | °dGH | 0 | 0 – 50 | eau douce |
| `kh` | Dureté carbonatée (KH) | °dKH | 1 | 0 – 50 | eau douce, saumâtre, mer |
| `no2` | Nitrites (NO₂) | mg/L | 3 | 0 – 50 | eau douce, saumâtre |
| `no3` | Nitrates (NO₃) | mg/L | 1 | 0 – 500 | eau douce, saumâtre, mer |
| `nh3` | Ammoniac / ammonium (NH₃/NH₄⁺) | mg/L | 2 | 0 – 50 | — |
| `po4` | Phosphates (PO₄) | mg/L | 3 | 0 – 50 | mer |
| `salinity` | Salinité | ppt | 1 | 0 – 50 | saumâtre, mer |
| `specific_gravity` | Densité | | 3 | 1,000 – 1,040 | — |
| `ca` | Calcium (Ca) | mg/L | 0 | 0 – 1000 | mer |
| `mg` | Magnésium (Mg) | mg/L | 0 | 0 – 3000 | mer |
| `co2` | CO₂ | mg/L | 0 | 0 – 200 | — |
| `fe` | Fer (Fe) | mg/L | 2 | 0 – 10 | — |
| `conductivity` | Conductivité | µS/cm | 0 | 0 – 100000 | — |
| `humidity` | Humidité | % | 0 | 0 – 100 | terrarium (tous climats), paludarium |
| `illuminance` | Luminosité | lux | 0 | 0 – 200000 | — |

La **densité** est un type distinct de la salinité, et non une autre unité : la conversion dépend de la température, et beaucoup de réfractomètres et densimètres affichent directement la densité. Un récifaliste qui mesure ainsi suit la densité à la place, ou en plus, de la salinité.

Justification des décimales notables : pH au 0,01 (pH-mètres, suivi récifal) ; KH au 0,1 (récifal) ; NO₃ au 0,1 (photomètres ultra-bas en récifal, alors qu'en eau douce les kits donnent des entiers) ; NO₂ au 0,001 (kits avec paliers comme 0,025) ; PO₄ au 0,001 (photomètres phosphore en ppb convertis en PO₄).

« Eau douce / saumâtre / mer » s'applique aux aquariums et à la partie aquatique des paludariums. Exemple : un paludarium eau douce tropical suit par défaut température, pH, GH, KH, NO₂, NO₃ et humidité.

### Synchronisation
- Le seeder `catalog_seeder` est lancé à chaque démarrage. Pour chaque entrée : insère le code s'il est absent, met à jour `unit`, `decimals`, `position` sinon.
- Un type abandonné n'est jamais retiré du catalogue : il est marqué `retired`. Il n'est plus proposé à l'ajout, reste dans les mesures suivies existantes et dans l'historique, et garde ses bornes et décimales, qui continuent de valider les modifications de relevés.
- Si un code présent en base n'existe plus dans le catalogue, le seeder échoue au démarrage avec un message explicite, que ce code ait des mesures ou non : une entrée n'est jamais retirée du catalogue, son absence est donc toujours une erreur. Le contrôle ne dépend pas des tables qui utilisent le type.
- Les libellés et une courte description de chaque type sont dans `resources/lang/{fr,en}/measure_types.json`.

## Règles métier — mesures suivies
- Dans l'interface, les types de mesure s'appellent « paramètres » et les mesures suivies « paramètres suivis » (en anglais « parameters », « tracked parameters ») : la page des mesures suivies est titrée « Paramètres suivis » ([CONTEXT](../CONTEXT.md)).
- À la création d'un vivarium, une mesure suivie est créée pour chaque type « suivi par défaut » de son profil, dans l'ordre du catalogue, dans la transaction de `VivariumService.create` (critère VIV-5 de [04](04-vivariums.md), reporté ici).
- L'utilisateur peut **ajouter** n'importe quel type du catalogue non encore suivi et non retiré (ajouté en dernière position), **retirer** un type suivi et **réordonner** les types suivis (glisser-déposer, y compris au toucher, et flèches haut/bas). Chaque déplacement est enregistré aussitôt.
- Retirer un type ne supprime aucune mesure. Le réajouter fait réapparaître sa dernière valeur et son historique.
- Un vivarium peut ne suivre aucun type. La page des mesures suivies l'indique ; le tableau de bord ([07](07-charts.md)) et le relevé ([06](06-measures.md)) invitent alors à en ajouter.
- Sur un vivarium **archivé**, les mesures suivies sont figées : ajout, retrait et réordonnancement sont refusés (le bac est en lecture seule, comme pour les relevés). Il faut le désarchiver d'abord.
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
- **TRK-3** Un type marqué `retired` n'est plus proposé à l'ajout, son ajout est refusé, et il reste affiché là où il est suivi ; un code présent en base et absent du catalogue fait échouer le seeder. La validation d'un relevé par les bornes d'un type retiré est testée par MEA-23 ([06](06-measures.md)).
- **TRK-4** Un aquarium d'eau de mer créé suit par défaut température, pH, KH, NO₃, PO₄, salinité, Ca et Mg, dans l'ordre du catalogue.
- **TRK-5** Un terrarium désertique créé suit par défaut température et humidité.
- **TRK-6** Ajouter un type déjà suivi est refusé ; ajouter un code absent du catalogue est refusé.
- **TRK-7** Retirer un type suivi puis le réajouter le fait de nouveau suivre, en dernière position. La conservation de ses mesures et leur retour sur le tableau de bord sont testés par CHT-11 ([07](07-charts.md)).
- **TRK-8** Réordonner enregistre les nouvelles positions ; une liste qui ne correspond pas exactement aux types suivis est refusée.
- **TRK-9** Toute modification des mesures suivies d'un vivarium archivé est refusée.
- **TRK-10** Les routes répondent 404 pour le vivarium d'un autre utilisateur.
- **TRK-11** Le type densité existe dans le catalogue mais n'est suivi par défaut par aucun profil.
- **TRK-12** ([VIV-13](04-vivariums.md)) Supprimer un utilisateur depuis l'administration supprime les mesures suivies de ses vivariums.
