#!/bin/bash
set -e

echo "🚀 Starting services..."

# Load environment
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Start infrastructure first
echo "📦 Starting infrastructure..."
docker-compose up -d postgres_db redis

# Wait for infrastructure
echo "⏳ Waiting for infrastructure..."
docker-compose exec postgres_db sh -c 'until pg_isready -U postgres; do sleep 1; done'
docker-compose exec redis sh -c 'until redis-cli ping; do sleep 1; done'

# Start predictor
echo "🤖 Starting predictor..."
docker-compose up -d predictor

# Wait for predictor
echo "⏳ Waiting for predictor..."
until curl -sf http://localhost:8080/health > /dev/null; do
    echo "Waiting for predictor..."
    sleep 2
done

# Start backend
echo "🔧 Starting backend..."
docker-compose up -d backend

# Wait for backend
echo "⏳ Waiting for backend..."
until curl -sf http://localhost:3000/health > /dev/null; do
    echo "Waiting for backend..."
    sleep 2
done

# Start frontend
echo "🎨 Starting frontend..."
docker-compose up -d frontend

echo "✅ All services started successfully!"
echo ""
echo "Services available at:"
echo "  Frontend:  http://localhost:80"
echo "  Backend:   http://localhost:3000"
echo "  Predictor: http://localhost:8080"
echo "  PgAdmin:   http://localhost:5050"
echo ""
echo "Run 'make logs' to view logs"
