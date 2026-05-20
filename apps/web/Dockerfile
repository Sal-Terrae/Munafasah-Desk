# Multi-stage build for the BidReady KSA Next.js web shell.
# Uses Next 15 `output: 'standalone'` so the runtime image is tiny.

# -------- Stage 1: deps --------
FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages ./packages
RUN npm ci --include=dev --workspaces --include-workspace-root

# -------- Stage 2: build --------
FROM node:20-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY package.json package-lock.json ./
COPY apps/web ./apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm --workspace apps/web run build

# -------- Stage 3: runtime --------
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
WORKDIR /app

# `output: 'standalone'` writes a self-contained server.js + minimal
# node_modules to apps/web/.next/standalone, plus the public + static
# assets that need to live alongside it.
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public 2>/dev/null || true

RUN addgroup -S app && adduser -S app -G app
USER app

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
