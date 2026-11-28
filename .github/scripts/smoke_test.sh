#!/bin/sh
# Smoke test of a started image, against a fresh database (no user yet).
# Used by ci.yml and publish.yml. Usage: smoke_test.sh [base URL]
#
# The image applied the migrations and seeded the catalog before starting
# the server; then pages rendered by the server must come back, in French,
# the language asked by Accept-Language:
#   - "/" redirects to the setup screen (fresh database);
#   - the setup page is rendered by the SSR bundle: its root element is
#     marked server-rendered and its title and button are in the HTML (these
#     texts come from the translations of the bundles, never from the props);
#   - the script and stylesheet it references (Vite manifest) are served;
#   - an empty setup form is refused with a French validation message: those
#     messages are only in the server's language files (resources/lang).
set -eu

base="${1:-http://localhost:3333}"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
page="$work/page.html"
jar="$work/cookies.txt"

fail() {
  echo "::error::Smoke test: $1"
  exit 1
}

# Every request is bounded: a hanging server fails the test
get() {
  curl -fsSL --max-time 10 -b "$jar" -c "$jar" -H 'Accept-Language: fr' "$@"
}

ready=false
for _ in $(seq 1 30); do
  if curl -fs --max-time 5 -o /dev/null "$base/health/live" 2> /dev/null; then
    ready=true
    break
  fi
  sleep 2
done
[ "$ready" = true ] || fail "the server did not start"

url="$(get -o "$page" -w '%{url_effective}' "$base/")" || fail "/ did not lead to a page"
[ "$url" = "$base/setup" ] || fail "/ led to $url instead of $base/setup"

# Without SSR, the root element is empty and carries no data-server-rendered
grep -q '<html lang="fr"' "$page" || fail 'no <html lang="fr">'
grep -q 'data-page=' "$page" || fail 'no Inertia page props'
grep -q 'data-server-rendered="true"' "$page" || fail 'Inertia root not server-rendered'
grep -q '>Installation<' "$page" || fail 'setup title not rendered'
grep -q '>Créer le compte administrateur<' "$page" || fail 'setup button not rendered'

for extension in js css; do
  asset="$(grep -o "/assets/[^\"]*\.$extension" "$page" | head -n 1)"
  [ -n "$asset" ] || fail "no .$extension asset referenced"
  get -o /dev/null "$base$asset" || fail "$asset not served"
done

# CSRF: the XSRF-TOKEN cookie set by the setup page, sent back in its header
token="$(awk '$6 == "XSRF-TOKEN" { print $7 }' "$jar")"
[ -n "$token" ] || fail "no XSRF-TOKEN cookie"
url="$(get -o "$page" -w '%{url_effective}' \
  -H "X-XSRF-TOKEN: $token" -H "Referer: $base/setup" \
  --data 'email=' "$base/setup")" || fail "the empty setup form was not answered with a page"
[ "$url" = "$base/setup" ] || fail "the empty setup form led to $url instead of $base/setup"
grep -q 'Ce champ est obligatoire' "$page" || fail 'no French validation message'

echo "Smoke test passed: $base/setup rendered, assets served, validation translated"
