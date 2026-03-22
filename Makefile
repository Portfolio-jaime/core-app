DOCKER_USER   := jaimehenao8126
FRONTEND_IMG  := healthos-frontend
API_IMG       := healthos-api
TAG           := latest
CLUSTER       := local-dev
NAMESPACE     := healthos

FULL_FRONTEND := $(DOCKER_USER)/$(FRONTEND_IMG):$(TAG)
FULL_API      := $(DOCKER_USER)/$(API_IMG):$(TAG)

.PHONY: dev dev-build prod build build-frontend build-api push push-frontend push-api logs down down-prod clean \
        k8s-load k8s-apply k8s-deploy k8s-migrate k8s-status k8s-restart

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
k8s-load:
	kind load docker-image $(FULL_FRONTEND) --name $(CLUSTER)
	kind load docker-image $(FULL_API) --name $(CLUSTER)

# ── K8S APP DEPLOY (cluster must be up — run make -C ../dev-cluster cluster-up first) ──
k8s-apply:
	kubectl apply -f k8s/base/namespace.yaml
	kubectl apply -f k8s/base/secrets.yaml
	kubectl apply -f k8s/base/configmap.yaml
	kubectl apply -f k8s/base/postgres-statefulset.yaml
	kubectl apply -f k8s/base/api-deployment.yaml
	kubectl apply -f k8s/base/frontend-deployment.yaml
	kubectl apply -f k8s/base/ingress.yaml
	@echo "✅ healthos manifests applied"

# Full app deploy: load images + apply manifests (cluster already running)
k8s-deploy: k8s-load k8s-apply
	@echo "✅ HealthOS deployed to cluster '$(CLUSTER)'"

k8s-migrate:
	$(eval API_POD := $(shell kubectl get pods -n $(NAMESPACE) -l app=api -o jsonpath='{.items[0].metadata.name}'))
	kubectl exec -n $(NAMESPACE) $(API_POD) -- npx prisma migrate deploy
	kubectl exec -n $(NAMESPACE) $(API_POD) -- npx prisma db seed

k8s-status:
	kubectl get pods -n $(NAMESPACE)
	kubectl get svc -n $(NAMESPACE)
	kubectl get ingress -n $(NAMESPACE)

k8s-restart:
	kubectl rollout restart deployment/api -n $(NAMESPACE)
	kubectl rollout restart deployment/frontend -n $(NAMESPACE)

# ── LEGACY ALIASES (backwards compat) ────────────────────────────────────────
kind-load: k8s-load
kind-apply: k8s-apply
kind-full: k8s-deploy
kind-migrate: k8s-migrate
kind-status: k8s-status
kind-down:
	@echo "⚠️  Use: make -C dev-cluster cluster-down"
	@make -C dev-cluster cluster-down

# ── MAINTENANCE ──────────────────────────────────────────────────────────────
logs:
	docker compose logs -f

clean:
	docker compose down -v --remove-orphans
	docker image rm -f $(FULL_FRONTEND) $(FULL_API) 2>/dev/null || true

