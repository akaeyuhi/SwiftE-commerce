.PHONY: help test test-unit test-integration test-e2e test-all coverage lint format clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	pip install -r requirements.txt -r requirements-train.txt -r requirements-test.txt

test-unit: ## Run unit tests only
	pytest tests/unit -v -m "not slow"

test-integration: ## Run integration tests
	pytest tests/integration -v -m "not slow"

test-e2e: ## Run end-to-end tests
	pytest tests/e2e -v

test-fast: ## Run fast tests only
	pytest tests/ -v -m "not slow"

test-all: ## Run all tests including slow ones
	pytest tests/ -v

test-parallel: ## Run tests in parallel
	pytest tests/ -v -n auto

coverage: ## Run tests with coverage
	pytest tests/ --cov=predictor --cov-report=html --cov-report=term-missing

coverage-report: ## Open coverage report
	open htmlcov/index.html

lint: ## Run linters
	flake8 predictor tests
	mypy predictor --ignore-missing-imports
	black --check predictor tests

format: ## Format code
	black predictor tests
	isort predictor tests

clean: ## Clean up generated files
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf .coverage
	rm -rf *.egg-info
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

test-watch: ## Run tests in watch mode
	ptw tests/ -- -v

docker-test: ## Run tests in Docker
	docker-compose -f docker-compose.test.yml up --abort-on-container-exit
