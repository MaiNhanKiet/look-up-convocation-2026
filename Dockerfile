FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_HERO_ANIMATION_INTERVAL_MS=15000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_HERO_ANIMATION_INTERVAL_MS=$NEXT_PUBLIC_HERO_ANIMATION_INTERVAL_MS
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build
RUN mkdir -p /prisma-cli \
  && cp -a \
    node_modules/prisma \
    node_modules/@prisma \
    node_modules/dotenv \
    node_modules/c12 \
    node_modules/deepmerge-ts \
    node_modules/defu \
    node_modules/destr \
    node_modules/effect \
    node_modules/exsolve \
    node_modules/fast-check \
    node_modules/get-port-please \
    node_modules/graceful-fs \
    node_modules/grammex \
    node_modules/graphmatch \
    node_modules/jiti \
    node_modules/pathe \
    node_modules/perfect-debounce \
    node_modules/pkg-types \
    node_modules/proper-lockfile \
    node_modules/pure-rand \
    node_modules/rc9 \
    node_modules/remeda \
    node_modules/retry \
    node_modules/std-env \
    node_modules/valibot \
    node_modules/zeptomatch \
    /prisma-cli/

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /prisma-cli/ ./node_modules/
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod 755 /app/entrypoint.sh
USER nextjs
EXPOSE 3000
ENTRYPOINT ["/app/entrypoint.sh"]
