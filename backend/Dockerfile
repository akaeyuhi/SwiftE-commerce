# backend/Dockerfile
# Multi-stage build for NestJS backend
FROM node:18-alpine AS builder
LABEL stage=builder
WORKDIR /app

# Install build deps
# copy package manifests first for caching
COPY backend/package*.json backend/package-lock*.json ./
# If you use pnpm or yarn adapt accordingly
RUN npm ci --no-audit --no-fund

# Copy TypeScript sources and build
COPY backend/tsconfig*.json ./
COPY backend/nest-cli.json ./
COPY backend/.env.example ./
COPY backend/src ./src
COPY backend/ormconfig* ./ || true

# Build
RUN npm run build

# production image
FROM node:18-alpine AS runtime
WORKDIR /app

# Production deps - install only prod deps (if any)
COPY backend/package*.json backend/package-lock*.json ./
RUN npm ci --production --no-audit --no-fund

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist
# If you need assets, copy them as well
COPY backend/public ./public 2/> /dev/null || true

ENV NODE_ENV=production
ENV PORT=3000
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV DATABASE_HOST=postgres_db

EXPOSE 3000

CMD ["node", "dist/src/main"]
