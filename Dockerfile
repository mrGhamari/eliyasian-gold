# syntax=docker/dockerfile:1.7
# Multi-stage build of the Next.js `output: 'standalone'` server.
# Final image ships only the traced runtime (no dev deps, no source).

ARG NODE_IMAGE=node:20.18-alpine

# ── deps: install node_modules with a persistent npm cache ───────────────────
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Resilient install for flaky networks: retry with backoff, longer timeouts.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund \
      --fetch-retries=5 \
      --fetch-retry-factor=2 \
      --fetch-retry-mintimeout=20000 \
      --fetch-retry-maxtimeout=120000 \
      --fetch-timeout=600000

# ── builder: produce .next/standalone ────────────────────────────────────────
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── runner: minimal, non-root runtime ────────────────────────────────────────
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# tini = correct PID 1: forwards SIGTERM to Next and reaps zombies.
# (busybox already provides wget for the HEALTHCHECK — no extra package.)
RUN apk add --no-cache tini \
 && addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# The standalone bundle carries its own minimal, traced node_modules.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# ISR regenerates pages into .next/cache at runtime — must be writable by the
# app user (mount a volume here in compose to persist it across restarts).
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

USER nextjs
EXPOSE 3000

# Liveness only: `/` returns 200 whenever the process is up. A stale upstream
# must NOT mark the container unhealthy — that's what /api/health (503 on stale)
# is for, as an EXTERNAL alerting surface, not a container restart trigger.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/ || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
