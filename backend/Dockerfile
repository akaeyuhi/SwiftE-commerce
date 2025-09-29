FROM node:18-alpine
LABEL authors="zwyntarsuimin"

WORKDIR /app

# install deps
COPY backend/package*.json backend/tsconfig*.json backend/nest-cli.json ./
COPY backend/jest.config.js ./
RUN npm install

# copy source & build
COPY backend/src/ ./src/
COPY backend/test/ ./test/
RUN npm run build        # assumes "build": "tsc" in package.json
RUN npm run test


EXPOSE 3000
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379

CMD ["node", "dist/src/main"]
