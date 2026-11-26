# 0006 — Le relevé est une saisie groupée, pas une entité

- **Statut** : acceptée (2026-11)

## Contexte
En pratique, on teste plusieurs paramètres au même moment (bandelette multi-tests, série de tests en gouttes). Toutes les versions précédentes faisaient saisir les mesures une par une, avec la date forcée à « maintenant ». On peut modéliser le relevé comme une entité (date, note, méthode) qui regroupe ses mesures, ou comme un simple formulaire.

## Décision
- Le **relevé** est un formulaire : une date et heure (par défaut maintenant) et un champ par mesure suivie.
- Il crée une **mesure indépendante** par valeur remplie, toutes avec le même `measured_at`.
- Pas de table « relevé ».

## Conséquences
- Le modèle reste simple : une mesure = un type, une valeur, un instant. Les capteurs produiront exactement la même chose.
- On ne peut pas attacher de note ou de méthode à un relevé. Si le besoin apparaît, il passera par le futur journal (événement daté) plutôt que par une entité relevé.
- Un relevé est identifié par son vivarium et son instant. Les mesures manuelles sont tronquées à la minute et une contrainte unique interdit deux mesures du même type au même instant : le groupe est ainsi stable et sans doublon.
- Le formulaire de relevé sert aussi à **modifier** un relevé existant (compléter, corriger, vider un champ, changer la date), et c'est le seul écran de correction : pas d'édition mesure par mesure.
