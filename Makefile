DOCKER_USER := jaimehenao8126
IMAGE       := healthos-frontend
TAG         := latest
FULL_IMAGE  := $(DOCKER_USER)/$(IMAGE):$(TAG)

.PHONY: dev dev-build prod build push logs down down-prod clean kind-load

# ── LOCAL DEV (hot reload) ────────────────────────────────────────────────────
dev:
	docker compose up

dev-build:
	docker compose up --build

down:
	docker compose down

# ── PRODUCTION (build standalone image) ──────────────────────────────────────
prod:
	docker compose -f docker-compose.prod.yml up --build

prod-up:
	docker compose -f docker-compose.prod.yml up

down-prod:
	docker compose -f docker-compose.prod.yml down

build:
	docker compose -f docker-compose.prod.yml build

# ── DOCKER HUB ────────────────────────────────────────────────────────────────
push: build
	docker push $(FULL_IMAGE)

# Convenience: build + push in one step
release: build push
	@echo "✅  $(FULL_IMAGE) pushed to Docker Hub"

# ── KIND (run after: make push) ───────────────────────────────────────────────
# Load the local image into a running Kind cluster (skips Docker Hub pull)
kind-load:
	kind load docker-image $(FULL_IMAGE)

# ── MAINTENANCE ───────────────────────────────────────────────────────────────
logs:
	docker compose logs -f

clean:
	docker compose down -v --remove-orphans
	docker image rm -f $(FULL_IMAGE) 2>/dev/null || true
