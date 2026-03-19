#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLUSTER_NAME="health-os"
IMAGE_NAME="health-os:latest"

echo "─── HealthOS → kind ───────────────────────────────────"

# 1. Verificar dependencias
for cmd in kind kubectl docker; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "❌ $cmd no encontrado. Instálalo antes de continuar."
    exit 1
  fi
done

# 2. Crear cluster si no existe
if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
  echo "✔  Cluster '${CLUSTER_NAME}' ya existe"
else
  echo "⏳ Creando cluster kind..."
  kind create cluster --config "${APP_DIR}/k8s/kind-cluster.yaml"
fi

# 3. Instalar NGINX ingress controller
echo "⏳ Instalando NGINX Ingress Controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
echo "⏳ Esperando que ingress esté listo..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

# 4. Build de la imagen Docker
echo "⏳ Construyendo imagen Docker..."
cd "${APP_DIR}"
docker build -t "${IMAGE_NAME}" \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" \
  .

# 5. Cargar imagen al cluster kind
echo "⏳ Cargando imagen en kind..."
kind load docker-image "${IMAGE_NAME}" --name "${CLUSTER_NAME}"

# 6. Aplicar manifiestos
echo "⏳ Aplicando manifiestos Kubernetes..."
kubectl apply -f "${APP_DIR}/k8s/namespace.yaml"
kubectl apply -f "${APP_DIR}/k8s/configmap.yaml"
kubectl apply -f "${APP_DIR}/k8s/secret.yaml"
kubectl apply -f "${APP_DIR}/k8s/deployment.yaml"
kubectl apply -f "${APP_DIR}/k8s/service.yaml"
kubectl apply -f "${APP_DIR}/k8s/ingress.yaml"

# 7. Esperar deploy
echo "⏳ Esperando deployment..."
kubectl rollout status deployment/health-os -n health-os --timeout=120s

echo ""
echo "─────────────────────────────────────────────────────────"
echo "✅ HealthOS desplegado en kind"
echo ""
echo "   Agrega esta línea a /etc/hosts:"
echo "   127.0.0.1  health-os.local"
echo ""
echo "   Luego abre:  http://health-os.local:8080"
echo "─────────────────────────────────────────────────────────"
