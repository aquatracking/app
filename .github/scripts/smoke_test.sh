#!/bin/sh
# Smoke test of a started image, against a fresh database (no user yet).
# Used by ci.yml and publish.yml. Usage: smoke_test.sh [base URL]
#
# The image applied the migrations and seeded the catalog before starting
# the server; then a page rendered by the server must come back:
#   - "/" redirects to the setup screen (fresh database);
#   - the setup page is rendered by the SSR bundle in French, the language
#     asked by Accept-Language: its root element is marked server-rendered
#     and its title and button are in the HTML (the translations are only in
#     the bundles, never in the page props);
#   - the script and stylesheet it references (Vite manifest) are served.
set -eu

base="${1:-http://localhost:3333}"
page="$(mktemp)"
trap 'rm -f "$page"' EXIT

fail() {
  echo "::error::Smoke test: $1"
  exit 1
}

ready=false
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null "$base/health/live"; then
    ready=true
    break
  fi
  sleep 2
done
[ "$ready" = true ] || fail "the server did not start"

url="$(curl -fsSL -H 'Accept-Language: fr' -o "$page" -w '%{url_effective}' "$base/")" ||
  fail "/ did not lead to a page"
[ "$url" = "$base/setup" ] || fail "/ led to $url instead of $base/setup"

# Expected text, with its markup: absent from the page if SSR did not run
grep -q '<html lang="fr"' "$page" || fail 'no <html lang="fr">'
grep -q '<script data-page="app" type="application/json">' "$page" || fail 'no Inertia page props'
grep -q '<div data-server-rendered="true" id="app">' "$page" || fail 'no server-rendered Inertia root'
grep -q '<h1>Installation</h1>' "$page" || fail 'setup title not rendered'
grep -q '>Créer le compte administrateur<' "$page" || fail 'setup button not rendered'

for extension in js css; do
  asset="$(grep -o "/assets/[^\"]*\.$extension" "$page" | head -n 1)"
  [ -n "$asset" ] || fail "no .$extension asset referenced"
  curl -fsS -o /dev/null "$base$asset" || fail "$asset not served"
done

echo "Smoke test passed: $url rendered, assets served"
