FROM node:22.14.0-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g corepack@latest && corepack enable

FROM base AS build
WORKDIR /build
COPY . /build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm build
RUN pnpm deploy --filter=@aquatracking/backend --prod /prod/backend

# Production stage
FROM base
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /prod/backend/build/ /app
COPY --from=build /prod/backend/node_modules /app/node_modules
CMD ["node", "./bin/server.js"]
