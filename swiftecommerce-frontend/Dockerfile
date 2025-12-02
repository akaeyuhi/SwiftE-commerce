# swiftecommerce-frontend/Dockerfile

# -----------------------
# Development stage
# -----------------------
FROM node:18-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Vite's default port is 5173
EXPOSE 5173
# Use "--host" to expose the server to the network
CMD ["npm", "run", "dev", "--", "--host"]

# -----------------------
# Builder stage
# -----------------------
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# -----------------------
# Production stage
# -----------------------
FROM nginx:stable-alpine AS production
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy built assets from builder
COPY --from=builder /app/dist .

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

# container start
CMD ["nginx", "-g", "daemon off;"]
