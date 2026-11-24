# AGENTS.md

Instructions pour toute personne ou IA qui travaille sur AquaTracking. À lire avant de modifier le code.

## Le projet
Application auto-hébergée de suivi des paramètres d'aquariums, terrariums et paludariums. AdonisJS 7, Inertia + Vue, PostgreSQL. Version en cours : **2.0.0-alpha** (refonte, branche `rewrite/v2`).

## Où trouver quoi
| Besoin | Fichier |
|---|---|
| Pourquoi, pour qui, périmètre | [docs/vision.md](docs/vision.md) |
| Vocabulaire du domaine | [docs/CONTEXT.md](docs/CONTEXT.md) |
| Stack, conventions de code, tests, CI | [docs/architecture.md](docs/architecture.md) |
| Tables et règles d'intégrité | [docs/data-model.md](docs/data-model.md) |
| Décisions et leurs raisons | [docs/adr/](docs/adr/) |
| Comportement attendu d'une feature | [docs/features/](docs/features/) |

## Règles
1. **Les specs font foi.** Une feature est implémentée d'après `docs/features/NN-*.md`. Si le code doit s'en écarter, on modifie d'abord la spec (et l'ADR concernée si c'est une décision).
2. **Vocabulaire de `CONTEXT.md` uniquement.** `Vivarium`, jamais `biotope` ou `tank`. Un terme nouveau est ajouté au glossaire avant d'apparaître dans le code.
3. **Utiliser Adonis avant d'écrire du code.** Consulter le tableau « Besoin → brique Adonis » d'`architecture.md`. Créer les fichiers avec `node ace make:*`.
4. **Autorisation par policies Bouncer**, jamais par des conditions sur `userId` dans les contrôleurs.
5. **Données vers les pages par transformers.** Pas de DTO écrit à la main, pas de modèle sérialisé brut.
6. **URLs par `urlFor` / routes nommées**, jamais en dur.
7. **Textes de l'interface dans `resources/lang/{fr,en}`**, toujours dans les deux langues.
8. **Code, identifiants, commits et noms de tests en anglais.** Specs et docs en français.
9. **Pas de code mort** : pas de dépendance, colonne, alias ou fichier sans usage.

## Commandes
> À compléter au scaffolding.

```bash
npm run dev          # serveur de dev avec HMR
npm test             # tests Japa
npm run lint
npm run typecheck
docker compose up -d # PostgreSQL + Mailpit
```

## Définition du « fini »
Une feature ou un correctif est fini quand :
- chaque critère d'acceptation concerné (`INS-1`, `VIV-3`…) a un test fonctionnel dont le titre commence par son identifiant ;
- `lint`, `typecheck` et `test` passent ;
- les deux langues sont à jour ;
- la spec, le glossaire et le modèle de données reflètent ce qui a été fait.

## Commits
[Conventional Commits](https://www.conventionalcommits.org/) : `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`. Une feature par PR.
