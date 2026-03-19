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
  id                UUID PK,
  name              VARCHAR(100),
  email             VARCHAR UNIQUE,
  password_hash     TEXT,
  height_cm         INT,
  birth_date        DATE,
  condition_notes   TEXT,          -- "Espondilolistesis L5-S1"
  protein_goal_g    INT DEFAULT 157,
  water_goal_ml     INT DEFAULT 2000,
  weight_goal_kg    DECIMAL(5,1) DEFAULT 95.0,  -- meta fija del programa
  program_start_date DATE,         -- fecha de inicio del ciclo de 12 semanas, para calcular currentWeek
  refresh_token_hash TEXT,         -- hash del refresh token activo; NULL cuando logged out
  created_at        TIMESTAMP
)

-- Entrenamientos diarios
workout_logs (
  id           UUID PK,
  user_id      UUID FK→users,
  date         DATE,
  type         ENUM(core, strength, swimming_technique, swimming_cardio, swimming_easy, swimming_long, rest),
  -- mismo ENUM que workout_plans.activity_type para permitir cross-reference
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
  water_ml            INT DEFAULT 0,         -- +10 pts si >= water_goal_ml
  meals_with_protein  INT DEFAULT 0,         -- +15 pts si >= 4. AUTO-COMPUTED: el API recalcula este campo en cada CREATE/UPDATE/DELETE de meal_logs del mismo día. Una comida cuenta como "con proteína" si meal_logs.protein_g >= 15. El cliente nunca lo envía directamente.
  trained             BOOLEAN DEFAULT false,  -- +15 pts
  low_carb_dinner     BOOLEAN DEFAULT false,  -- +20 pts (cenas sin carbos)
  sleep_hours         DECIMAL(3,1),           -- +15 pts si >= 7
  mindfulness         BOOLEAN DEFAULT false,  -- +15 pts
  supplementation     BOOLEAN DEFAULT false,  -- +10 pts
  score               INT,  -- 0–100 calculado server-side (ver fórmula en §6 HabitsModule)
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

-- Plan de 12 semanas (datos semilla, global — mismo plan para todos los usuarios)
-- Soporta GET /workouts/plan y GET /swimming/plan
workout_plans (
  id            UUID PK,
  week_number   INT,              -- 1–12
  day_of_week   ENUM(monday, tuesday, wednesday, thursday, friday, saturday, sunday),
  activity_type ENUM(core, strength, swimming_technique, swimming_cardio, swimming_easy, swimming_long, rest),
  duration_min  INT,
  description   TEXT,             -- descripción de la sesión (ej. "4 largos calentamiento + 8 libre")
  month_phase   ENUM(adaptation, fat_loss, resistance),  -- mes 1/2/3
  target_meters INT               -- solo para sesiones de natación, NULL para core/fuerza
)
```

### 5.2 Relaciones clave

- `users` 1→N `workout_logs`
- `users` 1→N `swimming_sessions`
- `users` 1→N `meal_logs`
- `users` 1→1/día `habit_logs` (unique constraint user_id + date)
- `users` 1→N `body_measurements`
- `exercises` — catálogo global sin FK a users
- `workout_plans` — catálogo global de 12 semanas sin FK a users (datos semilla)

### 5.3 Regla de autorización

Todos los endpoints (excepto `GET /exercises` y `GET /exercises/:id`) requieren JWT válido. Cada query incluye implícitamente `WHERE user_id = req.user.id` — un usuario nunca puede leer ni escribir datos de otro usuario. `workout_plans` y `exercises` son catálogos globales de solo lectura.

---

## 6. API REST (NestJS modules)

### AuthModule — `/auth`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Registro de usuario |
| POST | /auth/login | Login, retorna `{ accessToken, refreshToken }` |
| POST | /auth/refresh | Renovar access token con refreshToken válido |
| POST | /auth/logout | Invalidar refresh token |

**Almacenamiento de refresh tokens:** columna `refresh_token_hash TEXT` en la tabla `users`. En logout se pone a NULL. En cada `/auth/refresh` se verifica hash y se rota (se genera nuevo y se actualiza la columna).

### UsersModule — `/users`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /users/me | Perfil del usuario autenticado |
| PUT | /users/me | Actualizar perfil y metas |
| GET | /users/me/stats | Datos agregados para el Dashboard |

**`GET /users/me/stats` response shape:**
```json
{
  "latestWeight": 108.2,           // body_measurements más reciente (o null)
  "weightGoalKg": 95.0,            // users.weight_goal_kg (hardcoded en perfil)
  "todayWaterMl": 1400,            // habit_logs de hoy (o 0)
  "waterGoalMl": 2000,
  "todayProteinG": 98.5,           // suma meal_logs.protein_g de hoy
  "proteinGoalG": 157,
  "todayScore": 68,                // habit_logs.score de hoy (o 0)
  "weeklyScores": [55, 68, 72, 60, 80, 45, 68],  // últimos 7 días, null para días sin log
  "todayWorkout": {                // workout_plans para hoy según program_start_date + currentWeek
    "type": "swimming_cardio",
    "description": "4 calentamiento + 10 libre + 6 espalda",
    "durationMin": 35
  },
  "weekMeters": 1350,              // suma swimming_sessions.total_meters de la semana ISO
  "currentWeek": 3,                // FLOOR((today - program_start_date) / 7) + 1, capped a 12. NULL si program_start_date es NULL.
  "currentPhase": "adaptation"     // semanas 1–4: adaptation, 5–8: fat_loss, 9–12: resistance. NULL si currentWeek es NULL.
}
```
**Estado sin program_start_date (usuario recién registrado):** `currentWeek`, `currentPhase` y `todayWorkout` se retornan como `null`. El frontend muestra un CTA para que el usuario establezca su fecha de inicio del programa en `/users/me`.

**Contratos de query params (todos los módulos):**
- `?date=` → ISO 8601 `YYYY-MM-DD`
- `?week=` → número de semana del programa, 1–12
- `?month=` → `YYYY-MM`

**Comportamiento GET /habits?date= cuando no existe log:**
Retorna `null` (HTTP 200). El frontend crea el log en el primer checklist marcado.

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
| POST | /meals | Registrar comida. Después de insertar, recalcular `habit_logs.meals_with_protein` del día. |
| PUT | /meals/:id | Actualizar comida. Después de actualizar, recalcular `habit_logs.meals_with_protein` del día. |
| DELETE | /meals/:id | Eliminar comida. Después de eliminar, recalcular `habit_logs.meals_with_protein` del día (evita datos inconsistentes). |
| GET | /meals/summary | Proteína y calorías del día |

### HabitsModule — `/habits`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /habits | Log `?date=` |
| POST | /habits | Upsert del log del día (crea si no existe, actualiza si ya existe — usa UNIQUE user_id+date). Nunca retorna 409. El servidor calcula y persiste `score` automáticamente en cada POST/PUT. |
| PUT | /habits/:id | Actualizar campo individual (checklist). El servidor recalcula `score` y lo persiste antes de responder. |
| GET | /habits/weekly | Scores de los últimos 7 días |

**Fórmula de score (server-side):**
```
score = (water_ml >= user.water_goal_ml ? 10 : 0)
      + (meals_with_protein >= 4 ? 15 : 0)
      + (trained ? 15 : 0)
      + (low_carb_dinner ? 20 : 0)
      + (sleep_hours >= 7 ? 15 : 0)
      + (mindfulness ? 15 : 0)
      + (supplementation ? 10 : 0)
```
El cliente nunca envía `score` — siempre lo calcula el API.

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
- **Mobile:** Bottom navigation bar con 5 tabs: Dashboard (`/dashboard`) · Entrenamiento (`/workout`) · Natación (`/swimming`) · Hábitos (`/habits`) · Progreso (`/body`). Nutrición (`/nutrition`) y Biblioteca (`/library`) accesibles desde el menú dentro de Entrenamiento (hamburger o tab "Más").
- **Desktop:** Sidebar izquierdo con todos los 7 módulos visibles.

`weeklyScores` en `/users/me/stats` = últimos 7 días calendario rolling desde hoy hacia atrás (no semana ISO).

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
