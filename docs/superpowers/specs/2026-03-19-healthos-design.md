# HealthOS — Sistema Personal de Bienestar
## Spec de diseño · 2026-03-19

---

## 1. Contexto y objetivos

**Usuario principal:** Jaime Henao, 45 años, 1.80 m, 110 kg, espondilolistesis L5-S1.

**Objetivos del sistema:**
- Bajar peso progresivamente: 110 → 105 kg (mes 1) → 97 kg (mes 3)
- Fortalecer core y musculatura lumbar para proteger L5-S1
- Seguimiento de natación como cardio principal (4 días/semana)
- Controlar nutrición: 157 g proteína/día, 2 L agua, alternancia keto/convencional en cenas
- Sistema de hábitos con score diario 0–100 (protocolo Paula Bedón)
- App multi-usuario con auth completa (registro + login)

---

## 2. Decisiones de diseño

| Pregunta | Decisión |
|----------|----------|
| Plataforma | Web app responsive (mobile + desktop) |
| Usuarios | Multi-usuario con auth JWT |
| Backend | Microservicios: frontend pod, API pod, DB pod |
| Deployment | Kind (Kubernetes local) + ArgoCD GitOps |
| Layout | Fully responsive — mobile bottom nav / desktop sidebar |
| CI/CD | ArgoCD watching GitHub repo |
| Stack | Next.js 14 + NestJS + PostgreSQL 16 + Prisma |

---

## 3. Arquitectura del sistema

### 3.1 Kind Cluster

```
GitOps Flow:
  GitHub Repo → push → ArgoCD → sync → Kind Cluster

Kind Cluster: healthos
  namespace: healthos
    Pod: frontend   — Next.js 14 (port 3000)
    Pod: api        — NestJS (port 4000)
    Pod: db         — PostgreSQL 16 (port 5432) + PVC 5Gi
  namespace: argocd
    ArgoCD Server   — UI + sync controller

  Ingress (nginx):
    healthos.local       → frontend-svc:3000
    api.healthos.local   → api-svc:4000
```

### 3.2 Monorepo structure

```
healthos/
├── apps/
│   ├── frontend/           # Next.js 14 App Router
│   │   ├── app/
│   │   │   ├── (auth)/     # login, register
│   │   │   ├── dashboard/
│   │   │   ├── workout/
│   │   │   ├── swimming/
│   │   │   ├── nutrition/
│   │   │   ├── habits/
│   │   │   ├── body/
│   │   │   └── library/
│   │   ├── components/
│   │   │   ├── ui/         # shadcn/ui components
│   │   │   └── charts/     # Recharts wrappers
│   │   └── package.json
│   └── api/                # NestJS
│       ├── src/
│       │   ├── auth/
│       │   ├── users/
│       │   ├── workouts/
│       │   ├── swimming/
│       │   ├── meals/
│       │   ├── habits/
│       │   ├── body/
│       │   └── exercises/
│       ├── prisma/
│       │   └── schema.prisma
│       └── package.json
├── k8s/
│   ├── base/
│   │   ├── namespace.yaml
│   │   ├── frontend-deployment.yaml
│   │   ├── api-deployment.yaml
│   │   ├── postgres-statefulset.yaml
│   │   ├── ingress.yaml
│   │   └── secrets.yaml
│   └── argocd/
│       └── application.yaml
├── docker/
│   ├── frontend.Dockerfile
│   └── api.Dockerfile
└── package.json             # npm workspaces root
```

---

## 4. Stack tecnológico completo

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript |
| UI | Tailwind CSS, shadcn/ui |
| Charts | Recharts |
| API | NestJS, TypeScript |
| ORM | Prisma |
| Auth | JWT (access token 15min + refresh token 7d) |
| Base de datos | PostgreSQL 16 |
| Contenedores | Docker, multi-stage builds |
| Kubernetes | Kind (local), nginx Ingress |
| GitOps | ArgoCD |
| Package manager | npm workspaces (monorepo) |

---

## 5. Modelo de datos

### 5.1 Tablas

