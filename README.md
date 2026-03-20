# HealthOS – Sistema Personal de Bienestar

> Programa de 12 semanas para Jaime Henao: natación, core, nutrición y seguimiento – Espondilolistesis L5-S1

---

## Estado actual

| Capa | Estado | Tecnología |
|------|--------|-----------|
| Frontend | ✅ En producción (Docker) | Next.js 15, Tailwind, Recharts |
| API | 🚧 En desarrollo | NestJS, Prisma, PostgreSQL |
| Infraestructura | 🚧 En desarrollo | Kind, nginx Ingress, ArgoCD |

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15 (App Router, standalone) |
| API | NestJS (port 4000) |
| ORM | Prisma + PostgreSQL 16 |
| Auth | JWT (access 15min + refresh 7d) |
| Estilos | Tailwind CSS (dark mode) |
| Gráficos | Recharts |
| Contenedores | Docker multi-stage, Docker Compose |
| Registro | Docker Hub – `jaimehenao8126` |
| Clúster | Kind + nginx Ingress + ArgoCD |

---

## Estructura del monorepo

```
core-app/
├── apps/
│   ├── frontend/               # Next.js 15 (App Router)
│   │   ├── app/                # Páginas: dashboard, 7 módulos, auth
│   │   ├── components/         # navigation.tsx, ui/
│   │   ├── lib/                # data.ts, store.ts, utils.ts
│   │   ├── types/              # Tipos TypeScript
│   │   ├── next.config.js      # output:standalone + outputFileTracingRoot
│   │   └── package.json
│   └── api/                    # NestJS (WIP)
│       └── ...
├── k8s/                        # Manifests Kubernetes (WIP → k8s/base/)
├── docs/
│   └── superpowers/plans/      # Plan de implementación
├── Dockerfile                  # Multi-stage: deps → builder → runner
├── docker-compose.yml          # Dev: hot reload (node:20-alpine + bind mount)
├── docker-compose.prod.yml     # Prod: imagen jaimehenao8126/healthos-frontend
├── Makefile                    # Comandos clave
├── .env.example                # Template de variables de entorno
└── package.json                # npm workspaces root
```

---

## Primeros pasos

### 1. Variables de entorno

```bash
cp .env.example .env
# Editar .env con tus valores reales si usas Supabase auth
```

### 2. Desarrollo local (hot reload en Docker)

El código fuente se monta como volumen — los cambios se reflejan al instante.

```bash
make dev
# ó: docker compose up
```

→ App disponible en **http://localhost:3001**

### 3. Probar imagen de producción localmente

```bash
make prod
# ó: docker compose -f docker-compose.prod.yml up --build
```

→ App disponible en **http://localhost:3001** (imagen standalone optimizada, 178 MB)

### 4. Subir imagen a Docker Hub

```bash
docker login -u jaimehenao8126
make release   # build + push jaimehenao8126/healthos-frontend:latest
```

---

## Comandos Makefile

| Comando | Descripción |
|---------|------------|
| `make dev` | Dev con hot reload |
| `make prod` | Build + run imagen producción |
| `make build` | Solo construye la imagen |
| `make push` | Sube imagen a Docker Hub |
| `make release` | Build + push en un paso |
| `make logs` | Tail de logs del contenedor dev |
| `make down` | Para contenedores dev |
| `make down-prod` | Para contenedores prod |
| `make clean` | Para y elimina volúmenes e imagen |
| `make kind-load` | Carga imagen en clúster Kind |

---

## Módulos de la aplicación

### 1. Dashboard `/`
- Peso actual y kg perdidos, score del día (0–70 pts)
- Entrenamiento del día con series/metros
- Checklist de hábitos interactivo
- Gráfico de proyección de peso (12 semanas)

### 2. Entrenamiento `/entrenamiento`
- Plan semanal completo (Lunes–Domingo), expandible por día
- Días de natación: largos, estilo, metros por set
- Días de core/fuerza: ejercicios con instrucciones desplegables

### 3. Natación `/natacion`
- Registro de sesiones (modal con día, duración, notas)
- Rutina progresiva Mes 1/2/3 automática según semana actual
- Gráfico metros reales vs proyectados
- Zona 2 HR: 105–122 bpm

### 4. Nutrición `/nutricion`
- Menús rotativos A→B→C→D con 7 días × 5 comidas
- 157 g proteína diaria — Protocolo Paula Bedón Wellness Coach
- Lista de mercado semanal

### 5. Hábitos `/habitos`
- 9 hábitos diarios (0–70 pts): Junior / Semi-Senior / Senior
- Historial 14 días en gráfico de barras

### 6. Progreso `/progreso`
- Registro semanal: peso, cintura, energía, dolor lumbar
- Calendario 12 semanas + gráficos peso y metros

### 7. Ejercicios `/ejercicios`
- Biblioteca de ejercicios seguros para L5-S1
- Búsqueda por nombre/músculo, filtros por categoría

---

## Perfil del usuario

| Campo | Valor |
|-------|-------|
| Nombre | Jaime Henao |
| Edad | 45 años |
| Altura | 1.80 m |
| Peso inicial | 110 kg |
| Condición | Espondilolistesis L5-S1 |
| Inicio programa | 16 de marzo 2026 |

---

## Persistencia de datos

Actualmente en `localStorage`. La migración a PostgreSQL vía NestJS API está en curso.

| Clave | Contenido |
|-------|-----------|
| `hos_habits` | Hábitos diarios |
| `hos_weekly_records` | Registros semanales |
| `hos_swimming` | Sesiones de natación |
| `hos_training` | Sesiones de entrenamiento |

```javascript
// Limpiar todos los datos (consola del navegador)
Object.keys(localStorage).filter(k => k.startsWith('hos_')).forEach(k => localStorage.removeItem(k))
location.reload()
```

---

## Troubleshooting

### Puerto 3001 ocupado
```bash
lsof -ti:3001 | xargs kill -9
make dev
```

### Limpiar contenedores y volúmenes
```bash
make clean
make dev
```

### Ver qué hay en el contexto Docker (debug)
```bash
docker build --progress=plain -f Dockerfile . 2>&1 | grep "transferring context"
```

---

## Próximos pasos

- [ ] **Chunk 1 restante:** Commit monorepo, scaffold NestJS API, manifests K8s base
- [ ] **Chunk 2:** Prisma schema + PrismaService (TDD)
- [ ] **Chunk 3:** Auth module JWT (registro, login, refresh)
- [ ] **Chunk 4:** Módulos de dominio (workouts, swimming, meals, habits, progress)
- [ ] **Chunk 5:** Migrar frontend de localStorage → HTTP calls a la API
- [ ] Deploy Kind + ArgoCD con imágenes de Docker Hub

Ver [docs/superpowers/plans/2026-03-19-healthos-implementation.md](docs/superpowers/plans/2026-03-19-healthos-implementation.md) para el plan detallado.

---

*HealthOS v0.2.0-wip · Jaime Henao · Docker Hub: jaimehenao8126/healthos-frontend*
