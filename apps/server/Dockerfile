# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/server/prisma ./apps/server/prisma
RUN npm ci --no-audit --no-fund

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY apps/server ./apps/server
RUN npx prisma generate --schema apps/server/prisma/schema.prisma
RUN npm run build -w @chatsphere/server

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=4000
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 nodejs
WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/apps/server/dist ./apps/server/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/server/prisma ./apps/server/prisma
USER nodejs
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy --schema apps/server/prisma/schema.prisma && node apps/server/dist/index.js"]
