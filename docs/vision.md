# Vision — AquaTracking 2.0

## Le problème

Un aquariophile ou un terrariophile mesure régulièrement les paramètres de ses bacs (température, pH, nitrites, humidité…). Ces relevés finissent sur un carnet, un tableur ou nulle part. Résultat : impossible de voir une dérive lente, de corréler un problème avec une évolution, ou de savoir quand le dernier test a été fait.

AquaTracking permet de **noter ses relevés en quelques secondes et de visualiser leur évolution dans le temps**, pour chacun de ses vivariums.

## Pour qui

- Des passionnés qui possèdent un ou plusieurs vivariums (aquarium, terrarium, paludarium).
- L'application est **auto-hébergée** : une instance sert un foyer, un club ou un petit groupe d'amis. L'inscription se fait **sur invitation** d'un administrateur.
- Distribution : une image Docker et une base PostgreSQL. L'envoi d'emails est optionnel.

## Principes

1. **Saisir doit être plus rapide que sur un carnet.** Un relevé = une date et quelques valeurs, sur un seul écran, utilisable au téléphone.
2. **Livrer le cœur avant le reste.** Les tentatives précédentes ont refait les fondations sans atteindre l'historique ni les graphes. Le périmètre 2.0 s'arrête volontairement aux graphes.
3. **Utiliser le framework plutôt que le contourner.** AdonisJS 7 fournit l'essentiel (auth, validation, autorisations, typage de bout en bout) : on suit ses conventions.
4. **Lisible par un humain comme par une IA.** Conventions standard, glossaire partagé (`CONTEXT.md`), décisions écrites (`adr/`), specs avec critères d'acceptation testables.
5. **Simple à héberger.** Pas de dépendance obligatoire au-delà de PostgreSQL ; tout fonctionne sans SMTP.

## Périmètre 2.0

| # | Feature | Spec |
|---|---|---|
| 1 | Installation : création du premier administrateur | [01-installation](features/01-installation.md) |
| 2 | Authentification, inscription par invitation, profil | [02-auth-profile](features/02-auth-profile.md) |
| 3 | Administration : utilisateurs et invitations | [03-admin](features/03-admin.md) |
| 4 | Vivariums : création, modification, image, archivage | [04-vivariums](features/04-vivariums.md) |
| 5 | Catalogue de types de mesure et mesures suivies | [05-tracked-measures](features/05-tracked-measures.md) |
| 6 | Mesures : relevé, historique, correction | [06-measures](features/06-measures.md) |
| 7 | Tableau de bord du vivarium et graphes | [07-charts](features/07-charts.md) |

L'ordre est celui de l'implémentation : chaque feature est livrable et testable seule.

## Hors périmètre 2.0 (le modèle ne doit pas les bloquer)

- **Seuils et alertes** : min/max par mesure suivie, tuiles colorées, alertes email. Les seuils iront dans `tracked_measures`. Nécessitera des tâches de fond (queue/scheduler, à choisir au moment venu).
- **Capteurs** : appareils qui envoient des mesures via une route JSON authentifiée par access token (abilities limitées à un vivarium). La colonne `measures.source` est déjà prévue.
- **Journal** : maintenance (changement d'eau, nettoyage, ajout de produit), population (poissons, plantes, reptiles), notes. Piste : une table d'événements datés par vivarium.
- **Mesures calculées** : types dérivés d'autres mesures (CO₂ depuis KH et pH, ammoniac libre depuis NH₃/NH₄⁺, pH et température, salinité depuis la conductivité, ratio NO₃/PO₄). Piste retenue : formule déclarée dans le catalogue (`derivedFrom` + calcul), valeur **calculée à la lecture** et non stockée, en associant les mesures d'entrée qui ont le même `measured_at` (tolérance temporelle à définir pour les capteurs). Un type dérivé peut être suivi (tuile, graphe) mais n'apparaît jamais comme champ du relevé. Stockage en `source = computed` seulement si les volumes de capteurs l'imposent.
- **Mise à jour en direct** du tableau de bord et des graphes quand une mesure arrive (utile surtout avec les capteurs) : SSE via `@adonisjs/transmit`, canal par vivarium autorisé par la policy, puis rechargement partiel Inertia des props concernées.
- **Partage** d'un vivarium avec d'autres utilisateurs (table de membres).
- Double authentification (TOTP), sessions multiples et « déconnecter tous les appareils », export des données, unités alternatives (°F, densité).

## Versionnement

AquaTracking a connu une version stable publique : la **1.x** (application Flutter et serveur Express/Fastify). Les tentatives suivantes (Nuxt, Adonis 6) sont restées en 0.x. Cette refonte est donc la **v2** :

- `2.0.0-alpha.N` pendant le développement du périmètre 2.0 ;
- `2.0.0` quand les 7 features sont livrées ;
- semver ensuite. Les images Docker sont taguées `2`, `2.0`, `2.0.0` et `latest`.

Voir [ADR 0007](adr/0007-versionnement-v2.md).
