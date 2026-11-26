#!/bin/sh
# Starts AquaTracking: apply migrations, synchronize the measure type
# catalog, then run the HTTP server. Both first steps are idempotent.
set -e

node ace migration:run --force
node ace db:seed --files database/seeders/catalog_seeder.js
exec node bin/server.js
