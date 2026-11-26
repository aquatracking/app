# syntax=docker/dockerfile:1

FROM node:26-alpine AS base
WORKDIR /app
# Node 26 no longer ships corepack: install the pnpm version of "packageManager"
COPY package.json ./
RUN npm install -g "$(node -p "require('./package.json').packageManager")"

# All dependencies, to build the application
FROM base AS deps
COPY pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Compile TypeScript, the Vite assets and the SSR bundle into ./build
FROM deps AS build
COPY . .
RUN node ace build

# Production dependencies only
FROM base AS production-deps
COPY pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

FROM node:26-alpine AS production
WORKDIR /app
ENV NODE_ENV=production \
    TZ=UTC \
    HOST=0.0.0.0 \
    PORT=3333 \
    LOG_LEVEL=info \
    DRIVE_ROOT=storage
COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/build ./
COPY --chown=node:node docker/entrypoint.sh ./docker/entrypoint.sh
RUN mkdir -p storage && chown node:node storage
USER node
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health/live" > /dev/null || exit 1
CMD ["./docker/entrypoint.sh"]
