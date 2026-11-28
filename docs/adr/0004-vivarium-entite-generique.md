# 0004 — « Vivarium » comme entité générique

- **Statut** : acceptée (2026-11)

## Contexte
Les versions précédentes appelaient « biotope » l'entité qui regroupe aquariums et terrariums. En aquariophilie, un « bac biotope » est un style précis (reproduction d'un milieu naturel) : le terme prêtait à confusion. Le modèle se limitait aussi à un booléen eau douce/eau de mer et à un booléen humide/sec, sans eau saumâtre ni paludarium. Le serveur Fastify utilisait l'héritage de tables (une table par type), ce qui compliquait chaque requête.

## Décision
- Une seule entité et une seule table **`vivariums`** (le terme générique exact, identique en français et en anglais).
- `kind` : `aquarium`, `terrarium`, `paludarium`, fixé à la création.
- `water_type` (`fresh`, `brackish`, `salt`) et `climate` (`tropical`, `desert`, `temperate`), obligatoires ou interdits selon le type, garantis par une contrainte `CHECK`.
- Taille : dimensions facultatives en cm et volume net facultatif en litres.
- L'interface dit « bac » (en anglais « tank ») ou affiche le type, rarement « vivarium ». Ces libellés ne passent jamais dans le code ([CONTEXT](../CONTEXT.md)).

## Conséquences
- Mesures, graphes et futurs seuils, journal et partage s'écrivent une seule fois pour tous les types.
- Ajouter un type de vivarium (insectarium, bassin…) = une valeur d'énumération, une contrainte et une entrée de catalogue.
- Les caractéristiques spécifiques à un seul type (ex. récifal) passeront par le profil ou des colonnes facultatives, pas par de nouvelles tables.
