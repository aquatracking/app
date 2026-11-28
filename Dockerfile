# syntax=docker/dockerfile:1

# The build stages run on the platform of the builder ($BUILDPLATFORM): their
# output (JavaScript, assets, SSR bundle) does not depend on the architecture.
# Only the production dependencies, which contain native binaries (sharp), are
# installed for the target platform ($TARGETPLATFORM). A multi-architecture
# build therefore emulates only "pnpm install --prod".
#
# The base image is pinned by the digest of its multi-platform index, next to
# its tag: two builds of the same commit start from the same image.
# Dependabot updates the digest (docker ecosystem, .github/dependabot.yml).
FROM --platform=$BUILDPLATFORM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS build-base
WORKDIR /app
# Node 26 no longer ships corepack: install the pnpm version of "packageManager"
COPY package.json ./
RUN npm install -g "$(node -p "require('./package.json').packageManager")"

# All dependencies, to build the application
FROM build-base AS deps
COPY pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Compile TypeScript, the Vite assets and the SSR bundle into ./build
FROM deps AS build
COPY . .
RUN node ace build

# Production dependencies only, for the target platform
FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS production-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g "$(node -p "require('./package.json').packageManager")" \
  && pnpm install --prod --frozen-lockfile

FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS production
WORKDIR /app
ENV NODE_ENV=production \
    TZ=UTC \
    HOST=0.0.0.0 \
    PORT=3333 \
    LOG_LEVEL=info \
    DRIVE_ROOT=storage
# The application belongs to root and is only readable by "node", which runs
# it: only the image folder (DRIVE_ROOT) is writable
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./
COPY docker/entrypoint.sh ./docker/entrypoint.sh
RUN mkdir -p storage && chown node:node storage
USER node
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health/live" > /dev/null || exit 1
CMD ["./docker/entrypoint.sh"]
