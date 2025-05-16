# Money Flow Application Makefile
# Provides convenient commands for development, database management, and deployment

# Color definitions
BLUE=\033[0;34m
GREEN=\033[0;32m
YELLOW=\033[0;33m
RED=\033[0;31m
NC=\033[0m # No Color
BOLD=\033[1m

# Default target - show help
.PHONY: help
help:
	@echo "${BOLD}Money Flow Application Makefile${NC}"
	@echo ""
	@echo "${BOLD}Setup & Installation:${NC}"
	@echo "  ${BLUE}make setup${NC}              - Run the interactive setup script for local/AWS setup"
	@echo "  ${BLUE}make install${NC}            - Install dependencies"
	@echo "  ${BLUE}make init${NC}               - Initialize project (install deps + create .env)"
	@echo ""
	@echo "${BOLD}Development:${NC}"
	@echo "  ${BLUE}make dev${NC}                - Start development server"
	@echo "  ${BLUE}make build${NC}              - Build the application"
	@echo "  ${BLUE}make start${NC}              - Start the production server locally"
	@echo "  ${BLUE}make lint${NC}               - Run linting"
	@echo "  ${BLUE}make docker-dev${NC}         - Start development server with Docker"
	@echo ""
	@echo "${BOLD}Database:${NC}"
	@echo "  ${BLUE}make db-create${NC}          - Create the database"
	@echo "  ${BLUE}make db-migrate${NC}         - Run database migrations"
	@echo "  ${BLUE}make db-seed${NC}            - Seed the database with initial data"
	@echo "  ${BLUE}make db-rollback${NC}        - Rollback the last migration"
	@echo "  ${BLUE}make db-create-migration${NC} - Create a new migration file"
	@echo "  ${BLUE}make db-reset${NC}           - Reset database (drop, create, migrate, seed)"
	@echo ""
	@echo "${BOLD}AWS Deployment:${NC}"
	@echo "  ${BLUE}make deploy${NC}             - Deploy to AWS with Copilot"
	@echo "  ${BLUE}make deploy-init${NC}        - Initialize Copilot deployment"
	@echo "  ${BLUE}make deploy-env${NC}         - Create a new deployment environment"
	@echo "  ${BLUE}make deploy-status${NC}      - Check deployment status"
	@echo "  ${BLUE}make deploy-logs${NC}        - View deployment logs"
	@echo ""
	@echo "${BOLD}Helper Commands:${NC}"
	@echo "  ${BLUE}make clean${NC}              - Clean build artifacts and node_modules"
	@echo "  ${BLUE}make env${NC}                - Create/update .env file from .env.example"
	@echo "  ${BLUE}make backup-db${NC}          - Backup the database"
	@echo ""

# Setup & Installation Commands
.PHONY: setup install init

setup: # Run the interactive setup script
	@echo "${BOLD}Running setup script...${NC}"
	@chmod +x scripts/setup.js
	@node scripts/setup.js

install: # Install dependencies
	@echo "${BOLD}Installing dependencies...${NC}"
	@npm install

init: install env # Initialize project (install dependencies + create .env)
	@echo "${BOLD}Project initialized!${NC}"
	@echo "${GREEN}Run 'make dev' to start the development server${NC}"

# Development Commands
.PHONY: dev build start lint docker-dev

dev: # Start development server
	@echo "${BOLD}Starting development server...${NC}"
	@npm run dev

build: # Build the application
	@echo "${BOLD}Building the application...${NC}"
	@npm run build

start: # Start the production server locally
	@echo "${BOLD}Starting production server...${NC}"
	@npm start

lint: # Run linting
	@echo "${BOLD}Running linter...${NC}"
	@npm run lint

docker-dev: # Start development server with Docker
	@echo "${BOLD}Starting Docker development environment...${NC}"
	@docker-compose up -d
	@echo "${GREEN}Docker development environment started at http://localhost:3000${NC}"

# Database Commands
.PHONY: db-create db-migrate db-seed db-rollback db-create-migration db-reset

db-create: # Create the database
	@echo "${BOLD}Creating database...${NC}"
	@createdb money_flow || echo "${YELLOW}Database may already exist${NC}"

db-migrate: # Run database migrations
	@echo "${BOLD}Running database migrations...${NC}"
	@npm run db:migrate

db-seed: # Seed the database with initial data
	@echo "${BOLD}Seeding database...${NC}"
	@npm run db:seed

db-rollback: # Rollback the last migration
	@echo "${BOLD}Rolling back last migration...${NC}"
	@npm run db:rollback

db-create-migration: # Create a new migration file
	@echo "${BOLD}Creating new migration...${NC}"
	@read -p "Enter migration name: " name; \
	npm run db:create-migration -- $$name

db-reset: # Reset database (drop, create, migrate, seed)
	@echo "${BOLD}Resetting database...${NC}"
	@dropdb --if-exists money_flow
	@make db-create
	@make db-migrate
	@make db-seed
	@echo "${GREEN}Database reset complete!${NC}"

# AWS Deployment Commands
.PHONY: deploy deploy-init deploy-env deploy-status deploy-logs

deploy: # Deploy to AWS with Copilot
	@echo "${BOLD}Deploying to AWS...${NC}"
	@npm run deploy

deploy-init: # Initialize Copilot deployment
	@echo "${BOLD}Initializing Copilot deployment...${NC}"
	@npm run deploy:init

deploy-env: # Create a new deployment environment
	@echo "${BOLD}Creating new deployment environment...${NC}"
	@npm run deploy:env

deploy-status: # Check deployment status
	@echo "${BOLD}Checking deployment status...${NC}"
	@npm run deploy:status

deploy-logs: # View deployment logs
	@echo "${BOLD}Viewing deployment logs...${NC}"
	@npm run deploy:logs

# Helper Commands
.PHONY: clean env backup-db

clean: # Clean build artifacts and node_modules
	@echo "${BOLD}Cleaning project...${NC}"
	@rm -rf .next
	@rm -rf node_modules
	@echo "${GREEN}Project cleaned${NC}"

env: # Create/update .env file from .env.example
	@echo "${BOLD}Setting up environment variables...${NC}"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "${GREEN}.env file created from .env.example${NC}"; \
		echo "${YELLOW}Please update the values in .env file${NC}"; \
	else \
		echo "${YELLOW}.env file already exists${NC}"; \
		read -p "Do you want to overwrite it? (y/n) " answer; \
		if [ "$$answer" = "y" ]; then \
			cp .env.example .env; \
			echo "${GREEN}.env file updated from .env.example${NC}"; \
			echo "${YELLOW}Please update the values in .env file${NC}"; \
		fi \
	fi

backup-db: # Backup the database
	@echo "${BOLD}Backing up database...${NC}"
	@mkdir -p backups
	@pg_dump money_flow > backups/money_flow_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "${GREEN}Database backed up to backups/money_flow_$(shell date +%Y%m%d_%H%M%S).sql${NC}"

