# ---- Stage 1: Build ----
FROM node:20-slim AS builder

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy workspace root files for pnpm
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy shared-types package
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-types/src packages/shared-types/src/
COPY packages/shared-types/tsconfig.json packages/shared-types/

# Copy pixel-ingest service
COPY services/pixel-ingest/package.json services/pixel-ingest/
COPY services/pixel-ingest/tsconfig.json services/pixel-ingest/
COPY services/pixel-ingest/src services/pixel-ingest/src/

# Install dependencies (workspace-aware)
RUN pnpm install --frozen-lockfile --filter @arkdata/shared-types --filter @arkdata/pixel-ingest

# Build shared-types first, then the service
RUN pnpm --filter @arkdata/shared-types build && \
    pnpm --filter @arkdata/pixel-ingest build

# ---- Stage 2: Production ----
FROM node:20-slim AS runtime

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

ENV NODE_ENV=production
WORKDIR /app

# Copy workspace root files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy built shared-types
COPY --from=builder /app/packages/shared-types/package.json packages/shared-types/
COPY --from=builder /app/packages/shared-types/dist packages/shared-types/dist/

# Copy built service
COPY --from=builder /app/services/pixel-ingest/package.json services/pixel-ingest/
COPY --from=builder /app/services/pixel-ingest/dist services/pixel-ingest/dist/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod --filter @arkdata/shared-types --filter @arkdata/pixel-ingest

WORKDIR /app/services/pixel-ingest

EXPOSE 8080

USER node

CMD ["node", "dist/index.js"]
