# ─── Stage 1: dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy workspace manifests so npm ci resolves the monorepo correctly
COPY package.json package-lock.json* ./
COPY apps/frontend/package.json ./apps/frontend/package.json
RUN npm ci

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars (Supabase public keys are safe to embed at build time)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npm run build:frontend

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
# outputFileTracingRoot = monorepo root, so standalone layout is:
#   apps/frontend/server.js
#   apps/frontend/.next/static  (copied below)
#   apps/frontend/public        (copied below)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

COPY --from=builder /app/apps/frontend/public           ./apps/frontend/public
COPY --from=builder --chown=nextjs:nodejs \
     /app/apps/frontend/.next/standalone                ./
COPY --from=builder --chown=nextjs:nodejs \
     /app/apps/frontend/.next/static                    ./apps/frontend/.next/static

USER nextjs

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/frontend/server.js"]
