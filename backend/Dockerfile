# backend/Dockerfile
# Multi-stage build for NestJS backend

# -----------------------
# Development stage
# -----------------------
FROM node:18-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# -----------------------
# Builder stage
# -----------------------
FROM node:18-alpine AS builder
LABEL stage=builder
WORKDIR /app

# Install build deps (copy package manifests first for layer caching)
COPY package*.json package-lock*.json ./
# Use npm ci for reproducible installs (adapt if you use yarn/pnpm)
RUN npm ci --no-audit --no-fund

# Copy tsconfig / nest config and source files
COPY tsconfig*.json nest-cli.json ./
COPY .env* ./
COPY src ./src

# Build the project (expects "build" script in package.json)
RUN npm run build

# -----------------------
# Runtime stage
# -----------------------
FROM node:18-alpine AS runtime
WORKDIR /app

# Install production deps only
COPY package*.json package-lock*.json ./
RUN npm ci --no-audit --no-fund

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# If you want to include static public assets, ensure backend/public exists in the repo
# (add public/.gitkeep) and uncomment the next line:
# COPY backend/public ./public

ENV PORT=3000
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV DATABASE_HOST=localhost

EXPOSE 3000

# Adjust entrypoint if your compiled nest output is elsewhere (dist/main.js or dist/src/main)
CMD ["node", "dist/main.js"]