```sql
-- Usuarios
users (
  id              UUID PK,
  name            VARCHAR(100),
  email           VARCHAR UNIQUE,
  password_hash   TEXT,
  height_cm       INT,
  birth_date      DATE,
  condition_notes TEXT,          -- "Espondilolistesis L5-S1"
  protein_goal_g  INT DEFAULT 157,
  water_goal_ml   INT DEFAULT 2000,
  created_at      TIMESTAMP
)

-- Entrenamientos diarios
workout_logs (
  id           UUID PK,
  user_id      UUID FK→users,
  date         DATE,
  type         ENUM(core, strength, swimming, rest),
  duration_min INT,
  notes        TEXT,
  completed    BOOLEAN DEFAULT false,
  created_at   TIMESTAMP
)

-- Sesiones de natación
swimming_sessions (
  id             UUID PK,
  user_id        UUID FK→users,
  date           DATE,
  total_laps     INT,
  total_meters   INT,
  duration_min   INT,
  pool_length_m  INT DEFAULT 25,
  strokes_json   JSONB,  -- { free: n, back: n, kick: n, warmup: n }
  avg_hr_bpm     INT,
  notes          TEXT
)

-- Registro de comidas (5 por día)
meal_logs (
  id            UUID PK,
  user_id       UUID FK→users,
  date          DATE,
  meal_type     ENUM(breakfast, snack1, lunch, snack2, dinner),
  description   TEXT,
  protein_g     DECIMAL(5,1),
  calories_kcal INT,
  is_keto       BOOLEAN DEFAULT false
)

-- Hábitos diarios (uno por día por usuario)
habit_logs (
  id                  UUID PK,
  user_id             UUID FK→users,
  date                DATE,
  water_ml            INT DEFAULT 0,
  meals_with_protein  INT DEFAULT 0,
  trained             BOOLEAN DEFAULT false,
  sleep_hours         DECIMAL(3,1),
  mindfulness         BOOLEAN DEFAULT false,
  score               INT,  -- 0–100 calculado
  UNIQUE(user_id, date)
)

-- Mediciones corporales (semanales)
body_measurements (
  id              UUID PK,
  user_id         UUID FK→users,
  date            DATE,
  weight_kg       DECIMAL(5,1),
  waist_cm        DECIMAL(5,1),
  energy_level    INT,      -- 1–5
  back_pain_level INT,      -- 0–10 (clave para L5-S1)
  notes           TEXT
)

-- Catálogo de ejercicios (global, no por usuario)
exercises (
  id             UUID PK,
  name           VARCHAR(100),
  category       ENUM(core, strength, swimming, mobility),
  description    TEXT,
  instructions   TEXT[],
  muscles_worked TEXT[],
  image_url      TEXT,
  safe_for_l5s1  BOOLEAN DEFAULT true
)
```

### 5.2 Relaciones clave

- `users` 1→N `workout_logs`
- `users` 1→N `swimming_sessions`
- `users` 1→N `meal_logs`
- `users` 1→1/día `habit_logs` (unique constraint user_id + date)
- `users` 1→N `body_measurements`
- `exercises` — catálogo global sin FK a users

---

## 6. API REST (NestJS modules)

### AuthModule — `/auth`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Registro de usuario |
| POST | /auth/login | Login, retorna JWT |
| POST | /auth/refresh | Renovar access token |
| POST | /auth/logout | Invalidar refresh token |

### UsersModule — `/users`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /users/me | Perfil del usuario autenticado |
| PUT | /users/me | Actualizar perfil y metas |
| GET | /users/me/stats | Stats generales del dashboard |

### WorkoutsModule — `/workouts`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /workouts | Lista `?date=` o `?week=` |
| POST | /workouts | Registrar entrenamiento |
| PUT | /workouts/:id | Actualizar / marcar completado |
| GET | /workouts/plan | Plan de la semana actual |

### SwimmingModule — `/swimming`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /swimming | Historial `?month=` |
| POST | /swimming | Registrar sesión |
| GET | /swimming/stats | Progreso metros/semana |
| GET | /swimming/plan | Plan del mes actual |

### MealsModule — `/meals`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /meals | Lista `?date=` |
| POST | /meals | Registrar comida |
| PUT | /meals/:id | Actualizar comida |
| DELETE | /meals/:id | Eliminar comida |
| GET | /meals/summary | Proteína y calorías del día |

### HabitsModule — `/habits`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /habits | Log `?date=` |
| POST | /habits | Crear log diario |
| PUT | /habits/:id | Actualizar (checklist) |
| GET | /habits/weekly | Scores de los últimos 7 días |

### BodyModule — `/body`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /body | Registrar medición |
| GET | /body | Historial |
| GET | /body/trend | Tendencia 12 semanas |

### ExercisesModule — `/exercises`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /exercises | Catálogo `?category=` |
| GET | /exercises/:id | Detalle de ejercicio |

---

## 7. Pantallas principales (7 módulos)

