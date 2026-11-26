# 04 — Vivariums

## Objectif
Permettre à chaque utilisateur de décrire ses bacs (aquariums, terrariums, paludariums), d'y associer une photo et d'archiver ceux qui ne sont plus en service.

## User stories
- En tant qu'utilisateur, je veux voir tous mes bacs en service sur la page d'accueil.
- En tant qu'utilisateur, je veux créer un bac en précisant son type, son eau ou son climat, sa taille et sa date de mise en service.
- En tant qu'utilisateur, je veux ajouter une photo de mon bac.
- En tant qu'utilisateur, je veux archiver un bac démonté sans perdre son historique.

## Règles métier

### Propriété
- Un vivarium appartient à un seul utilisateur. Toute action passe par `VivariumPolicy` : seul le propriétaire peut voir, modifier, archiver ou voir l'image. Sinon : 404 (on ne révèle pas l'existence du vivarium).

### Accueil
- Liste des vivariums **en service**, triés par nom, sous forme de cartes : image (ou illustration par défaut selon le type), nom, type et profil (« Aquarium · eau de mer »), volume, âge (« depuis 2 ans »), date du dernier relevé.
- Lien vers les vivariums archivés s'il y en a.
- État vide : explication et bouton « Créer mon premier bac ».

### Création et modification
- Champs : type (aquarium / terrarium / paludarium), nom, description, type d'eau (si aquarium ou paludarium), climat (si terrarium ou paludarium), longueur / largeur / hauteur en cm, volume net en litres, date de mise en service (défaut aujourd'hui, pas dans le futur).
- Le formulaire n'affiche que les champs qui correspondent au type choisi.
- Si les trois dimensions sont saisies et le volume vide, le formulaire propose le volume brut `L × l × H / 1000`, que l'utilisateur peut modifier.
- Le **type n'est plus modifiable** après création. Le type d'eau et le climat le sont ; les changer ne modifie pas les mesures suivies.
- À la création, les mesures suivies par défaut du profil sont ajoutées ([05](05-tracked-measures.md)), puis l'utilisateur arrive sur le tableau de bord du vivarium.

### Image
- Formats acceptés : JPEG, PNG, WebP ; 15 Mo maximum. (HEIC exclu : non décodé par les binaires standards de `sharp` ; les navigateurs mobiles convertissent généralement en JPEG à l'envoi.)
- Redimensionnée (côté le plus long 1600 px), convertie en WebP, métadonnées EXIF retirées (orientation appliquée avant).
- Stockée sur le disque Drive `vivariums` sous `<vivarium_id>/<uuid>.webp`. Remplacer ou retirer l'image supprime l'ancien fichier.
- Servie par une route protégée par la policy, avec cache navigateur (le nom de fichier change à chaque remplacement).

### Archivage
- Archiver : `archived_at = maintenant`. Le vivarium disparaît de l'accueil et apparaît dans « Archivés ».
- Un vivarium archivé reste consultable (tableau de bord, historique, graphes) mais en lecture seule : pas de relevé, pas de modification des mesures, pas de modification des mesures suivies. Un bandeau l'indique, avec le bouton « Désarchiver ».

### Pas de suppression
- Un utilisateur ne peut pas supprimer un vivarium : l'archivage est le seul moyen de le retirer de l'accueil, y compris pour un bac créé par erreur.
- Les vivariums ne sont supprimés qu'avec le compte de leur propriétaire ([03-admin](03-admin.md)).

## Données
`vivariums`, `tracked_measures` (création des défauts), fichiers Drive.

## Routes et pages
| Méthode | Route | Action | Page |
|---|---|---|---|
| GET | `/` | `vivariums.index` | `vivariums/index` |
| GET | `/vivariums/archived` | `vivariums.archived` | `vivariums/archived` |
| GET/POST | `/vivariums/create`, `/vivariums` | `vivariums.create` / `store` | `vivariums/create` |
| GET | `/vivariums/:id` | voir [07](07-charts.md) | `vivariums/show` |
| GET/PUT | `/vivariums/:id/edit`, `/vivariums/:id` | `vivariums.edit` / `update` | `vivariums/edit` |
| POST | `/vivariums/:id/archive` | `vivariums.archive` | — |
| POST | `/vivariums/:id/unarchive` | `vivariums.unarchive` | — |
| PUT | `/vivariums/:id/image` | `vivarium_images.update` | — |
| DELETE | `/vivariums/:id/image` | `vivarium_images.destroy` | — |
| GET | `/vivariums/:id/image/:filename` | `vivarium_images.show` | — |

## Critères d'acceptation
- **VIV-1** L'accueil liste uniquement les vivariums en service de l'utilisateur connecté.
- **VIV-2** Accéder au vivarium d'un autre utilisateur (page, modification, archivage, image) répond 404.
- **VIV-3** Créer un aquarium sans type d'eau est refusé ; créer un terrarium avec un type d'eau est refusé ; un paludarium exige les deux.
- **VIV-4** Une date de mise en service dans le futur est refusée.
- **VIV-5** Créer un vivarium crée les mesures suivies par défaut de son profil.
- **VIV-6** La modification ne permet pas de changer le type.
- **VIV-7** Une image valide est stockée en WebP de 1600 px maximum sans EXIF ; un fichier non image ou de plus de 15 Mo est refusé.
- **VIV-8** Remplacer ou retirer l'image supprime l'ancien fichier du disque.
- **VIV-9** Archiver retire le vivarium de l'accueil et l'affiche dans « Archivés » ; désarchiver fait l'inverse.
- **VIV-10** Aucune route ne permet à un utilisateur de supprimer un vivarium.
