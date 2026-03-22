# Guía del Makefile — core-app (HealthOS)

> Ubicación: `/Users/jaime.henao/arheanja/core-app/`
> Imágenes: `jaimehenao8126/healthos-frontend:latest` · `jaimehenao8126/healthos-api:latest`
> Cluster: `local-dev` · Namespace: `healthos`

---

## Requisitos previos

- Docker Desktop corriendo
- `kind` y `kubectl` instalados
- Cluster `local-dev` activo (ver `~/arheanja/dev-cluster/MAKEFILE_GUIDE.md`)
- Sesión activa en Docker Hub: `docker login -u jaimehenao8126`

---

## Grupos de comandos

### 🔧 Desarrollo local (hot reload)

| Comando | Descripción |
|---------|-------------|
| `make dev` | Levanta frontend + api + postgres con hot reload |
| `make dev-build` | Ídem pero forzando rebuild de imágenes |
| `make down` | Para los contenedores de desarrollo |
| `make logs` | Tail de logs de todos los contenedores dev |

```bash
make dev
# Frontend → http://localhost:3001
# API      → http://localhost:4000
```

> El código fuente se monta como volumen — los cambios se reflejan sin rebuild.

---

### 🏗️ Build de imágenes de producción

| Comando | Descripción |
|---------|-------------|
| `make build` | Construye frontend + api |
| `make build-frontend` | Solo construye la imagen del frontend |
| `make build-api` | Solo construye la imagen del API |

```bash
make build-api    # usa Dockerfile.api (multi-stage: builder + runner con OpenSSL)
make build-frontend  # usa Dockerfile (multi-stage: deps + builder + runner)
```

**Imágenes generadas:**
- `jaimehenao8126/healthos-frontend:latest`
- `jaimehenao8126/healthos-api:latest`

---

### 🚀 Producción Docker Compose

| Comando | Descripción |
|---------|-------------|
| `make prod` | Build + run con `docker-compose.prod.yml` |
| `make prod-up` | Run sin rebuild (usa imágenes existentes) |
| `make down-prod` | Para los contenedores de producción |

```bash
make prod
# Frontend → http://localhost:3001
```

---

### 📦 Docker Hub

| Comando | Descripción |
|---------|-------------|
| `make push` | Push de frontend + api |
| `make push-frontend` | Build + push solo del frontend |
| `make push-api` | Build + push solo del API |
| `make release` | Build + push de todo (atajo completo) |

```bash
# Workflow típico al hacer cambios en el código:
make release
# Luego recargar en el cluster:
make k8s-load && make k8s-restart
```

---

### ☸️ Kubernetes — Deploy en cluster `local-dev`

> El cluster debe estar activo. Si no: `cd ~/arqueanja/dev-cluster && make cluster-up`

| Comando | Descripción |
|---------|-------------|
| `make k8s-load` | Carga las imágenes locales en el nodo Kind |
| `make k8s-apply` | Aplica todos los manifests del namespace `healthos` |
| `make k8s-deploy` | `k8s-load` + `k8s-apply` (deploy completo) |
| `make k8s-migrate` | Prisma migrate deploy + db seed en el pod del API |
| `make k8s-status` | Estado de pods, services e ingress |
| `make k8s-restart` | Rollout restart de api y frontend |

#### Deploy inicial (primera vez)

```bash
make k8s-deploy    # carga imágenes + aplica manifests
make k8s-migrate   # migraciones + seed de la base de datos
```

#### Actualizar tras un cambio de código

```bash
make release           # rebuild + push a Docker Hub
make k8s-load          # recarga la imagen en el nodo Kind
make k8s-restart       # reinicia los pods con la nueva imagen
```

#### Verificar estado

```bash
make k8s-status
# NAME                            READY   STATUS    RESTARTS   AGE
# api-6c74b654d8-xz24m            1/1     Running   0          10m
# frontend-6fddc949df-bvht9       1/1     Running   0          10m
# postgres-0                      1/1     Running   0          10m
```

#### URLs tras el deploy

| URL | Descripción |
|-----|-------------|
| `http://healthos.local` | Frontend Next.js |
| `http://api.healthos.local/health` | Health check del API |
| `http://api.healthos.local` | Raíz del API (NestJS) |

---

### 🧹 Mantenimiento

| Comando | Descripción |
|---------|-------------|
| `make clean` | Para contenedores dev, elimina volúmenes e imágenes locales |

```bash
make clean   # útil para resetear el entorno de desarrollo completamente
```

---

## Flujos de trabajo habituales

### Día a día — desarrollo

```bash
make dev          # levantar entorno
# ... codear ...
make down         # apagar al terminar
```

### Publicar cambios al cluster

```bash
# Si cambió el API:
make build-api && make push-api && make k8s-load && make k8s-restart

# Si cambió el frontend:
make build-frontend && make push-frontend && make k8s-load && make k8s-restart

# Si cambiaron ambos:
make release && make k8s-load && make k8s-restart
```

### Reset completo de la base de datos en Kind

```bash
kubectl delete pod postgres-0 -n healthos   # elimina el pod (el StatefulSet lo recrea)
make k8s-migrate                             # vuelve a aplicar migraciones + seed
```

---

## Variables configurables

Definidas al inicio del Makefile, se pueden sobreescribir:

```bash
make k8s-load TAG=v1.2.0          # usar tag específico en lugar de latest
make k8s-status NAMESPACE=staging  # ver otro namespace
```

| Variable | Valor por defecto | Descripción |
|----------|-------------------|-------------|
| `DOCKER_USER` | `jaimehenao8126` | Usuario de Docker Hub |
| `TAG` | `latest` | Tag de las imágenes |
| `CLUSTER` | `local-dev` | Nombre del cluster Kind |
| `NAMESPACE` | `healthos` | Namespace de Kubernetes |
