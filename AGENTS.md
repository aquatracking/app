# AGENTS.md

Instructions pour toute personne ou IA qui travaille sur AquaTracking. À lire avant de modifier le code.

## Le projet
Application auto-hébergée de suivi des paramètres d'aquariums, terrariums et paludariums. AdonisJS 7, Inertia + Vue, PostgreSQL. Version en cours : **2.0.0**, développée sur `main` avec une PR par feature. Publication : pousser un tag `vX.Y.Z` égal à la version de `package.json` (voir [architecture](docs/architecture.md#ci-github-actions)).

## Où trouver quoi
| Besoin | Fichier |
|---|---|
| Pourquoi, pour qui, périmètre | [docs/vision.md](docs/vision.md) |
| Vocabulaire du domaine | [docs/CONTEXT.md](docs/CONTEXT.md) |
| Stack, conventions de code, tests, CI | [docs/architecture.md](docs/architecture.md) |
| Installation en production, sauvegarde, mise à jour | [docs/deployment.md](docs/deployment.md) |
| Tables et règles d'intégrité | [docs/data-model.md](docs/data-model.md) |
| Décisions et leurs raisons | [docs/adr/](docs/adr/) |
| Comportement attendu d'une feature | [docs/features/](docs/features/) |

## Règles
1. **Les specs font foi.** Une feature est implémentée d'après `docs/features/NN-*.md`. Si le code doit s'en écarter, on modifie d'abord la spec (et l'ADR concernée si c'est une décision).
2. **Vocabulaire de `CONTEXT.md` uniquement.** Dans le code et les identifiants, `Vivarium`, jamais `biotope` ou `tank`. Dans l'interface, les libellés sont ceux du glossaire : « bac » (fr) et « tank » (en) pour un vivarium, « paramètre » / « parameter » pour un type de mesure ou une mesure suivie. Un terme nouveau est ajouté au glossaire avant d'apparaître dans le code ou l'interface.
3. **Utiliser Adonis avant d'écrire du code.** Consulter le tableau « Besoin → brique Adonis » d'`architecture.md`. Créer les fichiers avec `node ace make:*`.
4. **Autorisation par policies Bouncer**, jamais par des conditions sur `userId` dans les contrôleurs.
5. **Données vers les pages par transformers.** Pas de DTO écrit à la main, pas de modèle sérialisé brut.
6. **URLs par `urlFor` / routes nommées**, jamais en dur.
7. **Textes de l'interface dans `resources/lang/{fr,en}`**, toujours dans les deux langues.
8. **Code, identifiants, commits et noms de tests en anglais.** Specs et docs en français.
9. **Pas de code mort** : pas de dépendance, colonne, alias ou fichier sans usage.

## Commandes
Prérequis : Node 26 (version dans `.node-version`, lue par fnm ou nvm) et pnpm (version dans le champ `packageManager` de `package.json`).

Première installation : `pnpm install`, `cp .env.example .env`, `node ace generate:key`.

```bash
docker compose up -d       # PostgreSQL (bases aquatracking et aquatracking_test) + Mailpit (http://localhost:8025)
node ace migration:run     # migrations, puis régénère database/schema.ts
node ace db:seed           # synchronise le catalogue des types de mesure (idempotent)
pnpm dev                   # serveur de dev avec HMR et SSR (http://localhost:3333)
pnpm test                  # tests Japa sur la base aquatracking_test
pnpm test --files=tests/functional/health/health_checks.spec.ts   # un seul fichier
pnpm lint
pnpm typecheck
pnpm format                # Prettier
node ace codegen           # régénère .adonisjs/ (routes typées, pages, transformers) hors serveur de dev
pnpm shadcn-vue add <composant>   # ajoute un composant dans inertia/components/ui/
docker build -t aquatracking .    # image de production
```

`database/schema.ts` (classes de colonnes des modèles) et `.adonisjs/` sont générés : ne pas les modifier à la main, les committer après régénération.

