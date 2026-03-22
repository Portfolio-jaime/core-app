CLUSTER_NAME := local-dev

.PHONY: cluster-up cluster-down cluster-status apps-status argocd-install argocd-status argocd-open

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
	@echo "\n=== argocd ===" && kubectl get pods -n argocd 2>/dev/null || echo "(not installed)"

# ── ARGOCD ───────────────────────────────────────────────────────────────────
argocd-install:
	@echo "📦 Installing ArgoCD..."
	kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
	kubectl apply -n argocd --server-side \
	  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
	@echo "⏳ Waiting for ArgoCD server..."
	kubectl wait --namespace argocd \
	  --for=condition=available deployment/argocd-server \
	  --timeout=180s
	@echo "� Setting insecure mode (nginx ingress termination)..."
	kubectl patch configmap argocd-cmd-params-cm -n argocd \
	  --type merge -p '{"data":{"server.insecure":"true"}}'
	kubectl rollout restart deployment/argocd-server -n argocd
	kubectl rollout status deployment/argocd-server -n argocd --timeout=60s
	@echo "📋 Applying HealthOS ArgoCD Application + Ingress..."
	kubectl apply -f ../k8s/argocd/application.yaml
	kubectl apply -f ../k8s/argocd/ingress.yaml
	@echo "✅ ArgoCD ready at http://argocd.local  (user: admin)"
	@echo "🔑 Password:"; kubectl -n argocd get secret argocd-initial-admin-secret \
	  -o jsonpath="{.data.password}" | base64 -d && echo ""

argocd-status:
	@echo "\n=== ArgoCD Pods ===" && kubectl get pods -n argocd
	@echo "\n=== ArgoCD Applications ===" && kubectl get applications -n argocd 2>/dev/null || echo "(no applications)"

argocd-open:
	@echo "🌐 ArgoCD UI: http://argocd.local  (user: admin)"
	@echo "🔑 Password:"; kubectl -n argocd get secret argocd-initial-admin-secret \
	  -o jsonpath="{.data.password}" | base64 -d && echo ""
