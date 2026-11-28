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
- Liste des vivariums **en service**, triés par nom, sous forme de cartes : image (ou illustration par défaut selon le type), nom, type et profil (« Aquarium · eau de mer »), volume, âge (« depuis 2 ans »), date du dernier relevé (ajoutée par [06](06-measures.md), qui crée la table `measures`).
- Lien vers les vivariums archivés s'il y en a.
- État vide : explication et bouton « Créer mon premier bac ».

### Création et modification
- Champs : type (aquarium / terrarium / paludarium), nom, description, type d'eau (si aquarium ou paludarium), climat (si terrarium ou paludarium), longueur / largeur / hauteur en cm, volume net en litres, date de mise en service (défaut aujourd'hui, pas dans le futur ; « aujourd'hui » est la date locale dans le fuseau de l'utilisateur). En modification, cette règle ne s'applique que si la date change : après un changement de fuseau, la date enregistrée peut être « demain » dans le nouveau fuseau, et le vivarium reste modifiable tant qu'on ne touche pas à cette date.
- Le formulaire n'affiche que les champs qui correspondent au type choisi.
- Si les trois dimensions sont saisies et le volume vide, le formulaire propose le volume brut `L × l × H / 1000`, que l'utilisateur peut modifier.
- La date de mise en service ne peut pas être déplacée après un relevé existant : si la nouvelle date est postérieure à la date locale (fuseau de l'utilisateur) du plus ancien relevé, elle est refusée avec un message qui indique cette date. La règle ne s'applique que si la date de mise en service change : un vivarium dont la date enregistrée est déjà postérieure à celle du plus ancien relevé (la date locale de ce relevé peut reculer d'un jour quand l'utilisateur change de fuseau) reste modifiable tant qu'on ne touche pas à cette date. Règle ajoutée par [06](06-measures.md), qui crée les relevés.
- Le **type n'est plus modifiable** après création : le formulaire de modification ne l'envoie pas et le serveur ignore un type soumis. Le type d'eau et le climat le sont ; les changer ne modifie pas les mesures suivies.
- À la création, les mesures suivies par défaut du profil sont ajoutées, dans la même transaction que le vivarium (ajouté par [05](05-tracked-measures.md), qui crée le catalogue et `tracked_measures`), puis l'utilisateur arrive sur le tableau de bord du vivarium.

### Tableau de bord
- La 04 crée la page `vivariums/show` avec son **en-tête** : image (ou illustration par défaut), nom, type et profil, description, volume, âge, actions « Modifier » et « Archiver ». Sur un vivarium archivé : bandeau « archivé » avec « Désarchiver », sans les autres actions.
- Les tuiles, les graphes et les liens vers les mesures suivies et l'historique sont ajoutés par [05](05-tracked-measures.md), [06](06-measures.md) et [07](07-charts.md).

### Image
- Formats acceptés : JPEG, PNG, WebP, reconnus d'après le contenu du fichier et non son nom ; 15 Mo maximum. Le format est reconnu à la signature binaire du début du fichier : tout autre contenu (SVG, GIF, TIFF…) est refusé avec le même message qu'un fichier non reconnu, même nommé `.png`. `sharp` ne décode que ces trois formats : ses autres chargeurs (SVG avec librsvg, GIF, TIFF, HEIF…) sont bloqués au démarrage. Un fichier qui a le bon type mais ne se décode pas est refusé. (HEIC exclu : non décodé par les binaires standards de `sharp` ; les navigateurs mobiles convertissent généralement en JPEG à l'envoi.)
- Redimensionnée (côté le plus long 1600 px), convertie en WebP, métadonnées EXIF retirées (orientation appliquée avant).
- Stockée sur le disque Drive `vivariums` sous `<vivarium_id>/<uuid>.webp`. Remplacer ou retirer l'image supprime l'ancien fichier.
- Servie par une route protégée par la policy, avec cache navigateur (le nom de fichier change à chaque remplacement).
- Si le fichier ne peut pas être chargé (absent du disque), les cartes et l'en-tête affichent l'illustration par défaut du type, comme sans image.

### Archivage
- Archiver : `archived_at = maintenant`. Le vivarium disparaît de l'accueil et apparaît dans « Archivés ».
- Un vivarium archivé reste consultable (tableau de bord, historique, graphes) mais en **lecture seule** : pas de modification du vivarium (formulaire, image), pas de relevé (création, modification, suppression), pas de modification des mesures suivies. Les boutons correspondants sont masqués et les routes refusent la requête : rien n'est modifié et le refus revient en notification sur la page précédente. Un bandeau l'indique, avec le bouton « Désarchiver », seule action possible.

### Pas de suppression
- Un utilisateur ne peut pas supprimer un vivarium : l'archivage est le seul moyen de le retirer de l'accueil, y compris pour un bac créé par erreur.
- Les vivariums ne sont supprimés qu'avec le compte de leur propriétaire ([03-admin](03-admin.md)).

### Administration ([03](03-admin.md))
- La liste des utilisateurs de l'administration affiche le nombre de vivariums de chacun, compté dans la requête de la liste (pas de requête par utilisateur), sans aucune autre donnée de vivarium.
- Supprimer un compte (`UserAdministrationService.delete`) supprime aussi les fichiers images de ses vivariums, après la suppression en base.

## Données
`vivariums`, fichiers Drive. Les features suivantes y ajoutent `tracked_measures` (création des défauts, [05](05-tracked-measures.md)) et `measures` (lecture : date du dernier relevé sur les cartes, plus ancien relevé pour la date de mise en service, [06](06-measures.md)).

## Routes et pages
| Méthode | Route | Action | Page |
|---|---|---|---|
| GET | `/` | `vivariums.index` | `vivariums/index` |
| GET | `/vivariums/archived` | `vivariums.archived` | `vivariums/archived` |
| GET/POST | `/vivariums/create`, `/vivariums` | `vivariums.create` / `store` | `vivariums/create` |
| GET | `/vivariums/:id` | `vivariums.show` (en-tête ; tuiles en [07](07-charts.md)) | `vivariums/show` |
| GET/PUT | `/vivariums/:id/edit`, `/vivariums/:id` | `vivariums.edit` / `update` | `vivariums/edit` |
| POST | `/vivariums/:id/archive` | `vivariums.archive` | — |
| POST | `/vivariums/:id/unarchive` | `vivariums.unarchive` | — |
| PUT | `/vivariums/:id/image` | `vivarium_images.update` | — |
| DELETE | `/vivariums/:id/image` | `vivarium_images.destroy` | — |
| GET | `/vivariums/:id/image/:filename` | `vivarium_images.show` | — |

Le paramètre `:id` est contraint au format UUID (`router.matchers.uuid()`) sur toutes les routes `/vivariums/:id…` de toutes les features : `/vivariums/archived` et `/vivariums/create` ne peuvent donc pas être confondues avec un vivarium.

## Critères d'acceptation
- **VIV-1** L'accueil liste uniquement les vivariums en service de l'utilisateur connecté.
- **VIV-2** Accéder au vivarium d'un autre utilisateur (page, modification, archivage, image) répond 404.
- **VIV-3** Créer un aquarium sans type d'eau est refusé ; créer un terrarium avec un type d'eau est refusé ; un paludarium exige les deux.
- **VIV-4** Une date de mise en service postérieure à la date du jour dans le fuseau de l'utilisateur est refusée ; la date du jour est acceptée. En modification, une date enregistrée inchangée est acceptée, même si elle est postérieure à la date du jour (changement de fuseau).
- **VIV-5** *Reporté en [05](05-tracked-measures.md), testé par TRK-4 et TRK-5.* Créer un vivarium crée les mesures suivies par défaut de son profil.
- **VIV-6** La modification ne permet pas de changer le type.
- **VIV-7** Une image valide est stockée en WebP de 1600 px maximum sans EXIF ; un fichier non image, d'un autre format que JPEG, PNG ou WebP (un SVG nommé `.png`, par exemple) ou de plus de 15 Mo est refusé.
- **VIV-8** Remplacer ou retirer l'image supprime l'ancien fichier du disque.
- **VIV-9** Archiver retire le vivarium de l'accueil et l'affiche dans « Archivés » ; désarchiver fait l'inverse.
- **VIV-10** Aucune route ne permet à un utilisateur de supprimer un vivarium.
- **VIV-11** Sur un vivarium archivé, la modification, le changement et le retrait de l'image sont refusés ; seul « Désarchiver » est accepté.
- **VIV-12** *Reporté en [06](06-measures.md), testé par MEA-21.* Déplacer la mise en service après la date locale du plus ancien relevé est refusé ; à cette date ou avant, c'est accepté. Une modification qui garde la date enregistrée est acceptée, même si cette date est postérieure au plus ancien relevé.
- **VIV-13** ([ADM-8](03-admin.md)) Supprimer un utilisateur depuis l'administration supprime ses vivariums et leurs fichiers images ; la liste des utilisateurs affiche le nombre de vivariums de chacun. La suppression de ses mesures suivies et de ses mesures est testée par TRK-12 ([05](05-tracked-measures.md)) et MEA-22 ([06](06-measures.md)).
