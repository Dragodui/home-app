.PHONY: help run dev build test test-verbose swagger \
	docker-up docker-up-prod docker-down \
	client-install client-start client-android client-ios client-web client-tunnel \
	client-lint client-lint-fix client-format client-build

# Default target
help:
	@echo "Backend (Go, repo root):"
	@echo "  make run              - Run the API server locally"
	@echo "  make dev              - Run with hot-reload (air)"
	@echo "  make build            - Build the server binary"
	@echo "  make test             - Run the backend test suite"
	@echo "  make test-verbose     - Run tests with verbose output"
	@echo "  make swagger          - Regenerate swagger docs (swag init)"
	@echo ""
	@echo "Docker Compose:"
	@echo "  make docker-up        - Start dev stack (hot-reload)"
	@echo "  make docker-up-prod   - Start prod-like stack"
	@echo "  make docker-down      - Stop and remove containers"
	@echo ""
	@echo "Client (Expo/React Native, client/):"
	@echo "  make client-install   - npm install"
	@echo "  make client-start     - Start Expo dev server"
	@echo "  make client-android   - Run on Android"
	@echo "  make client-ios       - Run on iOS"
	@echo "  make client-web       - Run on Web"
	@echo "  make client-tunnel    - Run via ngrok tunnel"
	@echo "  make client-lint      - Biome check"
	@echo "  make client-lint-fix  - Biome check --write"
	@echo "  make client-format    - Biome format --write"
	@echo "  make client-build     - Build web export + PWA injection"

# ---- Backend ----

run:
	go run cmd/server/main.go

dev:
	air

build:
	go build -v ./cmd/server

test:
	go test -v ./tests/...

test-verbose: test

swagger:
	swag init -d ./cmd/server,./internal -g main.go -o ./docs --parseDependency

# ---- Docker Compose ----

docker-up:
	docker compose -f docker-compose.dev.yaml up --build

docker-up-prod:
	docker compose up --build -d

docker-down:
	docker compose down

# ---- Client ----

client-install:
	cd client && npm install

client-start:
	cd client && npm start

client-android:
	cd client && npm run android

client-ios:
	cd client && npm run ios

client-web:
	cd client && npm run web

client-tunnel:
	cd client && npm run tunnel

client-lint:
	cd client && npm run lint

client-lint-fix:
	cd client && npm run lint:fix

client-format:
	cd client && npm run format

client-build:
	cd client && npm run build:web