## Définition du « fini »
Une feature ou un correctif est fini quand :
- chaque critère d'acceptation concerné (`INS-1`, `VIV-3`…) a un test fonctionnel dont le titre commence par son identifiant ;
- `lint`, `typecheck` et `test` passent ;
- les deux langues sont à jour ;
- la spec, le glossaire et le modèle de données reflètent ce qui a été fait.

## Relecture
Consignes pour toute relecture de PR, humaine ou IA. Le but est de trouver ce qui est faux ou manquant, pas de valider le travail.

### Posture
- **Ne pas prendre la description de la PR pour argent comptant.** Elle dit ce que l'auteur pense avoir fait. Vérifier chaque affirmation dans le diff (« tests ajoutés », « aucun changement de comportement », « couvre VIV-3 »). Chercher aussi ce que le diff fait **sans** que la description le dise.
- **Partir de la doc, pas du code.** Lire d'abord la spec de la feature concernée, les ADR citées et les entrées du glossaire, puis juger le diff par rapport à elles. Ne pas déduire l'intention du code lui-même.
- **Ne rien supposer qu'on n'a pas vu** : si une affirmation ne peut pas être vérifiée (CI non lancée, fichier hors du diff), le dire au lieu de la considérer comme vraie.

### Cohérence avec la documentation
- Le comportement correspond à la spec : règles métier, routes, cas d'erreur, critères d'acceptation.
- Aucune décision d'une ADR n'est contredite. Une PR qui change une décision doit modifier ou remplacer l'ADR dans la même PR.
- Le schéma (migrations) correspond à `docs/data-model.md` : colonnes, nullabilité, contraintes `CHECK` et uniques, index, cascades.
- Les termes du code et de l'interface sont ceux de `docs/CONTEXT.md`.
- Si le code s'écarte de la doc, la doc est mise à jour **dans la même PR**. Sinon c'est bloquant, même si le code semble meilleur.

### Tests
- Chaque critère d'acceptation concerné a un test dont le titre commence par son identifiant. Lister les critères de la spec et vérifier un par un qu'ils ont un test.
- Les tests vérifieraient vraiment une régression : ils échoueraient sans le code de la PR, n'assertent pas seulement un statut 200, couvrent les cas d'erreur et de refus (autre utilisateur, vivarium archivé, validation).
- Aucun test supprimé, désactivé (`.skip`, `.fixme`) ou affaibli sans justification écrite dans la PR.
- La CI (`lint`, `typecheck`, `test`) est verte, constaté et non supposé.

### Points propres au projet
- Toute route qui touche un vivarium passe par `VivariumPolicy` et répond 404 (jamais 403) pour le vivarium d'un autre utilisateur.
- Un vivarium archivé est en lecture seule, côté routes et pas seulement dans l'interface.
- La logique métier est dans les services ([architecture](docs/architecture.md)), pas dans les contrôleurs.
- Les données vont aux pages par des transformers ; les URLs passent par `urlFor`.
- Les dates sont en UTC et converties seulement dans le fuseau IANA de l'utilisateur, jamais avec un décalage fixe.
- Pas de requête dans une boucle (N+1), en particulier sur le tableau de bord et l'historique.
- Les textes de l'interface existent en `fr` et en `en`.
- Les migrations ont un `down` qui fonctionne.
- Pas de secret, de `console.log` ou de code mort laissé dans le diff.
- Rien hors du périmètre de la spec annoncée, et aucune fonctionnalité hors 2.0 glissée en passant.

### Rendu de la relecture
Classer chaque remarque en **bloquant** (bug, faille, écart avec la doc, critère sans test), **à corriger** (convention non respectée, test faible) ou **suggestion**. Pour chacune : `fichier:ligne`, le problème, et la règle ou le document concerné.

## Commits
[Conventional Commits](https://www.conventionalcommits.org/) : `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`. Une feature par PR.
