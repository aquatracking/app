# Déploiement

Installer AquaTracking sur un serveur avec Docker, le mettre à jour, le sauvegarder et le restaurer.

## Prérequis

- **Docker** avec Docker Compose (ou tout autre moteur de conteneurs).
- **PostgreSQL 16 ou plus récent** ([ADR 0002](adr/0002-postgresql-uuidv7.md)). L'exemple ci-dessous en lance un dans un conteneur.
- Un **nom de domaine** et un **reverse proxy qui termine le HTTPS** (Caddy, Traefik, Nginx…). Le HTTPS est obligatoire, voir [plus bas](#https-et-reverse-proxy).
- Un serveur SMTP, **optionnel** : voir [Emails](#emails-smtp-optionnel).

## L'image

L'image est publiée sur GHCR pour `linux/amd64` et `linux/arm64` :

| Tag | Contenu |
|---|---|
| `ghcr.io/aquatracking/app:2` | plus haute version 2.x : mises à jour mineures et correctifs |
| `ghcr.io/aquatracking/app:2.0` | plus haute version 2.0.x : correctifs seulement |
| `ghcr.io/aquatracking/app:2.0.0` | version exacte, ne change jamais |
| `ghcr.io/aquatracking/app:latest` | plus haute version stable, quelle que soit la version majeure |

Ces tags ne reculent jamais : un correctif d'une ancienne ligne (`2.0.5` publié après `2.1.0`) met à jour `2.0`, mais ni `2` ni `latest`. Les pré-versions (`2.1.0-rc.1`) n'ont que leur propre tag. Conseil : `2` pour suivre les mises à jour, une version exacte pour décider soi-même de chaque mise à jour. Évitez `latest`, qui passera à la v3 sans prévenir.

Ce que fait l'image :

- elle tourne avec l'utilisateur non root `node` (uid et gid `1000`) ;
- elle écoute sur le port `3333` (`HOST=0.0.0.0`, `PORT=3333`) ;
- à **chaque démarrage**, elle applique les migrations (`node ace migration:run --force`), synchronise le catalogue des types de mesure (`node ace db:seed --files database/seeders/catalog_seeder.js`), puis lance le serveur. Les deux premières étapes sont idempotentes : elles ne font rien si la base est déjà à jour. Si l'une échoue (base injoignable, par exemple), le serveur ne démarre pas et le conteneur s'arrête, puis redémarre selon sa politique `restart` ;
- elle déclare un `HEALTHCHECK` sur `GET /health/live`, qui répond 200 dès que le serveur HTTP répond ;
- elle range les images des vivariums dans `/app/storage` (`DRIVE_ROOT=storage`, relatif à `/app`), à monter en volume ;
- elle écrit ses logs en JSON sur la sortie standard (`docker compose logs app`).

## Exemple avec Docker Compose

Dans un dossier dédié (par exemple `/opt/aquatracking`), créez trois fichiers.

`compose.yml` :

```yaml
services:
  app:
    image: ghcr.io/aquatracking/app:2
    restart: unless-stopped
    env_file: .env
    environment:
      DB_HOST: postgres
    volumes:
      - app_storage:/app/storage
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:18
    restart: unless-stopped
    environment:
      POSTGRES_USER: aquatracking
      POSTGRES_PASSWORD: ${DB_PASSWORD:?DB_PASSWORD manquant dans .env}
      POSTGRES_DB: aquatracking
    volumes:
      # PostgreSQL 18 et plus. Jusqu'à 17 : /var/lib/postgresql/data
      - postgres_data:/var/lib/postgresql
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U aquatracking']
      interval: 5s
      timeout: 5s
      retries: 10

  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
      - '443:443/udp'
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config

networks:
  default:
    # Plage fixe, pour que TRUSTED_PROXIES puisse la désigner. À changer si
    # elle est déjà utilisée sur le serveur (docker network ls / ip route).
    ipam:
      config:
        - subnet: 172.30.0.0/24

volumes:
  app_storage:
  postgres_data:
  caddy_data:
  caddy_config:
```

Le port de l'application n'est pas publié : seul Caddy, dans le même réseau, y accède. PostgreSQL n'est pas publié non plus.

`Caddyfile` (remplacez le domaine) :

```
aquatracking.example.com {
	reverse_proxy app:3333
}
```

Caddy obtient et renouvelle seul le certificat Let's Encrypt : le domaine doit pointer vers le serveur et les ports 80 et 443 doivent être ouverts.

`.env` (droits `600`, voir [Variables d'environnement](#variables-denvironnement)) :

```dotenv
APP_KEY=<clé générée, voir ci-dessous>
APP_URL=https://aquatracking.example.com
TRUSTED_PROXIES=172.30.0.0/24

DB_USER=aquatracking
DB_PASSWORD=<mot de passe long et aléatoire>
DB_DATABASE=aquatracking

# Emails : à retirer ou laisser vide pour désactiver l'envoi
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=aquatracking@example.com
SMTP_PASSWORD=<mot de passe SMTP>
MAIL_FROM_ADDRESS=aquatracking@example.com
```

Générer `APP_KEY` :

```bash
docker run --rm ghcr.io/aquatracking/app:2 node ace generate:key --show
```

La commande affiche `APP_KEY = …` : copiez la valeur dans `.env`. `openssl rand -base64 32` convient aussi. **Gardez cette clé** avec vos sauvegardes : elle chiffre et signe les cookies (session, « se souvenir de moi »). La changer déconnecte tout le monde ; les comptes et les données ne sont pas touchés.

Puis :

```bash
docker compose up -d
docker compose logs -f app   # migrations, catalogue, puis « started HTTP server »
```

## Premier démarrage et installation

Au premier démarrage, l'image crée les tables et le catalogue des types de mesure. L'instance est alors **en installation** ([01](features/01-installation.md)) : toute page redirige vers `/setup`.

Ouvrez `https://aquatracking.example.com` : **la première personne qui ouvre l'instance crée le compte administrateur**. Faites-le juste après le démarrage, avant de communiquer l'adresse. Ensuite, `/setup` répond 404 et les autres comptes se créent par invitation ([03](features/03-admin.md)).

## Variables d'environnement

Les variables sont validées au démarrage (`start/env.ts`) : une valeur obligatoire manquante ou invalide arrête le conteneur avec un message qui la nomme.

### Obligatoires

| Variable | Rôle |
|---|---|
| `APP_KEY` | Clé de chiffrement et de signature (cookies, sessions). Voir ci-dessus pour la générer |
| `APP_URL` | URL publique, en `https://`, sans `/` final. Sert à construire les liens d'invitation et de réinitialisation |
| `DB_HOST` | Hôte PostgreSQL (`postgres` dans l'exemple) |
| `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` | Accès à la base. L'utilisateur doit pouvoir créer des tables (migrations) |

### Optionnelles

| Variable | Défaut | Rôle |
|---|---|---|
| `DB_PORT` | `5432` | Port PostgreSQL |
| `TRUSTED_PROXIES` | vide | Adresses des reverse proxies de confiance, séparées par des virgules. Voir [ci-dessous](#trusted_proxies) |
| `SMTP_HOST` | vide | Serveur SMTP. Vide ou absent : envoi d'emails désactivé |
| `SMTP_PORT` | `587` | Port SMTP |
| `SMTP_SECURE` | `false` | `true` pour le TLS dès la connexion (port 465). Avec `false`, la connexion passe en TLS par STARTTLS si le serveur le propose |
| `SMTP_USERNAME`, `SMTP_PASSWORD` | vides | Identifiants SMTP. Sans `SMTP_USERNAME`, aucune authentification |
| `MAIL_FROM_ADDRESS` | — | Adresse d'expédition. **Obligatoire si `SMTP_HOST` est renseigné** : sinon le démarrage échoue |
| `MAIL_FROM_NAME` | `AquaTracking` | Nom d'expédition |
| `LOG_LEVEL` | `info` | `trace`, `debug`, `info`, `warn`, `error` ou `fatal` |

### Fixées par l'image

À ne pas modifier sans raison : `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT=3333`, `TZ=UTC`, `DRIVE_ROOT=storage`. `TZ` n'a aucun effet sur l'affichage, qui suit le fuseau choisi par chaque utilisateur. Si vous changez `DRIVE_ROOT` (un chemin absolu est accepté), montez le volume au même endroit.

`SESSION_DRIVER` et `LIMITER_STORE` ne servent qu'aux tests : laissez-les vides en production.

### Secrets dans des fichiers

Une valeur de la forme `file:/chemin` est remplacée par le contenu du fichier, **seulement si elle est écrite dans un fichier `.env` lu par l'application**, pas dans une variable passée au conteneur (`environment:` ou `env_file:` de Compose, `docker run -e`). Pour utiliser des Docker secrets, montez un fichier `.env` dans `/app/.env` :

```dotenv
# monté en lecture seule dans /app/.env
APP_KEY=file:/run/secrets/app_key
DB_PASSWORD=file:/run/secrets/db_password
```

Le contenu est lu tel quel : le fichier du secret ne doit pas finir par un saut de ligne (`printf '%s' "…" > app_key`). Une variable passée au conteneur l'emporte sur le fichier `.env`.

## Emails (SMTP optionnel)

Sans SMTP (`SMTP_HOST` vide), tout fonctionne :

- une invitation ou un lien de réinitialisation de mot de passe est affiché à l'administrateur, qui le copie et le transmet lui-même ([03](features/03-admin.md)) ;
- la page « mot de passe oublié » n'affiche pas de formulaire et invite à demander un lien à un administrateur ([02](features/02-auth-profile.md)).

Avec SMTP, ces liens sont aussi envoyés par email, et « mot de passe oublié » envoie le lien directement.

## HTTPS et reverse proxy

En production, le cookie de session est marqué `Secure` et l'en-tête HSTS est envoyé : **servie en HTTP, l'application ne garde pas la session** et la connexion ne fonctionne pas. Elle doit donc être servie en HTTPS, derrière un reverse proxy qui termine le TLS et transmet les requêtes au port `3333` du conteneur.

Les images de vivarium peuvent peser jusqu'à 15 Mo (la limite du serveur pour un envoi est de 20 Mo). Caddy et Traefik n'imposent pas de limite par défaut ; avec Nginx, ajoutez `client_max_body_size 20m;`.

Avec Traefik plutôt que Caddy, retirez le service `caddy` et ajoutez à `app` (en supposant un Traefik déjà configuré avec un point d'entrée `websecure` et un résolveur de certificats `letsencrypt`, dans le même réseau Docker) :

```yaml
    labels:
      traefik.enable: 'true'
      traefik.http.routers.aquatracking.rule: Host(`aquatracking.example.com`)
      traefik.http.routers.aquatracking.entrypoints: websecure
      traefik.http.routers.aquatracking.tls.certresolver: letsencrypt
      traefik.http.services.aquatracking.loadbalancer.server.port: '3333'
```

### `TRUSTED_PROXIES`

L'application limite les tentatives de connexion, de « mot de passe oublié » et d'installation **par adresse IP**. Derrière un proxy, l'adresse vue est celle du proxy : sans `TRUSTED_PROXIES`, tous les visiteurs partagent donc le même compteur, et quelques échecs bloquent tout le monde.

`TRUSTED_PROXIES` liste les proxies dont l'application croit l'en-tête `X-Forwarded-For`. Valeurs acceptées, séparées par des virgules : des adresses IP (`172.30.0.10`), des plages CIDR (`172.30.0.0/24`) et les noms `loopback` (127.0.0.1/8, ::1), `linklocal` (169.254.0.0/16, fe80::/10) et `uniquelocal` (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7). L'application remonte `X-Forwarded-For` de droite à gauche et s'arrête à la première adresse qui n'est pas de confiance : c'est l'IP retenue.

- **Proxy dans le même réseau Docker** (exemple ci-dessus) : donnez au réseau Compose une plage fixe (`networks.default.ipam`) et mettez cette plage dans `TRUSTED_PROXIES` (`172.30.0.0/24`). Seuls vos conteneurs y ont une adresse. Le port de l'application ne doit pas être publié : le proxy doit être le seul chemin vers elle. Avec Traefik dans son propre réseau Docker, indiquez la plage de ce réseau (`docker network inspect <réseau>`).
- **Proxy sur l'hôte**, application publiée sur `127.0.0.1:3333` : les requêtes arrivent par la passerelle du réseau Docker, pas par `loopback`. Indiquez l'adresse de cette passerelle (`172.30.0.1` avec la plage ci-dessus).

N'utilisez pas `uniquelocal` sans y réfléchir : il fait confiance à tout le réseau local (`192.168.0.0/16`, `10.0.0.0/8`…), pas seulement à votre proxy. Derrière un proxy qui **ajoute** l'adresse du client à un `X-Forwarded-For` reçu (Nginx avec `$proxy_add_x_forwarded_for`, par exemple), un poste du réseau local peut alors envoyer un faux `X-Forwarded-For`, choisir l'IP vue par l'application et contourner la limitation de débit. Caddy, qui par défaut remplace l'en-tête reçu au lieu de le compléter, n'a pas ce problème, mais une plage précise reste préférable.

## Sessions

La session est gardée dans un cookie chiffré, sans trace côté serveur : elle ne peut pas être révoquée, et une copie du cookie reste valide tant que `APP_KEY` ne change pas, même après une déconnexion ou un changement de mot de passe. Voir la **limite connue** dans la [spec 02](features/02-auth-profile.md#connexion) et l'[architecture](architecture.md). Pour invalider toutes les sessions (cookie volé, appareil perdu), changez `APP_KEY` et redémarrez : tout le monde devra se reconnecter.

## Sauvegarde

Il n'y a ni corbeille ni suppression réversible : une suppression est définitive. Les sauvegardes sont le seul moyen de revenir en arrière. Il faut sauvegarder **ensemble** :

- la **base** PostgreSQL (comptes, vivariums, relevés) ;
- le **dossier des images** (volume monté sur `/app/storage`) ;
- le fichier `.env`, et surtout `APP_KEY`.

La base référence les images par leur chemin (`vivariums.image_path`). Pour que les deux restent cohérents, sauvegardez-les **au même moment, application arrêtée**. Application en marche, une image remplacée entre les deux copies laisserait un vivarium pointer vers un fichier absent de la sauvegarde.

Depuis le dossier du `compose.yml` :

```bash
#!/bin/sh
set -e
# La sauvegarde contient les emails, les hachés de mots de passe et APP_KEY :
# lisible par vous seul
umask 077
backup="backups/$(date +%Y-%m-%d_%H%M)"
mkdir -p "$backup"

docker compose stop app
# Redémarre l'application à la fin, même si une étape échoue
trap 'docker compose start app' EXIT

# Base : format custom de pg_dump, compressé, restaurable avec pg_restore
docker compose exec -T postgres pg_dump -U aquatracking -Fc aquatracking > "$backup/aquatracking.dump"

# Images : archive du volume, lue avec l'utilisateur de l'image
docker compose run --rm --no-deps -T app tar -C /app/storage -czf - . > "$backup/storage.tar.gz"

cp .env "$backup/env"
```

Si une étape échoue, le script s'arrête avec une erreur et l'application redémarre quand même ; la sauvegarde incomplète reste dans son dossier, à supprimer.

L'arrêt dure quelques secondes. Planifiez ce script (cron, timer systemd), copiez les sauvegardes **hors du serveur** et testez régulièrement une restauration.

## Restauration

Pour revenir à une sauvegarde (même serveur ou nouveau serveur avec les mêmes `compose.yml` et `Caddyfile`) :

1. Remettez le `.env` de la sauvegarde, avec la même `APP_KEY`.
2. Utilisez une image **de même version ou plus récente** que celle de la sauvegarde : au démarrage, les migrations mettent une base ancienne à jour, mais une image plus ancienne ne sait pas lire une base plus récente.
3. Arrêtez l'application et démarrez seulement PostgreSQL :

   ```bash
   docker compose stop app
   docker compose up -d postgres
   ```

4. Recréez une base vide, puis restaurez-y la sauvegarde :

   ```bash
   docker compose exec -T postgres dropdb -U aquatracking --if-exists --force aquatracking
   docker compose exec -T postgres createdb -U aquatracking aquatracking
   docker compose exec -T postgres pg_restore -U aquatracking -d aquatracking --no-owner < backups/2026-11-28_0300/aquatracking.dump
   ```

5. Remplacez le contenu du dossier des images :

   ```bash
   docker compose run --rm --no-deps -T app sh -c 'find /app/storage -mindepth 1 -delete && tar -C /app/storage -xzf -' < backups/2026-11-28_0300/storage.tar.gz
   ```

6. Redémarrez et vérifiez :

   ```bash
   docker compose up -d app
   docker compose logs -f app
   ```

Les sessions ouvertes restent valides si `APP_KEY` n'a pas changé.

## Mise à jour

1. **Sauvegardez** d'abord (voir ci-dessus) : les migrations ne s'annulent pas d'elles-mêmes.
2. Lisez les notes de version ([Releases GitHub](https://github.com/aquatracking/app/releases)). Dans une même version majeure (`2.x`), la mise à jour ne demande rien d'autre que le changement d'image.
3. Changez le tag dans `compose.yml` si vous avez fixé une version exacte, puis :

   ```bash
   docker compose pull app
   docker compose up -d app
   docker compose logs -f app
   ```

Les **migrations s'appliquent automatiquement** au démarrage du nouveau conteneur, puis le catalogue des types de mesure est synchronisé. Pour revenir en arrière après une migration, restaurez la sauvegarde avec l'ancienne image ([Restauration](#restauration)) : redémarrer l'ancienne image sur une base migrée n'est pas pris en charge.

Pour changer de version majeure de PostgreSQL (16 vers 18, par exemple), passez par `pg_dump` et `pg_restore` comme pour une restauration, vers un nouveau volume : les fichiers de données ne sont pas compatibles d'une version majeure à l'autre.
