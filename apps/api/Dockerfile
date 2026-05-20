# Multi-stage build for the BidReady KSA NestJS API.
# - Stage 1 (deps) installs dev deps + runs `prisma generate`
# - Stage 2 (build) compiles TS to dist/
# - Stage 3 (runtime) ships only the prod deps + dist + Prisma client +
#   the migration SQL so `prisma migrate deploy` works at boot.

# -------- Stage 1: deps --------
FROM node:20-alpine AS deps
WORKDIR /repo
# Use a workspace-aware install. Copy the minimum needed to resolve.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages ./packages
COPY prisma ./prisma
RUN npm ci --include=dev --workspaces --include-workspace-root
RUN npx --workspace apps/api prisma generate --schema=./prisma/schema.prisma

# -------- Stage 2: build --------
FROM node:20-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY package.json package-lock.json ./
COPY apps/api ./apps/api
COPY prisma ./prisma
RUN npm --workspace apps/api run build

# -------- Stage 3: runtime --------
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
ENV API_PORT=8080
WORKDIR /app

# Prod-only deps + workspace marker
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
RUN npm ci --omit=dev --workspaces --include-workspace-root && \
    npm cache clean --force

# Compiled output + Prisma client (generated) + migrations
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=deps  /repo/node_modules/.prisma ./node_modules/.prisma
COPY --from=deps  /repo/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# Drop root.
RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 8080
# The Cloud Run container runs migrations on boot then starts the API.
# Failure of migrate deploy aborts the boot — refuse to serve traffic
# against an unmigrated DB.
CMD ["sh", "-c", "npx --workspace apps/api prisma migrate deploy --schema=./prisma/schema.prisma && node apps/api/dist/main.js"]
