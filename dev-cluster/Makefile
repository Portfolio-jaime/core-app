CLUSTER_NAME := local-dev

.PHONY: cluster-up cluster-down cluster-status apps-status

# ── LIFECYCLE ────────────────────────────────────────────────────────────────
cluster-up:
	kind create cluster --name $(CLUSTER_NAME) --config kind-cluster.yaml
	kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
	@echo "⏳ Waiting for ingress-nginx controller..."
	@sleep 10
	kubectl wait --namespace ingress-nginx \
	  --for=condition=ready pod \
	  --selector=app.kubernetes.io/component=controller \
	  --timeout=120s
	@echo "✅ Cluster '$(CLUSTER_NAME)' ready — nginx ingress installed"

cluster-down:
	kind delete cluster --name $(CLUSTER_NAME)

cluster-status:
	kubectl config use-context kind-$(CLUSTER_NAME)
	kubectl get nodes
	kubectl get namespaces

# ── APPS STATUS (cross-namespace overview) ───────────────────────────────────
apps-status:
	@echo "\n=== healthos ===" && kubectl get pods,svc,ingress -n healthos 2>/dev/null || echo "(not deployed)"
	@echo "\n=== bills ===" && kubectl get pods,svc,ingress -n bills 2>/dev/null || echo "(not deployed)"
