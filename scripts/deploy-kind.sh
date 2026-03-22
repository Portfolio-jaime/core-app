#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLUSTER_NAME="healthos"
FULL_API="jaimehenao8126/healthos-api:latest"
FULL_FRONTEND="jaimehenao8126/healthos-frontend:latest"
NGINX_URL="https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml"

echo "─── HealthOS → Kind ──────────────────────────────────────"

# 1. Check dependencies
for cmd in kind kubectl docker; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "❌ $cmd not found. Install it before continuing."
    exit 1
  fi
done

# 2. Create cluster if it doesn't exist
if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
  echo "✔  Cluster '${CLUSTER_NAME}' already exists"
else
  echo "⏳ Creating Kind cluster '${CLUSTER_NAME}'..."
  kind create cluster --name "${CLUSTER_NAME}" --config "${APP_DIR}/k8s/base/kind-cluster.yaml"
fi

# 3. Install NGINX Ingress Controller
echo "⏳ Installing NGINX Ingress Controller..."
kubectl apply -f "${NGINX_URL}"
echo "⏳ Waiting for ingress controller to be ready..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

# 4. Load Docker images into cluster
echo "⏳ Loading images into Kind cluster..."
kind load docker-image "${FULL_FRONTEND}" --name "${CLUSTER_NAME}"
kind load docker-image "${FULL_API}" --name "${CLUSTER_NAME}"

# 5. Apply manifests in order
echo "⏳ Applying Kubernetes manifests..."
kubectl apply -f "${APP_DIR}/k8s/base/namespace.yaml"
kubectl apply -f "${APP_DIR}/k8s/base/secrets.yaml"
kubectl apply -f "${APP_DIR}/k8s/base/configmap.yaml"
kubectl apply -f "${APP_DIR}/k8s/base/postgres-statefulset.yaml"
kubectl apply -f "${APP_DIR}/k8s/base/api-deployment.yaml"
kubectl apply -f "${APP_DIR}/k8s/base/frontend-deployment.yaml"
kubectl apply -f "${APP_DIR}/k8s/base/ingress.yaml"

# 6. Wait for all deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
kubectl rollout status deployment/api -n healthos --timeout=180s
kubectl rollout status deployment/frontend -n healthos --timeout=180s

echo ""
echo "─────────────────────────────────────────────────────────"
echo "✅ HealthOS deployed on Kind"
echo ""
echo "   Add to /etc/hosts:"
echo "   127.0.0.1  healthos.local api.healthos.local"
echo ""
echo "   Frontend:  http://healthos.local"
echo "   API:       http://api.healthos.local/health"
echo ""
echo "   To run DB migrations + seed:"
echo "   make kind-migrate"
echo "─────────────────────────────────────────────────────────"