| Pantalla | Ruta | Descripción |
|----------|------|-------------|
| Dashboard | `/dashboard` | Peso, agua, proteína, score, gráfico 12 semanas, entrenamiento del día |
| Plan semanal | `/workout` | Vista semana con tipo y duración por día |
| Natación | `/swimming` | Registro de sesión: largos, metros, bpm, desglose por estilo |
| Nutrición | `/nutrition` | Barra proteína, 5 comidas, hidratación |
| Hábitos | `/habits` | Checklist score 0–100 (protocolo Paula) |
| Seguimiento corporal | `/body` | Gráfico peso, cintura, dolor lumbar, energía |
| Biblioteca | `/library` | Catálogo de ejercicios por categoría con badge L5-S1 |

### Navegación
- **Mobile:** Bottom navigation bar (5 tabs principales)
- **Desktop:** Sidebar izquierdo con todos los módulos

---

## 8. Programa de entrenamiento integrado (datos semilla)

El sistema incluye el plan de 12 semanas como datos en la DB:

| Mes | Fase | Objetivo | Metros/semana |
|-----|------|----------|--------------|
| 1 | Adaptación | Técnica + rutina | 1300–1500 m |
| 2 | Pérdida de grasa | Volumen natación | 1600–2000 m |
| 3 | Resistencia | Fuerza + distancia | 2000–2400 m |

### Rutina semanal base
| Día | Actividad | Duración |
|-----|-----------|----------|
| Lunes | Core (Bird Dog, Dead Bug, Glute Bridge, Side Plank) | 20–25 min |
| Martes | Natación técnica | 30–35 min |
| Miércoles | Fuerza (Hip Thrust, Face Pull, Farmer Carry) | 25 min |
| Jueves | Natación cardio | 30–40 min |
| Viernes | Natación suave | 25–30 min |
| Sábado | Natación larga | 40–45 min |
| Domingo | Descanso activo | — |

---

## 9. Sistema de score de hábitos (Paula Bedón)

| Hábito | Puntos |
|--------|--------|
| 2L de agua | 10 pts |
| 4 comidas con proteína | 15 pts |
| Entrenamiento completado | 15 pts |
| Carbos reducidos en cena | 20 pts |
| Dormir 7h | 15 pts |
| Mindfulness / pausa mental | 15 pts |
| Suplementación | 10 pts |
| **Total** | **100 pts** |

| Score | Nivel |
|-------|-------|
| 0–40 | Junior (Principiante) |
| 41–75 | Semi-Senior (Intermedio) |
| 76–100 | Senior (Avanzado) |

---

## 10. Parámetros médicos integrados

- **Frecuencia cardíaca máxima:** 175 bpm (45 años)
- **Zona 2 — quema de grasa:** 105–122 bpm
- **Proteína diaria meta:** 157 g (1.43 g/kg de peso objetivo)
- **Agua diaria:** 2000–2500 ml
- **Condición:** Espondilolistesis L5-S1 — todos los ejercicios marcados `safe_for_l5s1`
- **Estilos de natación seguros:** libre suave, espalda, patada con tabla
- **Estilos a evitar:** mariposa, braza fuerte

---

## 11. Kubernetes — objetos principales

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: healthos

# Deployments: frontend, api
# StatefulSet: postgres con PVC 5Gi
# Services: ClusterIP para los 3 pods
# Ingress: nginx con rutas healthos.local y api.healthos.local
# Secrets: DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET
# ConfigMaps: variables de entorno no sensibles
```

---

## 12. Diseño visual

- **Tema:** Dark, minimalista (inspirado en Apple Health + Whoop)
- **Colores:** Fondo `#0a0f1a`, acentos por módulo:
  - Dashboard: `#6366f1` (indigo)
  - Natación: `#38bdf8` (sky)
  - Nutrición: `#4ade80` (green)
  - Hábitos: `#fbbf24` (amber)
  - Cuerpo: `#f87171` (red)
  - Biblioteca: `#c084fc` (purple)
- **Componentes:** shadcn/ui base, charts con Recharts

---

## 13. Referencia a wireframes

Los wireframes aprobados están en `docs/designs/`:
- `01-architecture.html` — Arquitectura Kind + ArgoCD
- `02-datamodel.html` — Modelo de datos PostgreSQL
- `03-screens.html` — Wireframes de las 7 pantallas
- `04-api-structure.html` — Módulos NestJS + estructura monorepo

---

*Spec aprobado por Jaime Henao · 2026-03-19*
