# syntax=docker/dockerfile:1

# ─── Stage 1: Build ──────────────────────────────────────────
FROM sveltekit-base:local AS builder

ARG PUBLIC_MANA_AUTH_URL=http://mana-auth:3001
ARG PUBLIC_SYNC_SERVER_URL=http://mana-sync:3010
ENV PUBLIC_MANA_AUTH_URL=$PUBLIC_MANA_AUTH_URL
ENV PUBLIC_SYNC_SERVER_URL=$PUBLIC_SYNC_SERVER_URL

# Copy app-specific packages
COPY apps/manavoxel/packages/shared ./apps/manavoxel/packages/shared
COPY apps/manavoxel/apps/web ./apps/manavoxel/apps/web

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --no-frozen-lockfile --ignore-scripts

WORKDIR /app/apps/manavoxel/apps/web
RUN pnpm exec svelte-kit sync
RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm build

# ─── Stage 2: Production ─────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app/apps/manavoxel/apps/web

COPY --from=builder /app/node_modules/.pnpm /app/node_modules/.pnpm
COPY --from=builder /app/apps/manavoxel/apps/web/node_modules ./node_modules
COPY --from=builder /app/apps/manavoxel/apps/web/build ./build
COPY --from=builder /app/apps/manavoxel/apps/web/package.json ./

EXPOSE 5028

ENV NODE_ENV=production
ENV PORT=5028
ENV HOST=0.0.0.0

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5028/health || exit 1

CMD ["node", "build"]
