# Guía del Makefile — dev-cluster

> Cluster Kind compartido entre todas las apps del workspace `~/arheanja/`.
> Ubicación: `core-app/dev-cluster/` (parte del repo `core-app`)

---

## Arquitectura

### Visión general del workspace

```mermaid
graph TD
    subgraph "~/arheanja/ — Workspace local"
        DC["📁 core-app/dev-cluster/\nCluster local-dev\n(este repo)"]
        CA["📦 core-app\nhealthos namespace"]
        BA["📦 bills-app\nbills namespace"]
    end

    DC -->|"make cluster-up\nnginx ingress"| K8S

    subgraph K8S["☸️ Kind Cluster: local-dev"]
        NS_HOS["namespace: healthos"]
        NS_BILLS["namespace: bills"]
        NS_NGINX["namespace: ingress-nginx"]
    end

    CA -->|"make k8s-deploy"| NS_HOS
    BA -->|"make k8s-deploy"| NS_BILLS

    subgraph "🖥️ macOS Host"
        H80["localhost:80"]
        HOSTS["/etc/hosts\nhealthos.local\nbills.local"]
    end

    H80 --> NS_NGINX
    NS_NGINX --> NS_HOS
    NS_NGINX --> NS_BILLS
```

---

### Arquitectura interna — namespace `healthos`

```mermaid
graph LR
    Browser["🌐 Browser"] -->|"http://healthos.local"| Ingress

    subgraph "namespace: healthos"
        Ingress["ingress\nhealthos-ingress\nnginx"]

        Ingress -->|"healthos.local"| FE["🖥️ frontend\nDeployment\nNext.js :3001"]
        Ingress -->|"api.healthos.local"| API["⚙️ api\nDeployment\nNestJS :4000"]
        API -->|"postgres-svc:5432"| DB[("🗄️ postgres\nStatefulSet\nPostgreSQL 16")]
    end

    FE -->|"NEXT_PUBLIC_API_URL\nhttp://api.healthos.local"| Ingress
```

---

### Flujo de imágenes Docker

```mermaid
sequenceDiagram
    participant Dev as 💻 Dev (macOS)
    participant DH as 🐳 Docker Hub
    participant Kind as ☸️ Kind Node
    participant Pod as 📦 Pod

    Dev->>Dev: make build-api / build-frontend
    Dev->>DH: make push (jaimehenao8126/healthos-*)
    Dev->>Kind: make k8s-load (kind load docker-image)
    Kind->>Pod: kubectl apply / rollout restart
    Pod-->>Dev: Running ✅
```

---

### Ciclo de vida del cluster

```mermaid
stateDiagram-v2
    [*] --> Inexistente
    Inexistente --> Levantado : make cluster-up
    Levantado --> ConApps : make k8s-deploy (por app)
    ConApps --> ConApps : make k8s-restart / k8s-migrate
    ConApps --> Levantado : kubectl delete namespace X
    Levantado --> Inexistente : make cluster-down
    Levantado --> Corrupto : Docker Desktop cerrado/reiniciado
    Corrupto --> Inexistente : make cluster-down
    Inexistente --> Levantado : make cluster-up
```

---

---

## Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) corriendo
- [`kind`](https://kind.sigs.k8s.io/) instalado (`brew install kind`)
- [`kubectl`](https://kubernetes.io/docs/tasks/tools/) instalado (`brew install kubectl`)

---

## Comandos

### `make cluster-up`

Crea el cluster `local-dev` e instala nginx Ingress Controller.

```bash
cd ~/arheanja/dev-cluster
make cluster-up
```

**Qué hace:**
1. `kind create cluster --name local-dev` usando `kind-cluster.yaml`
2. Instala nginx Ingress Controller desde el manifest oficial de Kind
3. Espera a que el pod del controlador esté `Ready`

**Cuándo usarlo:** La primera vez, o después de un `make cluster-down` / reinicio de Docker Desktop.

**Tiempo estimado:** ~60–90 segundos

---

### `make cluster-down`

Destruye el cluster y libera todos los recursos Docker asociados.

```bash
make cluster-down
```

> ⚠️ Esto elimina todos los pods, volúmenes y datos en el cluster. La base de datos se pierde.
> Necesitarás ejecutar `make k8s-migrate` en cada app después de volver a levantar.

---

### `make cluster-status`

Cambia al contexto `kind-local-dev` y muestra nodos y namespaces activos.

```bash
make cluster-status
```

**Output esperado:**
```
NAME                        STATUS   ROLES           AGE
local-dev-control-plane     Ready    control-plane   5m

NAME              STATUS   AGE
default           Active   5m
healthos          Active   3m
ingress-nginx     Active   5m
kube-system       Active   5m
```

---

### `make apps-status`

Vista general de todas las apps desplegadas en el cluster (cross-namespace).

```bash
make apps-status
```

**Output esperado:**
```
=== healthos ===
NAME                            READY   STATUS    RESTARTS   AGE
pod/api-6c74b654d8-xz24m        1/1     Running   0          10m
pod/frontend-6fddc949df-bvht9   1/1     Running   0          10m
pod/postgres-0                  1/1     Running   0          10m

=== bills ===
(not deployed)
```

---

## Flujo completo desde cero

```bash
# 1. Levantar cluster
cd ~/arheanja/core-app/dev-cluster && make cluster-up

# 2. Desplegar HealthOS
cd ~/arheanja/core-app && make k8s-deploy && make k8s-migrate

# 3. Desplegar bills-app (cuando esté lista)
cd ~/arheanja/bills-app && make k8s-deploy && make k8s-migrate

# 4. Ver estado global
cd ~/arheanja/core-app/dev-cluster && make apps-status
```

---

## Namespaces por app

| App | Namespace | Ingress |
|-----|-----------|---------|
| core-app (HealthOS) | `healthos` | `healthos.local` / `api.healthos.local` |
| bills-app | `bills` | `bills.local` / `api.bills.local` (por definir) |

---

## /etc/hosts requerido

Añadir una sola vez:

```bash
# HealthOS
echo "127.0.0.1  healthos.local api.healthos.local" | sudo tee -a /etc/hosts

# bills-app (cuando esté lista)
echo "127.0.0.1  bills.local api.bills.local" | sudo tee -a /etc/hosts
```

---

## Problema común: cluster no arranca tras reinicio de Docker

Si Docker Desktop fue cerrado, el cluster queda en estado `Exited (1)` con error de IP:

```
ERROR: have an old IPv4 address but no current IPv4 address (!)
```

**Solución:**
```bash
make cluster-down   # elimina el cluster dañado
make cluster-up     # lo recrea limpio
```
