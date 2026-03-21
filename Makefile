DOCKER_USER   := jaimehenao8126
FRONTEND_IMG  := healthos-frontend
API_IMG       := healthos-api
TAG           := latest

FULL_FRONTEND := $(DOCKER_USER)/$(FRONTEND_IMG):$(TAG)
FULL_API      := $(DOCKER_USER)/$(API_IMG):$(TAG)

.PHONY: dev dev-build prod build build-frontend build-api push push-frontend push-api logs down down-prod clean kind-load

# ── LOCAL DEV (hot reload — frontend + api + postgres) ───────────────────────
dev:
	docker compose up

dev-build:
	docker compose up --build

down:
	docker compose down

# ── PRODUCTION (build standalone images) ────────────────────────────────────
prod:
	docker compose -f docker-compose.prod.yml up --build

prod-up:
	docker compose -f docker-compose.prod.yml up

down-prod:
	docker compose -f docker-compose.prod.yml down

build: build-frontend build-api

build-frontend:
	docker compose -f docker-compose.prod.yml build frontend

build-api:
	docker compose -f docker-compose.prod.yml build api

# ── DOCKER HUB ───────────────────────────────────────────────────────────────
push: push-frontend push-api

push-frontend: build-frontend
	docker push $(FULL_FRONTEND)

push-api: build-api
	docker push $(FULL_API)

# Convenience: build + push everything
release: build push
	@echo "✅  $(FULL_FRONTEND) and $(FULL_API) pushed to Docker Hub"

# ── KIND (run after: make push) ──────────────────────────────────────────────
kind-load:
	kind load docker-image $(FULL_FRONTEND)
	kind load docker-image $(FULL_API)

# ── MAINTENANCE ──────────────────────────────────────────────────────────────
logs:
	docker compose logs -f

clean:
	docker compose down -v --remove-orphans
	docker image rm -f $(FULL_FRONTEND) $(FULL_API) 2>/dev/null || true
