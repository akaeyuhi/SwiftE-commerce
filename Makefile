.PHONY: help up down logs restart clean build rebuild train health

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ================================
# Development Commands
# ================================

dev: ## Start development environment
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

dev-logs: ## Follow development logs
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

dev-down: ## Stop development environment
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml down

# ================================
# Production Commands
# ================================

up: ## Start production services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

logs: ## View logs
	docker-compose logs -f

restart: ## Restart all services
	docker-compose restart

restart-backend: ## Restart backend only
	docker-compose restart backend

restart-predictor: ## Restart predictor only
	docker-compose restart predictor

# ================================
# Build Commands
# ================================

build: ## Build all images
	docker-compose build

rebuild: ## Rebuild without cache
	docker-compose build --no-cache

build-predictor: ## Build predictor only
	docker-compose build predictor

# ================================
# Training Commands
# ================================

train: ## Run ML training pipeline
	docker-compose --profile training up predictor-train

train-custom: ## Run training with custom dates (START=2025-01-01 END=2025-10-01 make train-custom)
	TRAIN_START_DATE=$(START) TRAIN_END_DATE=$(END) docker-compose --profile training up predictor-train

# ================================
# Database Commands
# ================================

db-migrate: ## Run database migrations
	docker-compose exec backend npm run migration:run

db-seed: ## Seed database
	docker-compose exec backend npm run seed

db-backup: ## Backup database
	docker-compose exec postgres_db pg_dump -U postgres ecommerce_db > backup_$$(date +%Y%m%d_%H%M%S).sql

db-restore: ## Restore database (FILE=backup.sql make db-restore)
	docker-compose exec -T postgres_db psql -U postgres ecommerce_db < $(FILE)

db-shell: ## PostgreSQL shell
	docker-compose exec postgres_db psql -U postgres -d ecommerce_db

# ================================
# Health & Monitoring
# ================================

health: ## Check service health
	@echo "=== Service Health Status ==="
	@docker-compose ps
	@echo "\n=== Backend Health ==="
	@curl -s http://localhost:3000/health | jq || echo "Backend not responding"
	@echo "\n=== Predictor Health ==="
	@curl -s http://localhost:8080/health | jq || echo "Predictor not responding"
	@echo "\n=== Redis Health ==="
	@docker-compose exec redis redis-cli ping || echo "Redis not responding"

monitoring: ## Start monitoring stack
	docker-compose --profile monitoring up -d

# ================================
# Cleanup Commands
# ================================

clean: ## Remove all containers and volumes
	docker-compose down -v

clean-images: ## Remove all images
	docker-compose down --rmi all

prune: ## Clean up Docker system
	docker system prune -af --volumes

# ================================
# Development Helpers
# ================================

shell-backend: ## Shell into backend
	docker-compose exec backend sh

shell-predictor: ## Shell into predictor
	docker-compose exec predictor sh

shell-db: ## Shell into database
	docker-compose exec postgres_db sh

install-backend: ## Install backend dependencies
	docker-compose exec backend npm install

install-frontend: ## Install frontend dependencies
	docker-compose exec frontend npm install

test-backend: ## Run backend tests
	docker-compose exec backend npm test

test-predictor: ## Run predictor tests
	docker-compose exec predictor pytest tests/

# ================================
# Production Deploy
# ================================

deploy: ## Deploy to production
	@echo "Building images..."
	docker-compose build
	@echo "Starting services..."
	docker-compose up -d
	@echo "Waiting for services to be healthy..."
	sleep 10
	@make health
	@echo "Deployment complete!"

# ================================
# Logs
# ================================

logs-backend: ## Backend logs
	docker-compose logs -f backend

logs-predictor: ## Predictor logs
	docker-compose logs -f predictor

logs-db: ## Database logs
	docker-compose logs -f postgres_db

logs-all: ## All logs
	docker-compose logs -f
