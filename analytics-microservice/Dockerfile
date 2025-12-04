# ---------------------------------------------------
# Stage 1: Build
# ---------------------------------------------------
FROM node:18-alpine As build

WORKDIR /usr/src/app

# Copy dependency definitions
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm install

# Copy source code
COPY . .

# Build the NestJS application
RUN npm run build

# ---------------------------------------------------
# Stage 2: Production
# ---------------------------------------------------
FROM node:18-alpine as production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package*.json ./

# Install only production dependencies to keep image small
RUN npm install --only=production

# Copy built assets from the build stage
COPY --from=build /usr/src/app/dist ./dist

# The microservice listens on RabbitMQ, not HTTP, so we don't strictly need EXPOSE
# But if you add a health check endpoint later, you might need port 3000
# EXPOSE 3000

CMD ["node", "dist/main"]
