# HealthOS Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the existing Next.js + localStorage scaffold into a full-stack HealthOS with NestJS API, PostgreSQL (Prisma), JWT auth, and deployment on Kind + ArgoCD.

**Architecture:** Monorepo (`apps/frontend` + `apps/api`) with npm workspaces. NestJS API (port 4000) with Prisma ORM talks to a PostgreSQL pod. Next.js frontend (port 3000) replaces localStorage/Supabase calls with HTTP calls to the API. All deployed on Kind cluster synced by ArgoCD.

**Tech Stack:** Next.js 14, NestJS, Prisma, PostgreSQL 16, JWT (access 15min + refresh 7d), Tailwind, shadcn/ui, Recharts, Docker multi-stage, Kind, nginx Ingress, ArgoCD, npm workspaces, Jest, Supertest.

**Existing code baseline:**
- `app/` — complete Next.js screens (dashboard, all 7 modules, auth)
- `lib/data.ts` — static exercise/schedule data (keep)
- `lib/store.ts` — localStorage layer (replace with API)
- `lib/supabase.ts` — Supabase client (remove)
- `middleware.ts` — Supabase auth middleware (replace with JWT)
- `k8s/` — K8s manifests for single pod (update for multi-pod)
- `types/index.ts` — TypeScript types (keep, extend)

---

## Chunk 1: Monorepo Restructure + Infrastructure

**Files created/modified:**

| File | Action |
|------|--------|
| `package.json` | MODIFY — add npm workspaces |
| `apps/frontend/` | CREATE — move existing code here |
| `apps/api/package.json` | CREATE — NestJS app |
| `docker/frontend.Dockerfile` | CREATE |
| `docker/api.Dockerfile` | CREATE |
| `docker-compose.dev.yml` | CREATE — local dev with postgres |
| `k8s/base/kind-cluster.yaml` | CREATE — Kind cluster config with port mappings |
| `k8s/base/namespace.yaml` | CREATE |
| `k8s/base/frontend-deployment.yaml` | CREATE |
| `k8s/base/api-deployment.yaml` | CREATE |
| `k8s/base/postgres-statefulset.yaml` | CREATE |
| `k8s/base/ingress.yaml` | CREATE |
| `k8s/base/secrets.yaml` | CREATE |
| `k8s/base/configmap.yaml` | CREATE |
| `k8s/argocd/application.yaml` | CREATE |

---

### Task 1.1: Monorepo root setup

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Create apps/frontend directory and move existing Next.js code**

```bash
mkdir -p apps/frontend apps/api
# Move all Next.js files to apps/frontend BEFORE writing the new root package.json
mv app apps/frontend/
mv components apps/frontend/ 2>/dev/null || true
mv lib apps/frontend/
mv public apps/frontend/
mv styles apps/frontend/ 2>/dev/null || true
mv types apps/frontend/
mv middleware.ts apps/frontend/
mv next.config.js apps/frontend/
mv next-env.d.ts apps/frontend/
mv tailwind.config.ts apps/frontend/
mv postcss.config.js apps/frontend/
mv tsconfig.json apps/frontend/
mv package.json apps/frontend/package.json
mv package-lock.json apps/frontend/ 2>/dev/null || true
```

- [ ] **Step 2: Write new root package.json with npm workspaces (AFTER moving files)**

```json
{
  "name": "healthos",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["apps/frontend", "apps/api"],
  "scripts": {
    "dev:frontend": "npm run dev --workspace=apps/frontend",
    "dev:api": "npm run start:dev --workspace=apps/api",
    "build:frontend": "npm run build --workspace=apps/frontend",
    "build:api": "npm run build --workspace=apps/api",
    "test:api": "npm run test --workspace=apps/api",
    "test:api:e2e": "npm run test:e2e --workspace=apps/api"
  }
}
```

- [ ] **Step 3: Add `output: 'standalone'` to apps/frontend/next.config.js**

Required for the multi-stage Docker build (runner stage uses `.next/standalone`).

Open `apps/frontend/next.config.js` and add `output: 'standalone'` to the exported config object:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // ... existing config options
}
module.exports = nextConfig
```

- [ ] **Step 4: Add gitignore entries**

Add to `.gitignore`:
```
apps/frontend/.next/
apps/api/dist/
apps/api/node_modules/
```

- [ ] **Step 5: Verify frontend still starts**

```bash
cd apps/frontend && npm install && npm run dev
```
Expected: Next.js starts on port 3000 (default)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: restructure to monorepo (npm workspaces)"
```

---

### Task 1.2: Scaffold NestJS API

**Files:**
- Create: `apps/api/` (scaffolded with NestJS CLI)

- [ ] **Step 1: Install NestJS CLI globally and scaffold**

```bash
npm install -g @nestjs/cli
cd apps/api
nest new . --package-manager npm --skip-git
```
When prompted for package manager: npm

- [ ] **Step 2: Install required dependencies**

```bash
cd apps/api
npm install @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt \
  @prisma/client prisma \
  bcrypt class-validator class-transformer \
  @nestjs/swagger swagger-ui-express

npm install --save-dev @types/passport-jwt @types/bcrypt \
  @nestjs/testing supertest @types/supertest
```

- [ ] **Step 3: Verify NestJS starts**

```bash
cd apps/api && npm run start:dev
```
Expected: NestJS starts on port 3000 (we'll change to 4000 next)

- [ ] **Step 4: Update apps/api/src/main.ts to use port 4000**

```typescript
// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' });
  await app.listen(process.env.PORT || 4000);
}
bootstrap();
```

- [ ] **Step 5: Run the default test to confirm Jest is configured**

```bash
cd apps/api && npm test
```
Expected: PASS — `AppController (e2e)` default test passes

- [ ] **Step 6: Commit**

```bash
git add apps/api/
git commit -m "chore: scaffold NestJS API in apps/api"
```

---

### Task 1.3: Docker configuration

**Files:**
- Create: `docker/frontend.Dockerfile`
- Create: `docker/api.Dockerfile`
- Create: `docker-compose.dev.yml`

- [ ] **Step 1: Write frontend Dockerfile**

```dockerfile
# docker/frontend.Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY apps/frontend/package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/frontend .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 2: Write api Dockerfile**

```dockerfile
# docker/api.Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY apps/api/package*.json ./
RUN npm ci
COPY apps/api .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 4000
CMD ["node", "dist/main.js"]
```

- [ ] **Step 3: Write docker-compose.dev.yml for local development**

```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: healthos
      POSTGRES_USER: healthos
      POSTGRES_PASSWORD: healthos_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

- [ ] **Step 4: Start postgres for development**

```bash
docker compose -f docker-compose.dev.yml up -d
```
Expected: postgres container running on port 5432

- [ ] **Step 5: Commit**

```bash
git add docker/ docker-compose.dev.yml
git commit -m "chore: add Docker configs and dev compose"
```

---

### Task 1.4: Kubernetes manifests

**Files:**
- Create: `k8s/base/namespace.yaml`
- Create: `k8s/base/postgres-statefulset.yaml`
- Create: `k8s/base/api-deployment.yaml`
- Create: `k8s/base/frontend-deployment.yaml`
- Create: `k8s/base/ingress.yaml`
- Create: `k8s/base/secrets.yaml`
- Create: `k8s/base/configmap.yaml`
- Create: `k8s/argocd/application.yaml`

- [ ] **Step 1: Write namespace.yaml**

```yaml
# k8s/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: healthos
```

- [ ] **Step 2: Write postgres-statefulset.yaml**

```yaml
# k8s/base/postgres-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: healthos
spec:
  selector:
    matchLabels:
      app: postgres
  serviceName: postgres
  replicas: 1
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          envFrom:
            - secretRef:
                name: healthos-secrets
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 5Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-svc
  namespace: healthos
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
```

- [ ] **Step 3: Write api-deployment.yaml**

```yaml
# k8s/base/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: healthos
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: healthos/api:latest
          imagePullPolicy: Never
          ports:
            - containerPort: 4000
          envFrom:
            - configMapRef:
                name: healthos-config
            - secretRef:
                name: healthos-secrets
          readinessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: api-svc
  namespace: healthos
spec:
  selector:
    app: api
  ports:
    - port: 4000
```

- [ ] **Step 4: Write frontend-deployment.yaml**

```yaml
# k8s/base/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: healthos
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: healthos/frontend:latest
          imagePullPolicy: Never
          ports:
            - containerPort: 3000
          env:
            - name: NEXT_PUBLIC_API_URL
              value: "http://api.healthos.local"
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-svc
  namespace: healthos
spec:
  selector:
    app: frontend
  ports:
    - port: 3000
```

- [ ] **Step 5: Write ingress.yaml**

```yaml
# k8s/base/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: healthos-ingress
  namespace: healthos
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: healthos.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-svc
                port:
                  number: 3000
    - host: api.healthos.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-svc
                port:
                  number: 4000
```

- [ ] **Step 6: Write secrets.yaml (template with dummy values — never commit real secrets)**

```yaml
# k8s/base/secrets.yaml
# WARNING: Replace values before applying. Use base64: echo -n 'value' | base64
apiVersion: v1
kind: Secret
metadata:
  name: healthos-secrets
  namespace: healthos
type: Opaque
data:
  POSTGRES_DB: aGVhbHRob3M=         # healthos
  POSTGRES_USER: aGVhbHRob3M=       # healthos
  POSTGRES_PASSWORD: Y2hhbmdlbWU=   # changeme
  JWT_SECRET: Y2hhbmdlbWVqd3Q=      # changeme-jwt
  JWT_REFRESH_SECRET: Y2hhbmdlbWVyZWZyZXNo  # changeme-refresh
  # DATABASE_URL must be base64 of the full connection string (includes password)
  # echo -n 'postgresql://healthos:changeme@postgres-svc:5432/healthos' | base64
  DATABASE_URL: cG9zdGdyZXNxbDovL2hlYWx0aG9zOmNoYW5nZW1lQHBvc3RncmVzLXN2Yzo1NDMyL2hlYWx0aG9z
```

**Note:** `DATABASE_URL` is stored in the Secret (not ConfigMap) because `$(VAR)` interpolation does not work in ConfigMap data blocks. Before applying, update this value: `echo -n 'postgresql://healthos:YOUR_ACTUAL_PASSWORD@postgres-svc:5432/healthos' | base64`

- [ ] **Step 7: Write configmap.yaml**

```yaml
# k8s/base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: healthos-config
  namespace: healthos
data:
  NODE_ENV: "production"
  PORT: "4000"
  JWT_EXPIRES_IN: "15m"
  JWT_REFRESH_EXPIRES_IN: "7d"
  FRONTEND_URL: "http://healthos.local"
```

**Note:** `DATABASE_URL` is intentionally absent from ConfigMap — it is in `healthos-secrets` because it contains the password. The api-deployment mounts both `configMapRef: healthos-config` and `secretRef: healthos-secrets`, so all vars are available to the container.

- [ ] **Step 8: Write ArgoCD Application manifest**

```yaml
# k8s/argocd/application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: healthos
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/Portfolio-jaime/core-app
    targetRevision: main
    path: k8s/base
  destination:
    server: https://kubernetes.default.svc
    namespace: healthos
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

- [ ] **Step 9: Write kind-cluster.yaml with Ingress port mappings**

```yaml
# k8s/base/kind-cluster.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - containerPort: 80
        hostPort: 80
        protocol: TCP
      - containerPort: 443
        hostPort: 443
        protocol: TCP
```

- [ ] **Step 10: Create Kind cluster and install nginx Ingress controller**

```bash
# Create kind cluster with port mappings (required for nginx ingress)
kind create cluster --name healthos --config k8s/base/kind-cluster.yaml
# Verify cluster is running
kubectl cluster-info --context kind-healthos

# Install nginx Ingress controller for Kind
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for the ingress controller to be ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```
Expected: Pod `ingress-nginx-controller-*` is Running

- [ ] **Step 11: Apply namespace and verify**

```bash
kubectl apply -f k8s/base/namespace.yaml
kubectl get namespaces | grep healthos
```
Expected: `healthos   Active`

- [ ] **Step 12: Commit**

```bash
git add k8s/
git commit -m "feat(infra): full k8s manifests + ArgoCD application"
```

---

## Chunk 2: Prisma Schema + Database Layer

**Files created/modified:**

| File | Action |
|------|--------|
| `apps/api/prisma/schema.prisma` | CREATE |
| `apps/api/src/app.module.ts` | MODIFY — add ConfigModule |
| `apps/api/src/prisma/prisma.module.ts` | CREATE |
| `apps/api/src/prisma/prisma.service.ts` | CREATE |
| `apps/api/.env` | CREATE (local dev, gitignored) |
| `apps/api/prisma/seed.ts` | CREATE |
| `apps/api/prisma/migrations/` | CREATE (auto-generated) |

---

### Task 2.1: Prisma schema

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/.env`

- [ ] **Step 1: Create .env for local development**

```bash
# apps/api/.env (never commit)
cat > apps/api/.env << 'EOF'
DATABASE_URL="postgresql://healthos:healthos_dev@localhost:5432/healthos"
JWT_SECRET="local-dev-jwt-secret-change-in-prod"
JWT_REFRESH_SECRET="local-dev-refresh-secret-change-in-prod"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=4000
FRONTEND_URL="http://localhost:3001"
EOF
```

- [ ] **Step 2: Write schema.prisma (matches spec §5.1 exactly)**

```prisma
// apps/api/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                 String    @id @default(uuid())
  name               String    @db.VarChar(100)
  email              String    @unique
  passwordHash       String
  heightCm           Int?
  birthDate          DateTime? @db.Date
  conditionNotes     String?
  proteinGoalG       Int       @default(157)
  waterGoalMl        Int       @default(2000)
  weightGoalKg       Decimal   @default(95.0) @db.Decimal(5, 1)
  programStartDate   DateTime? @db.Date
  refreshTokenHash   String?
  createdAt          DateTime  @default(now())

  workoutLogs        WorkoutLog[]
  swimmingSessions   SwimmingSession[]
  mealLogs           MealLog[]
  habitLogs          HabitLog[]
  bodyMeasurements   BodyMeasurement[]

  @@map("users")
}

enum ActivityType {
  core
  strength
  swimming_technique
  swimming_cardio
  swimming_easy
  swimming_long
  rest
}

enum MonthPhase {
  adaptation
  fat_loss
  resistance
}

enum MealType {
  breakfast
  snack1
  lunch
  snack2
  dinner
}

enum DayOfWeek {
  monday
  tuesday
  wednesday
  thursday
  friday
  saturday
  sunday
}

enum ExerciseCategory {
  core
  strength
  swimming
  mobility
}

model WorkoutLog {
  id          String       @id @default(uuid())
  userId      String
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  date        DateTime     @db.Date
  type        ActivityType
  durationMin Int
  notes       String?
  completed   Boolean      @default(false)
  createdAt   DateTime     @default(now())

  @@map("workout_logs")
}

model SwimmingSession {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date         DateTime @db.Date
  totalLaps    Int
  totalMeters  Int
  durationMin  Int
  poolLengthM  Int      @default(25)
  strokesJson  Json
  avgHrBpm     Int?
  notes        String?

  @@map("swimming_sessions")
}

model MealLog {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date         DateTime @db.Date
  mealType     MealType
  description  String
  proteinG     Decimal  @db.Decimal(5, 1)
  caloriesKcal Int?
  isKeto       Boolean  @default(false)

  @@map("meal_logs")
}

model HabitLog {
  id                 String   @id @default(uuid())
  userId             String
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date               DateTime @db.Date
  waterMl            Int      @default(0)
  mealsWithProtein   Int      @default(0)
  trained            Boolean  @default(false)
  lowCarbDinner      Boolean  @default(false)
  sleepHours         Decimal? @db.Decimal(3, 1)
  mindfulness        Boolean  @default(false)
  supplementation    Boolean  @default(false)
  score              Int      @default(0)

  @@unique([userId, date])
  @@map("habit_logs")
}

model BodyMeasurement {
  id             String   @id @default(uuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date           DateTime @db.Date
  weightKg       Decimal  @db.Decimal(5, 1)
  waistCm        Decimal? @db.Decimal(5, 1)
  energyLevel    Int
  backPainLevel  Int
  notes          String?

  @@map("body_measurements")
}

model Exercise {
  id            String           @id @default(uuid())
  name          String           @unique @db.VarChar(100)
  description   String
  instructions  String[]
  musclesWorked String[]
  imageUrl      String?
  safeForL5s1   Boolean          @default(true)

  @@map("exercises")
}

model WorkoutPlan {
  id           String       @id @default(uuid())
  weekNumber   Int
  dayOfWeek    DayOfWeek
  activityType ActivityType
  durationMin  Int
  description  String
  monthPhase   MonthPhase
  targetMeters Int?

  @@map("workout_plans")
}
```

- [ ] **Step 3: Run migration**

```bash
cd apps/api
npx prisma migrate dev --name init
```
Expected: Migration created and applied. Tables visible in postgres.

- [ ] **Step 4: Verify tables were created**

```bash
cd apps/api && npx prisma studio
```
Open http://localhost:5555 — should see all 8 tables.
Close with Ctrl+C after verifying.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/
git commit -m "feat(db): prisma schema + initial migration"
```

---

### Task 2.2: PrismaService

**Files:**
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/src/prisma/prisma.module.ts`

- [ ] **Step 1: Write failing test for PrismaService**

```typescript
// apps/api/src/prisma/prisma.service.spec.ts
import { Test } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();
    service = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd apps/api && npm test -- prisma.service.spec
```
Expected: FAIL — `Cannot find module './prisma.service'`

- [ ] **Step 3: Write PrismaService**

```typescript
// apps/api/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

- [ ] **Step 4: Write PrismaModule**

```typescript
// apps/api/src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
cd apps/api && npm test -- prisma.service.spec
```
Expected: PASS

- [ ] **Step 6: Add ConfigModule + PrismaModule to AppModule**

```typescript
// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 7: Add /health endpoint to main.ts for K8s readiness probe**

```typescript
// apps/api/src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
@Controller('health')
export class HealthController {
  @Get() check() { return { status: 'ok' }; }
}
```

Add `HealthController` to `AppModule`.

- [ ] **Step 8: Run all tests**

```bash
cd apps/api && npm test
```
Expected: All tests pass

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/
git commit -m "feat(api): PrismaService + ConfigModule + health endpoint"
```

---

### Task 2.3: Seed data

**Files:**
- Create: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Write seed with exercises + 12-week workout plan**

```typescript
// apps/api/prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXERCISES = [
  {
    name: 'Bird Dog',
    category: 'core' as const,
    description: 'Estabiliza el core profundo sin comprimir la columna.',
    instructions: [
      'Ponte en cuatro apoyos con manos bajo hombros y rodillas bajo caderas.',
      'Extiende brazo derecho + pierna izquierda.',
      'Mantén columna neutra y espera 3-5 segundos.',
      'Regresa lentamente y cambia de lado.',
    ],
    musclesWorked: ['transverso abdominal', 'glúteos', 'paravertebrales'],
    safeForL5s1: true,
  },
  {
    name: 'Dead Bug',
    category: 'core' as const,
    description: 'Activa el transverso abdominal, el músculo estabilizador de la columna.',
    instructions: [
      'Acuéstate boca arriba con brazos arriba y rodillas a 90°.',
      'Baja brazo derecho y pierna izquierda lentamente.',
      'Mantén espalda baja pegada al suelo durante todo el movimiento.',
      'Regresa y cambia de lado.',
    ],
    musclesWorked: ['transverso abdominal', 'recto abdominal'],
    safeForL5s1: true,
  },
  {
    name: 'Glute Bridge',
    category: 'core' as const,
    description: 'Fortalece glúteos reduciendo carga en la zona lumbar.',
    instructions: [
      'Acuéstate boca arriba con rodillas dobladas y pies en el suelo.',
      'Sube la cadera apretando glúteos.',
      'Mantén 2-3 segundos en la posición alta.',
      'Baja lentamente.',
    ],
    musclesWorked: ['glúteo mayor', 'isquiotibiales', 'core'],
    safeForL5s1: true,
  },
  {
    name: 'Side Plank',
    category: 'core' as const,
    description: 'Fortalece el core lateral que estabiliza L5-S1.',
    instructions: [
      'Apóyate en el codo y en el pie lateral.',
      'Mantén el cuerpo recto como una tabla.',
      'Activa el abdomen durante todo el tiempo.',
    ],
    musclesWorked: ['oblicuos', 'cuadrado lumbar', 'glúteo medio'],
    safeForL5s1: true,
  },
  {
    name: 'Hip Thrust',
    category: 'strength' as const,
    description: 'Fortalece glúteos para proteger la zona lumbar.',
    instructions: [
      'Apoya la espalda en un banco con pies en el suelo.',
      'Sube la cadera apretando glúteos en la posición alta.',
      'Mantén espalda neutra durante el movimiento.',
    ],
    musclesWorked: ['glúteo mayor', 'isquiotibiales'],
    safeForL5s1: true,
  },
  {
    name: 'Face Pull',
    category: 'strength' as const,
    description: 'Fortalece espalda alta mejorando postura.',
    instructions: [
      'Usa polea con cuerda a nivel de cara.',
      'Tira hacia la cara abriendo los codos.',
      'Aprieta las escápulas al final del movimiento.',
    ],
    musclesWorked: ['trapecio medio', 'romboides', 'deltoides posterior'],
    safeForL5s1: true,
  },
  {
    name: 'Farmer Carry',
    category: 'strength' as const,
    description: 'Desarrolla estabilidad real del core caminando con carga.',
    instructions: [
      'Toma dos mancuernas con palmas hacia adentro.',
      'Camina erecto con pecho arriba y abdomen activo.',
      'Mantén hombros hacia atrás durante el recorrido.',
    ],
    musclesWorked: ['core', 'trapecio', 'antebrazos', 'piernas'],
    safeForL5s1: true,
  },
];

// 12-week plan: weeks 1-4 adaptation, 5-8 fat_loss, 9-12 resistance
const WEEKLY_BASE = [
  { dayOfWeek: 'monday',    activityType: 'core',               durationMin: 25, description: 'Bird Dog 3×8, Dead Bug 3×10, Glute Bridge 3×12, Side Plank 3×30s', targetMeters: null },
  { dayOfWeek: 'tuesday',   activityType: 'swimming_technique', durationMin: 35, description: '4 calentamiento + 8 libre + 4 espalda + 4 tabla', targetMeters: 500 },
  { dayOfWeek: 'wednesday', activityType: 'strength',           durationMin: 25, description: 'Hip Thrust 3×12, Face Pull 3×12, Farmer Carry 3×30s', targetMeters: null },
  { dayOfWeek: 'thursday',  activityType: 'swimming_cardio',    durationMin: 35, description: '4 calentamiento + 10 libre + 6 espalda', targetMeters: 500 },
  { dayOfWeek: 'friday',    activityType: 'swimming_easy',      durationMin: 25, description: '8 libre suave + 4 espalda', targetMeters: 300 },
  { dayOfWeek: 'saturday',  activityType: 'swimming_long',      durationMin: 45, description: '4 calentamiento + 12 libre + 6 espalda + 4 tabla', targetMeters: 650 },
  { dayOfWeek: 'sunday',    activityType: 'rest',               durationMin: 20, description: 'Descanso activo: caminar 20 min o estiramientos', targetMeters: null },
];

// Meters scale: adaptation * 1, fat_loss * 1.4, resistance * 1.8
const PHASE_SCALE: Record<string, number> = {
  adaptation: 1,
  fat_loss: 1.4,
  resistance: 1.8,
};

async function main() {
  console.log('Seeding exercises...');
  for (const ex of EXERCISES) {
    await prisma.exercise.upsert({
      where: { name: ex.name },
      update: {},
      create: ex,
    });
  }

  console.log('Seeding 12-week workout plan...');
  await prisma.workoutPlan.deleteMany();

  const phases: Array<{ phase: 'adaptation' | 'fat_loss' | 'resistance'; weeks: number[] }> = [
    { phase: 'adaptation', weeks: [1, 2, 3, 4] },
    { phase: 'fat_loss',   weeks: [5, 6, 7, 8] },
    { phase: 'resistance', weeks: [9, 10, 11, 12] },
  ];

  for (const { phase, weeks } of phases) {
    for (const week of weeks) {
      for (const day of WEEKLY_BASE) {
        const scale = PHASE_SCALE[phase];
        const meters = day.targetMeters ? Math.round(day.targetMeters * scale) : null;
        await prisma.workoutPlan.create({
          data: {
            weekNumber: week,
            dayOfWeek: day.dayOfWeek,
            activityType: day.activityType as any,
            durationMin: day.durationMin,
            description: day.description,
            monthPhase: phase as any,
            targetMeters: meters,
          },
        });
      }
    }
  }

  console.log('Seed complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Add seed script to package.json**

Add to `apps/api/package.json`:
```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

- [ ] **Step 3: Run seed**

```bash
cd apps/api && npx prisma db seed
```
Expected: "Seed complete." with 7 exercises and 84 workout plan rows

- [ ] **Step 4: Verify seed in Prisma Studio**

```bash
cd apps/api && npx prisma studio
```
Check Exercise table (7 rows) and WorkoutPlan table (84 rows). Close with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/seed.ts apps/api/package.json
git commit -m "feat(db): seed exercises + 12-week workout plan"
```

---

## Chunk 3: NestJS Auth + Users Module

**Files created/modified:**

| File | Action |
|------|--------|
| `apps/api/src/auth/auth.module.ts` | CREATE |
| `apps/api/src/auth/auth.controller.ts` | CREATE |
| `apps/api/src/auth/auth.service.ts` | CREATE |
| `apps/api/src/auth/dto/register.dto.ts` | CREATE |
| `apps/api/src/auth/dto/login.dto.ts` | CREATE |
| `apps/api/src/auth/strategies/jwt.strategy.ts` | CREATE |
| `apps/api/src/auth/guards/jwt-auth.guard.ts` | CREATE |
| `apps/api/src/auth/auth.service.spec.ts` | CREATE |
| `apps/api/src/auth/auth.controller.spec.ts` | CREATE |
| `apps/api/src/users/users.module.ts` | CREATE |
| `apps/api/src/users/users.controller.ts` | CREATE |
| `apps/api/src/users/users.service.ts` | CREATE |
| `apps/api/src/users/dto/update-user.dto.ts` | CREATE |
| `apps/api/src/users/users.service.spec.ts` | CREATE |

---

### Task 3.1: Auth DTOs + Service (TDD)

- [ ] **Step 1: Write DTOs**

```typescript
// apps/api/src/auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}
```

```typescript
// apps/api/src/auth/dto/login.dto.ts
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}
```

- [ ] **Step 2: Write failing tests for AuthService**

```typescript
// apps/api/src/auth/auth.service.spec.ts
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwt = { sign: jest.fn().mockReturnValue('token') };
const mockConfig = { get: jest.fn((key: string) => key) };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('throws ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1', email: 'test@test.com' });
      await expect(service.register({ name: 'Jaime', email: 'test@test.com', password: 'pass1234' }))
        .rejects.toThrow(ConflictException);
    });

    it('returns accessToken and refreshToken on success', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 'uuid-1', email: 'new@test.com', name: 'Jaime' });
      mockPrisma.user.update.mockResolvedValue({});
      const result = await service.register({ name: 'Jaime', email: 'new@test.com', password: 'pass1234' });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'x@x.com', password: 'pass' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1', email: 'x@x.com',
        passwordHash: '$2b$10$invalid_hash',
      });
      await expect(service.login({ email: 'x@x.com', password: 'wrongpass' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd apps/api && npm test -- auth.service.spec
```
Expected: FAIL — `Cannot find module './auth.service'`

- [ ] **Step 4: Write AuthService**

```typescript
// apps/api/src/auth/auth.service.ts
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash },
    });
    return this.generateTokens(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokens(user.id, user.email);
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.refreshTokenHash) throw new UnauthorizedException();

    const valid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!valid) throw new UnauthorizedException();

    return this.generateTokens(user.id, user.email);
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN'),
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN'),
    });
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash } });
    return { accessToken, refreshToken };
  }
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd apps/api && npm test -- auth.service.spec
```
Expected: PASS — 4 tests pass

---

### Task 3.2: JWT Strategy + Guard

- [ ] **Step 1: Write JWT strategy**

```typescript
// apps/api/src/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  validate(payload: { sub: string; email: string }) {
    return { userId: payload.sub, email: payload.email };
  }
}
```

- [ ] **Step 2: Write JWT guard**

```typescript
// apps/api/src/auth/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 3: Write AuthController**

```typescript
// apps/api/src/auth/auth.controller.ts
import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() body: { userId: string; refreshToken: string }) {
    return this.authService.refresh(body.userId, body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Req() req: any) {
    return this.authService.logout(req.user.userId);
  }
}
```

- [ ] **Step 4: Write AuthModule**

```typescript
// apps/api/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 5: Add AuthModule to AppModule**

```typescript
// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 6: Run all tests**

```bash
cd apps/api && npm test
```
Expected: All tests pass

- [ ] **Step 7: Smoke test auth endpoints**

```bash
# Start API
cd apps/api && npm run start:dev &
sleep 3

# Register
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jaime","email":"jaime@test.com","password":"pass1234"}' | jq .
```
Expected: `{ "accessToken": "...", "refreshToken": "..." }`

- [ ] **Step 8: Write auth controller integration test**

```typescript
// apps/api/src/auth/auth.controller.spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  register: jest.fn().mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' }),
  login: jest.fn().mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' }),
  refresh: jest.fn().mockResolvedValue({ accessToken: 'at2', refreshToken: 'rt2' }),
  logout: jest.fn().mockResolvedValue({ message: 'Logged out' }),
};

describe('AuthController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(() => app.close());

  it('POST /auth/register → 201 with tokens', () =>
    request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Test', email: 'test@test.com', password: 'pass1234' })
      .expect(201)
      .expect(res => expect(res.body.accessToken).toBeDefined()),
  );

  it('POST /auth/login → 200 with tokens', () =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@test.com', password: 'pass1234' })
      .expect(200)
      .expect(res => expect(res.body.accessToken).toBeDefined()),
  );
});
```

- [ ] **Step 9: Run test to verify it passes**

```bash
cd apps/api && npm test -- --testPathPattern=auth.controller.spec
```
Expected: PASS, 2 tests

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/auth/ apps/api/src/app.module.ts
git commit -m "feat(api): AuthModule with JWT register/login/refresh/logout (TDD)"
```

---

### Task 3.3: UsersModule (TDD)

- [ ] **Step 1: Write failing test for UsersService**

```typescript
// apps/api/src/users/users.service.spec.ts
import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  user: { findUnique: jest.fn(), update: jest.fn() },
  habitLog: { findMany: jest.fn().mockResolvedValue([]) },
  mealLog: { aggregate: jest.fn().mockResolvedValue({ _sum: { proteinG: 0 } }) },
  swimmingSession: { aggregate: jest.fn().mockResolvedValue({ _sum: { totalMeters: 0 } }) },
  workoutPlan: { findFirst: jest.fn().mockResolvedValue(null) },
  bodyMeasurement: { findFirst: jest.fn().mockResolvedValue(null) },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  it('findMe returns user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: '1', name: 'Jaime', email: 'j@j.com' });
    const result = await service.findMe('1');
    expect(result).toHaveProperty('name', 'Jaime');
  });

  it('getStats returns null currentWeek when programStartDate is null', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: '1', programStartDate: null, waterGoalMl: 2000, proteinGoalG: 157, weightGoalKg: 95,
    });
    const stats = await service.getStats('1');
    expect(stats.currentWeek).toBeNull();
    expect(stats.currentPhase).toBeNull();
    expect(stats.todayWorkout).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/api && npm test -- users.service.spec
```
Expected: FAIL

- [ ] **Step 3: Write UsersService**

```typescript
// apps/api/src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, heightCm: true, birthDate: true,
                conditionNotes: true, proteinGoalG: true, waterGoalMl: true,
                weightGoalKg: true, programStartDate: true },
    });
  }

  async updateMe(userId: string, dto: any) {
    const { password, passwordHash, refreshTokenHash, ...allowed } = dto;
    return this.prisma.user.update({ where: { id: userId }, data: allowed });
  }

  async getStats(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Current week calculation
    let currentWeek: number | null = null;
    let currentPhase: string | null = null;
    let todayWorkout = null;
    if (user?.programStartDate) {
      const start = new Date(user.programStartDate);
      const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      currentWeek = Math.min(Math.max(Math.floor(diffDays / 7) + 1, 1), 12);
      currentPhase = currentWeek <= 4 ? 'adaptation' : currentWeek <= 8 ? 'fat_loss' : 'resistance';
      const dow = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][today.getDay()];
      todayWorkout = await this.prisma.workoutPlan.findFirst({
        where: { weekNumber: currentWeek, dayOfWeek: dow },
      });
    }

    // Today's habits
    const habitLog = await this.prisma.habitLog.findFirst({ where: { userId, date: new Date(todayStr) } });

    // Today's protein
    const proteinAgg = await this.prisma.mealLog.aggregate({
      where: { userId, date: new Date(todayStr) },
      _sum: { proteinG: true },
    });

    // Weekly meters (ISO week Mon-Sun)
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const metersAgg = await this.prisma.swimmingSession.aggregate({
      where: { userId, date: { gte: monday, lte: today } },
      _sum: { totalMeters: true },
    });

    // Latest weight
    const latestBody = await this.prisma.bodyMeasurement.findFirst({
      where: { userId }, orderBy: { date: 'desc' },
    });

    // Weekly scores (last 7 days rolling — always 7 items, null for days without a log)
    const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(today.getDate() - 6);
    const habitHistory = await this.prisma.habitLog.findMany({
      where: { userId, date: { gte: sevenDaysAgo } },
      orderBy: { date: 'asc' },
      select: { date: true, score: true },
    });
    const habitMap = new Map(habitHistory.map(h => [h.date.toISOString().split('T')[0], h.score]));
    const weeklyScores = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - (6 - i));
      return habitMap.get(d.toISOString().split('T')[0]) ?? null;
    });

    return {
      latestWeight: latestBody?.weightKg ?? null,
      weightGoalKg: user?.weightGoalKg ?? 95,
      todayWaterMl: habitLog?.waterMl ?? 0,
      waterGoalMl: user?.waterGoalMl ?? 2000,
      todayProteinG: Number(proteinAgg._sum.proteinG ?? 0),
      proteinGoalG: user?.proteinGoalG ?? 157,
      todayScore: habitLog?.score ?? 0,
      weeklyScores,
      todayWorkout: todayWorkout ? {
        type: todayWorkout.activityType,
        description: todayWorkout.description,
        durationMin: todayWorkout.durationMin,
      } : null,
      weekMeters: Number(metersAgg._sum.totalMeters ?? 0),
      currentWeek,
      currentPhase,
    };
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/api && npm test -- users.service.spec
```
Expected: PASS — 2 tests pass

- [ ] **Step 5: Write UsersController + UsersModule**

```typescript
// apps/api/src/users/users.controller.ts
import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me') getMe(@Req() req: any) { return this.usersService.findMe(req.user.userId); }
  @Put('me') updateMe(@Req() req: any, @Body() dto: any) { return this.usersService.updateMe(req.user.userId, dto); }
  @Get('me/stats') getStats(@Req() req: any) { return this.usersService.getStats(req.user.userId); }
}
```

```typescript
// apps/api/src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({ providers: [UsersService], controllers: [UsersController] })
export class UsersModule {}
```

Add `UsersModule` to `AppModule.imports`.

- [ ] **Step 6: Run all tests**

```bash
cd apps/api && npm test
```
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/users/
git commit -m "feat(api): UsersModule with /me and /me/stats (TDD)"
```

---

## Chunk 4: NestJS Domain Modules

**Files created/modified:**

| Module | Files |
|--------|-------|
| Workouts | `src/workouts/{module,controller,service,dto,spec}.ts` |
| Swimming | `src/swimming/{module,controller,service,dto,spec}.ts` |
| Meals | `src/meals/{module,controller,service,dto,spec}.ts` |
| Habits | `src/habits/{module,controller,service,dto,spec}.ts` |
| Body | `src/body/{module,controller,service,dto,spec}.ts` |
| Exercises | `src/exercises/{module,controller,service,spec}.ts` |

---

### Task 4.1: WorkoutsModule (TDD)

- [ ] **Step 1: Write failing test**

```typescript
// apps/api/src/workouts/workouts.service.spec.ts
import { Test } from '@nestjs/testing';
import { WorkoutsService } from './workouts.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  workoutLog: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  workoutPlan: { findMany: jest.fn() },
};

describe('WorkoutsService', () => {
  let service: WorkoutsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [WorkoutsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(WorkoutsService);
    jest.clearAllMocks();
  });

  it('findAll scopes by userId', async () => {
    mockPrisma.workoutLog.findMany.mockResolvedValue([]);
    await service.findAll('user-1', '2026-03-19');
    expect(mockPrisma.workoutLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) })
    );
  });

  it('getPlan returns workout plans for current week', async () => {
    mockPrisma.workoutPlan.findMany.mockResolvedValue([{ id: '1', weekNumber: 1 }]);
    const result = await service.getPlan(1);
    expect(result).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
cd apps/api && npm test -- workouts.service.spec
```

- [ ] **Step 3: Write WorkoutsService**

```typescript
// apps/api/src/workouts/workouts.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkoutsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, date?: string, week?: number) {
    // ?date= filter: exact day match
    // ?week= filter: derive date range from program week number (requires users.programStartDate)
    // If neither param provided, return all logs for user
    let dateFilter: any = {};
    if (date) {
      dateFilter = { date: new Date(date) };
    } else if (week) {
      // week is 1-based; we compute the range from the user's programStartDate
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { programStartDate: true } });
      if (user?.programStartDate) {
        const start = new Date(user.programStartDate);
        const weekStart = new Date(start); weekStart.setDate(start.getDate() + (week - 1) * 7);
        const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
        dateFilter = { date: { gte: weekStart, lte: weekEnd } };
      }
    }
    return this.prisma.workoutLog.findMany({
      where: { userId, ...dateFilter },
      orderBy: { date: 'desc' },
    });
  }

  async create(userId: string, dto: any) {
    return this.prisma.workoutLog.create({ data: { ...dto, userId, date: new Date(dto.date) } });
  }

  async update(id: string, userId: string, dto: any) {
    // userId in WHERE enforces that users can only update their own logs (spec §5.3)
    return this.prisma.workoutLog.update({ where: { id, userId }, data: dto });
  }

  async getPlan(week: number) {
    return this.prisma.workoutPlan.findMany({ where: { weekNumber: week }, orderBy: { dayOfWeek: 'asc' } });
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/api && npm test -- workouts.service.spec
```
Expected: PASS

- [ ] **Step 5: Write WorkoutsController + WorkoutsModule and add to AppModule**

```typescript
// apps/api/src/workouts/workouts.controller.ts
import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('workouts')
export class WorkoutsController {
  constructor(private workoutsService: WorkoutsService) {}

  @Get() findAll(@Req() req: any, @Query('date') date?: string, @Query('week') week?: string) {
    return this.workoutsService.findAll(req.user.userId, date, week ? Number(week) : undefined);
  }
  @Post() create(@Req() req: any, @Body() dto: any) { return this.workoutsService.create(req.user.userId, dto); }
  @Put(':id') update(@Param('id') id: string, @Req() req: any, @Body() dto: any) { return this.workoutsService.update(id, req.user.userId, dto); }
  @Get('plan') getPlan(@Query('week') week = '1') { return this.workoutsService.getPlan(Number(week)); }
}
```

```typescript
// apps/api/src/workouts/workouts.module.ts
import { Module } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { WorkoutsController } from './workouts.controller';

@Module({ providers: [WorkoutsService], controllers: [WorkoutsController] })
export class WorkoutsModule {}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/workouts/
git commit -m "feat(api): WorkoutsModule (TDD)"
```

---

### Task 4.2: SwimmingModule (TDD)

- [ ] **Step 1: Write failing test**

```typescript
// apps/api/src/swimming/swimming.service.spec.ts
import { Test } from '@nestjs/testing';
import { SwimmingService } from './swimming.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  swimmingSession: { findMany: jest.fn(), create: jest.fn(), aggregate: jest.fn() },
  workoutPlan: { findMany: jest.fn() },
};

describe('SwimmingService', () => {
  let service: SwimmingService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [SwimmingService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(SwimmingService);
    jest.clearAllMocks();
  });

  it('findAll scopes by userId', async () => {
    mockPrisma.swimmingSession.findMany.mockResolvedValue([]);
    await service.findAll('user-1');
    expect(mockPrisma.swimmingSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) })
    );
  });

  it('getStats returns weekly meters', async () => {
    mockPrisma.swimmingSession.aggregate.mockResolvedValue({ _sum: { totalMeters: 1500 } });
    const stats = await service.getStats('user-1');
    expect(stats.weekMeters).toBe(1500);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
cd apps/api && npm test -- swimming.service.spec
```

- [ ] **Step 3: Write SwimmingService**

```typescript
// apps/api/src/swimming/swimming.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SwimmingService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, month?: string) {
    const where: any = { userId };
    if (month) {
      const [year, m] = month.split('-').map(Number);
      where.date = {
        gte: new Date(year, m - 1, 1),
        lt: new Date(year, m, 1),
      };
    }
    return this.prisma.swimmingSession.findMany({ where, orderBy: { date: 'desc' } });
  }

  async create(userId: string, dto: any) {
    return this.prisma.swimmingSession.create({ data: { ...dto, userId, date: new Date(dto.date) } });
  }

  async getStats(userId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const agg = await this.prisma.swimmingSession.aggregate({
      where: { userId, date: { gte: monday } },
      _sum: { totalMeters: true },
    });
    const sessions = await this.prisma.swimmingSession.findMany({
      where: { userId, date: { gte: monday } },
    });
    return { weekMeters: Number(agg._sum.totalMeters ?? 0), sessionCount: sessions.length };
  }

  async getPlan(week: number) {
    return this.prisma.workoutPlan.findMany({
      where: {
        weekNumber: week,
        activityType: { in: ['swimming_technique', 'swimming_cardio', 'swimming_easy', 'swimming_long'] as any },
      },
      orderBy: { dayOfWeek: 'asc' },
    });
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/api && npm test -- swimming.service.spec
```

- [ ] **Step 5: Write SwimmingController + SwimmingModule and add to AppModule**

```typescript
// apps/api/src/swimming/swimming.controller.ts
import { Controller, Get, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { SwimmingService } from './swimming.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('swimming')
export class SwimmingController {
  constructor(private swimmingService: SwimmingService) {}
  @Get() findAll(@Req() req: any, @Query('month') month?: string) { return this.swimmingService.findAll(req.user.userId, month); }
  @Post() create(@Req() req: any, @Body() dto: any) { return this.swimmingService.create(req.user.userId, dto); }
  @Get('stats') getStats(@Req() req: any) { return this.swimmingService.getStats(req.user.userId); }
  @Get('plan') getPlan(@Query('week') week = '1') { return this.swimmingService.getPlan(Number(week)); }
}
```

```typescript
// apps/api/src/swimming/swimming.module.ts
import { Module } from '@nestjs/common';
import { SwimmingService } from './swimming.service';
import { SwimmingController } from './swimming.controller';
@Module({ providers: [SwimmingService], controllers: [SwimmingController] })
export class SwimmingModule {}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/swimming/
git commit -m "feat(api): SwimmingModule (TDD)"
```

---

### Task 4.3: MealsModule (TDD) — with meals_with_protein cascade

- [ ] **Step 1: Write failing test**

```typescript
// apps/api/src/meals/meals.service.spec.ts
import { Test } from '@nestjs/testing';
import { MealsService } from './meals.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  mealLog: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), aggregate: jest.fn() },
  habitLog: { upsert: jest.fn() },
};

describe('MealsService', () => {
  let service: MealsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [MealsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(MealsService);
    jest.clearAllMocks();
  });

  it('create recalculates mealsWithProtein in habit_log', async () => {
    mockPrisma.mealLog.create.mockResolvedValue({ id: '1', date: new Date(), proteinG: 35 });
    mockPrisma.mealLog.aggregate.mockResolvedValue({ _count: { id: 2 } });
    mockPrisma.habitLog.upsert.mockResolvedValue({});
    await service.create('user-1', { date: '2026-03-19', mealType: 'lunch', description: 'pollo', proteinG: 35 });
    expect(mockPrisma.habitLog.upsert).toHaveBeenCalled();
  });

  it('delete recalculates mealsWithProtein in habit_log', async () => {
    mockPrisma.mealLog.delete.mockResolvedValue({ date: new Date('2026-03-19'), proteinG: 35 });
    mockPrisma.mealLog.aggregate.mockResolvedValue({ _count: { id: 1 } });
    mockPrisma.habitLog.upsert.mockResolvedValue({});
    await service.remove('meal-1', 'user-1');
    expect(mockPrisma.habitLog.upsert).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
cd apps/api && npm test -- meals.service.spec
```

- [ ] **Step 3: Write MealsService with cascade**

```typescript
// apps/api/src/meals/meals.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MealsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, date?: string) {
    return this.prisma.mealLog.findMany({
      where: { userId, ...(date && { date: new Date(date) }) },
      orderBy: { date: 'desc' },
    });
  }

  async create(userId: string, dto: any) {
    const meal = await this.prisma.mealLog.create({
      data: { ...dto, userId, date: new Date(dto.date), proteinG: Number(dto.proteinG) },
    });
    await this.recalculateMealsWithProtein(userId, meal.date);
    return meal;
  }

  async update(id: string, userId: string, dto: any) {
    // userId in WHERE enforces users can only update their own meals (spec §5.3)
    const meal = await this.prisma.mealLog.update({ where: { id, userId }, data: dto });
    await this.recalculateMealsWithProtein(userId, meal.date);
    return meal;
  }

  async remove(id: string, userId: string) {
    // userId in WHERE enforces users can only delete their own meals (spec §5.3)
    const meal = await this.prisma.mealLog.delete({ where: { id, userId } });
    await this.recalculateMealsWithProtein(userId, meal.date);
    return meal;
  }

  async getSummary(userId: string, date: string) {
    const agg = await this.prisma.mealLog.aggregate({
      where: { userId, date: new Date(date) },
      _sum: { proteinG: true, caloriesKcal: true },
    });
    return { proteinG: Number(agg._sum.proteinG ?? 0), caloriesKcal: Number(agg._sum.caloriesKcal ?? 0) };
  }

  // Auto-compute meals_with_protein: count meals where protein_g >= 15
  private async recalculateMealsWithProtein(userId: string, date: Date) {
    const agg = await this.prisma.mealLog.aggregate({
      where: { userId, date, proteinG: { gte: 15 } },
      _count: { id: true },
    });
    const count = agg._count.id;
    await this.prisma.habitLog.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, mealsWithProtein: count, score: 0 },
      update: { mealsWithProtein: count },
    });
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/api && npm test -- meals.service.spec
```
Expected: PASS

- [ ] **Step 5: Write MealsController + MealsModule and add to AppModule**

```typescript
// apps/api/src/meals/meals.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { MealsService } from './meals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('meals')
export class MealsController {
  constructor(private mealsService: MealsService) {}
  @Get() findAll(@Req() req: any, @Query('date') date?: string) { return this.mealsService.findAll(req.user.userId, date); }
  @Post() create(@Req() req: any, @Body() dto: any) { return this.mealsService.create(req.user.userId, dto); }
  @Put(':id') update(@Param('id') id: string, @Req() req: any, @Body() dto: any) { return this.mealsService.update(id, req.user.userId, dto); }
  @Delete(':id') remove(@Param('id') id: string, @Req() req: any) { return this.mealsService.remove(id, req.user.userId); }
  @Get('summary') getSummary(@Req() req: any, @Query('date') date: string) { return this.mealsService.getSummary(req.user.userId, date); }
}
```

```typescript
// apps/api/src/meals/meals.module.ts
import { Module } from '@nestjs/common';
import { MealsService } from './meals.service';
import { MealsController } from './meals.controller';
@Module({ providers: [MealsService], controllers: [MealsController] })
export class MealsModule {}
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/meals/
git commit -m "feat(api): MealsModule with meals_with_protein cascade (TDD)"
```

---

### Task 4.4: HabitsModule with score formula (TDD)

- [ ] **Step 1: Write failing tests — score formula is core logic**

```typescript
// apps/api/src/habits/habits.service.spec.ts
import { Test } from '@nestjs/testing';
import { HabitsService } from './habits.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  user: { findUnique: jest.fn().mockResolvedValue({ waterGoalMl: 2000 }) },
  habitLog: { findFirst: jest.fn(), upsert: jest.fn(), update: jest.fn(), findMany: jest.fn() },
};

describe('HabitsService', () => {
  let service: HabitsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [HabitsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(HabitsService);
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ waterGoalMl: 2000 });
  });

  describe('calculateScore', () => {
    it('returns 100 when all habits complete', () => {
      const score = service.calculateScore({
        waterMl: 2000, waterGoalMl: 2000,
        mealsWithProtein: 4, trained: true,
        lowCarbDinner: true, sleepHours: 7,
        mindfulness: true, supplementation: true,
      });
      expect(score).toBe(100);
    });

    it('returns 0 when nothing is done', () => {
      const score = service.calculateScore({
        waterMl: 0, waterGoalMl: 2000,
        mealsWithProtein: 0, trained: false,
        lowCarbDinner: false, sleepHours: 6,
        mindfulness: false, supplementation: false,
      });
      expect(score).toBe(0);
    });

    it('returns 25 for water + trained only', () => {
      const score = service.calculateScore({
        waterMl: 2000, waterGoalMl: 2000,
        mealsWithProtein: 0, trained: true,
        lowCarbDinner: false, sleepHours: 6,
        mindfulness: false, supplementation: false,
      });
      expect(score).toBe(25); // 10 (water) + 15 (trained)
    });
  });

  it('upsert calls prisma with calculated score', async () => {
    mockPrisma.habitLog.upsert.mockResolvedValue({ id: '1', score: 25 });
    await service.upsert('user-1', {
      date: '2026-03-19', waterMl: 2000,
      mealsWithProtein: 0, trained: true,
      lowCarbDinner: false, sleepHours: 6,
      mindfulness: false, supplementation: false,
    });
    expect(mockPrisma.habitLog.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ score: 25 }) })
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
cd apps/api && npm test -- habits.service.spec
```

- [ ] **Step 3: Write HabitsService with score formula**

```typescript
// apps/api/src/habits/habits.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HabitsService {
  constructor(private prisma: PrismaService) {}

  calculateScore(data: {
    waterMl: number; waterGoalMl: number;
    mealsWithProtein: number; trained: boolean;
    lowCarbDinner: boolean; sleepHours: number | null;
    mindfulness: boolean; supplementation: boolean;
  }): number {
    return (
      (data.waterMl >= data.waterGoalMl ? 10 : 0) +
      (data.mealsWithProtein >= 4 ? 15 : 0) +
      (data.trained ? 15 : 0) +
      (data.lowCarbDinner ? 20 : 0) +
      ((data.sleepHours ?? 0) >= 7 ? 15 : 0) +
      (data.mindfulness ? 15 : 0) +
      (data.supplementation ? 10 : 0)
    );
  }

  async findByDate(userId: string, date: string) {
    return this.prisma.habitLog.findFirst({ where: { userId, date: new Date(date) } });
  }

  async upsert(userId: string, dto: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    // Strip mealsWithProtein — it is auto-computed by MealsService, never accepted from client
    const { mealsWithProtein: _excluded, date: rawDate, ...habitFields } = dto;
    const date = new Date(rawDate);
    const score = this.calculateScore({ ...habitFields, waterGoalMl: user?.waterGoalMl ?? 2000 });
    return this.prisma.habitLog.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, ...habitFields, score },
      update: { ...habitFields, score },
    });
  }

  async update(id: string, userId: string, dto: any) {
    const current = await this.prisma.habitLog.findFirst({ where: { id, userId } });
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    // Strip mealsWithProtein — auto-computed only
    const { mealsWithProtein: _excluded, ...habitFields } = dto;
    const merged = { ...current, ...habitFields };
    const score = this.calculateScore({ ...merged, waterGoalMl: user?.waterGoalMl ?? 2000 });
    return this.prisma.habitLog.update({ where: { id, userId }, data: { ...habitFields, score } });
  }

  async getWeekly(userId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(today.getDate() - 6);
    return this.prisma.habitLog.findMany({
      where: { userId, date: { gte: sevenDaysAgo } },
      orderBy: { date: 'asc' },
      select: { date: true, score: true },
    });
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd apps/api && npm test -- habits.service.spec
```
Expected: PASS — all 4 tests pass

- [ ] **Step 5: Write HabitsController + HabitsModule and add to AppModule**

```typescript
// apps/api/src/habits/habits.controller.ts
import { Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { HabitsService } from './habits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('habits')
export class HabitsController {
  constructor(private habitsService: HabitsService) {}
  @Get() findByDate(@Req() req: any, @Query('date') date: string) { return this.habitsService.findByDate(req.user.userId, date); }
  @Post() upsert(@Req() req: any, @Body() dto: any) { return this.habitsService.upsert(req.user.userId, dto); }
  @Put(':id') update(@Param('id') id: string, @Req() req: any, @Body() dto: any) { return this.habitsService.update(id, req.user.userId, dto); }
  @Get('weekly') getWeekly(@Req() req: any) { return this.habitsService.getWeekly(req.user.userId); }
}
```

```typescript
// apps/api/src/habits/habits.module.ts
import { Module } from '@nestjs/common';
import { HabitsService } from './habits.service';
import { HabitsController } from './habits.controller';
@Module({ providers: [HabitsService], controllers: [HabitsController] })
export class HabitsModule {}
```

- [ ] **Step 6: Run all tests**

```bash
cd apps/api && npm test
```
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/habits/
git commit -m "feat(api): HabitsModule with server-side score formula (TDD)"
```

---

### Task 4.5: BodyModule + ExercisesModule

- [ ] **Step 1: Write BodyService**

```typescript
// apps/api/src/body/body.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BodyService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: any) {
    return this.prisma.bodyMeasurement.create({
      data: { ...dto, userId, date: new Date(dto.date), weightKg: Number(dto.weightKg) },
    });
  }

  async findAll(userId: string) {
    return this.prisma.bodyMeasurement.findMany({ where: { userId }, orderBy: { date: 'desc' } });
  }

  async getTrend(userId: string) {
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
    return this.prisma.bodyMeasurement.findMany({
      where: { userId, date: { gte: twelveWeeksAgo } },
      orderBy: { date: 'asc' },
      select: { date: true, weightKg: true, waistCm: true, backPainLevel: true, energyLevel: true },
    });
  }
}
```

- [ ] **Step 2: Write ExercisesService**

```typescript
// apps/api/src/exercises/exercises.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExercisesService {
  constructor(private prisma: PrismaService) {}

  async findAll(category?: string) {
    return this.prisma.exercise.findMany({
      where: category ? { category: category as any } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.exercise.findUnique({ where: { id } });
  }
}
```

- [ ] **Step 3: Wire up BodyController, BodyModule, ExercisesController, ExercisesModule — add them all to AppModule**

```typescript
// apps/api/src/body/body.controller.ts
import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { BodyService } from './body.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('body')
export class BodyController {
  constructor(private bodyService: BodyService) {}
  @Post() create(@Req() req: any, @Body() dto: any) { return this.bodyService.create(req.user.userId, dto); }
  @Get() findAll(@Req() req: any) { return this.bodyService.findAll(req.user.userId); }
  @Get('trend') getTrend(@Req() req: any) { return this.bodyService.getTrend(req.user.userId); }
}
```

```typescript
// apps/api/src/exercises/exercises.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ExercisesService } from './exercises.service';

@Controller('exercises')
export class ExercisesController {
  constructor(private exercisesService: ExercisesService) {}
  @Get() findAll(@Query('category') category?: string) { return this.exercisesService.findAll(category); }
  @Get(':id') findOne(@Param('id') id: string) { return this.exercisesService.findOne(id); }
}
```

Create `body.module.ts` and `exercises.module.ts` — both follow the same `@Module({ providers, controllers })` pattern. Add both to `AppModule.imports`.

- [ ] **Step 4: Run all tests**

```bash
cd apps/api && npm test
```
Expected: All tests pass

- [ ] **Step 5: Smoke test the whole API**

```bash
cd apps/api && npm run start:dev &
sleep 3

# Login
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jaime@test.com","password":"pass1234"}' | jq -r '.accessToken')

# Stats
curl -s http://localhost:4000/users/me/stats \
  -H "Authorization: Bearer $TOKEN" | jq .

# Exercises
curl -s http://localhost:4000/exercises | jq '. | length'
```
Expected: Stats JSON, 7 exercises

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/body/ apps/api/src/exercises/ apps/api/src/app.module.ts
git commit -m "feat(api): BodyModule + ExercisesModule — all 8 modules complete"
```

---

## Chunk 5: Frontend Adaptation + Deployment

**Files created/modified:**

| File | Action |
|------|--------|
| `apps/frontend/lib/api-client.ts` | CREATE — typed API client |
| `apps/frontend/lib/auth.ts` | CREATE — JWT token management |
| `apps/frontend/middleware.ts` | MODIFY — replace Supabase with JWT check |
| `apps/frontend/lib/supabase.ts` | DELETE — replaced by api-client |
| `apps/frontend/lib/store.ts` | DELETE — replaced by API calls |
| `apps/frontend/app/(auth)/login/page.tsx` | MODIFY — call POST /auth/login |
| `apps/frontend/app/(auth)/register/page.tsx` | MODIFY — call POST /auth/register |
| `apps/frontend/app/(app)/dashboard/page.tsx` | MODIFY — replace store.ts with API |
| `apps/frontend/app/(app)/workout/page.tsx` | MODIFY — API workouts plan |
| `apps/frontend/app/(app)/natacion/page.tsx` | MODIFY — API swimming |
| `apps/frontend/app/(app)/habitos/page.tsx` | MODIFY — API habits |
| `apps/frontend/app/(app)/nutricion/page.tsx` | MODIFY — API meals |
| `apps/frontend/app/(app)/progreso/page.tsx` | MODIFY — API body |
| `apps/frontend/app/(app)/ejercicios/page.tsx` | MODIFY — API exercises |
| `apps/frontend/components/navigation.tsx` | MODIFY — mobile 5-tab nav + desktop sidebar |
| `apps/frontend/next.config.js` | MODIFY — add NEXT_PUBLIC_API_URL |

---

### Task 5.1: API client + JWT auth layer

- [ ] **Step 1: Write JWT token manager**

```typescript
// apps/frontend/lib/auth.ts
const ACCESS_KEY = 'healthos_access';
const REFRESH_KEY = 'healthos_refresh';

export const tokenStore = {
  setTokens(access: string, refresh: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    // Also set a cookie for middleware to read (same-site, no Secure needed for local dev)
    document.cookie = `${ACCESS_KEY}=${access}; path=/; SameSite=Strict`;
  },
  getAccess(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_KEY);
  },
  getRefresh(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  clear() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    // Clear cookie too — middleware reads it
    document.cookie = `${ACCESS_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  },
  isAuthenticated(): boolean {
    return !!this.getAccess();
  },
};
```

- [ ] **Step 2: Write typed API client**

```typescript
// apps/frontend/lib/api-client.ts
import { tokenStore } from './auth';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.getAccess();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    // Attempt token refresh before redirecting to login
    const refreshToken = tokenStore.getRefresh();
    if (refreshToken) {
      const refreshRes = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshRes.ok) {
        const tokens = await refreshRes.json();
        tokenStore.setTokens(tokens.accessToken, tokens.refreshToken);
        // Retry original request with new access token
        return request<T>(path, options);
      }
    }
    // Refresh failed or no refresh token — clear state and redirect
    tokenStore.clear();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  auth: {
    register: (data: { name: string; email: string; password: string }) =>
      request<{ accessToken: string; refreshToken: string }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request<{ accessToken: string; refreshToken: string }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    refresh: (refreshToken: string) =>
      request<{ accessToken: string; refreshToken: string }>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
    logout: () => request('/auth/logout', { method: 'POST' }),
  },
  users: {
    me: () => request<any>('/users/me'),
    updateMe: (data: any) => request<any>('/users/me', { method: 'PUT', body: JSON.stringify(data) }),
    stats: () => request<any>('/users/me/stats'),
  },
  workouts: {
    list: (date?: string) => request<any[]>(`/workouts${date ? `?date=${date}` : ''}`),
    create: (data: any) => request<any>('/workouts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/workouts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    plan: (week: number) => request<any[]>(`/workouts/plan?week=${week}`),
  },
  swimming: {
    list: (month?: string) => request<any[]>(`/swimming${month ? `?month=${month}` : ''}`),
    create: (data: any) => request<any>('/swimming', { method: 'POST', body: JSON.stringify(data) }),
    stats: () => request<any>('/swimming/stats'),
    plan: (week: number) => request<any[]>(`/swimming/plan?week=${week}`),
  },
  meals: {
    list: (date: string) => request<any[]>(`/meals?date=${date}`),
    create: (data: any) => request<any>('/meals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/meals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) => request<void>(`/meals/${id}`, { method: 'DELETE' }),
    summary: (date: string) => request<any>(`/meals/summary?date=${date}`),
  },
  habits: {
    get: (date: string) => request<any | null>(`/habits?date=${date}`),
    upsert: (data: any) => request<any>('/habits', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/habits/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    weekly: () => request<any[]>('/habits/weekly'),
  },
  body: {
    list: () => request<any[]>('/body'),
    create: (data: any) => request<any>('/body', { method: 'POST', body: JSON.stringify(data) }),
    trend: () => request<any[]>('/body/trend'),
  },
  exercises: {
    list: (category?: string) => request<any[]>(`/exercises${category ? `?category=${category}` : ''}`),
    get: (id: string) => request<any>(`/exercises/${id}`),
  },
};
```

- [ ] **Step 3: Update middleware to use JWT instead of Supabase**

```typescript
// apps/frontend/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some(p => pathname === p)) return NextResponse.next();

  const token = request.cookies.get('healthos_access')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
```

- [ ] **Step 4: Update login page to use API**

```typescript
// apps/frontend/app/(auth)/login/page.tsx — key changes:
// Replace Supabase signIn with:
// const { accessToken, refreshToken } = await api.auth.login({ email, password });
// tokenStore.setTokens(accessToken, refreshToken);
// document.cookie = `healthos_access=${accessToken}; path=/`;
// router.push('/dashboard');
```

*(Full replacement of the Supabase auth.signInWithPassword call — keep all existing UI, change only the auth handler)*

- [ ] **Step 5: Update register page similarly**

*(Same pattern as login but calling `api.auth.register`)*

- [ ] **Step 6: Add NEXT_PUBLIC_API_URL to next.config.js**

```javascript
// apps/frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  },
  output: 'standalone',
};
module.exports = nextConfig;
```

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/lib/api-client.ts apps/frontend/lib/auth.ts apps/frontend/middleware.ts \
  apps/frontend/app/(auth)/ apps/frontend/next.config.js
git commit -m "feat(frontend): JWT auth layer + typed API client"
```

---

### Task 5.2: Dashboard + Swimming screens → API

- [ ] **Step 1: Update Dashboard to use API stats**

Key replacement in `apps/frontend/app/(app)/dashboard/page.tsx`:

```typescript
// Replace: import { useStore } from '@/lib/store'
// Add: import { api } from '@/lib/api-client'

// In a useEffect:
useEffect(() => {
  api.users.stats().then(setStats).catch(console.error);
  api.habits.get(todayStr).then(setHabitLog).catch(console.error);
}, []);
```

Keep all existing chart components, stat cards, and UI — only replace the data source.

- [ ] **Step 2: Update Swimming screen to use API**

```typescript
// apps/frontend/app/(app)/natacion/page.tsx
// Replace: saveSwimmingSession / getSwimmingSessions from store
// With: api.swimming.create / api.swimming.list
// Add: api.swimming.stats for weekly meters
```

- [ ] **Step 3: Test dashboard renders with API data**

```bash
# With both services running:
cd apps/api && npm run start:dev &
cd apps/frontend && npm run dev &
# Navigate to http://localhost:3001/dashboard
# Should load stats from API
```
Expected: Dashboard loads, no console errors, stats visible

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/app/(app)/dashboard/ apps/frontend/app/(app)/natacion/
git commit -m "feat(frontend): dashboard + swimming connected to API"
```

---

### Task 5.3: Remaining screens → API

- [ ] **Step 1: Update Workout/Plan screen**

```typescript
// apps/frontend/app/(app)/workout/page.tsx
// Replace static WEEKLY_SCHEDULE from lib/data.ts with:
// - api.users.stats() to get currentWeek + todayWorkout
// - api.workouts.plan(currentWeek) to get the full week plan
// - api.workouts.list(todayStr) for logged workouts
// - api.workouts.update(id, { completed: true }) for marking complete
// Keep existing weekly plan UI and day-card components
```

- [ ] **Step 2: Update Hábitos screen**

```typescript
// apps/frontend/app/(app)/habitos/page.tsx
// Replace localStorage toggles with:
// - api.habits.get(todayStr) on mount
// - api.habits.upsert(data) on any toggle change
// Keep existing checklist UI
```

- [ ] **Step 3: Update Nutrición screen**

```typescript
// apps/frontend/app/(app)/nutricion/page.tsx
// Replace static WEEK_MENUS data display with:
// - api.meals.list(todayStr) to show logged meals
// - api.meals.create(data) to log a meal
// - api.meals.summary(todayStr) for protein bar
// Keep weekly menu display using static lib/data.ts WEEK_MENUS (informational only)
```

- [ ] **Step 4: Update Progreso screen**

```typescript
// apps/frontend/app/(app)/progreso/page.tsx
// Replace getLatestWeight/getWeeklyRecords from store with:
// - api.body.trend() for chart data
// - api.body.create(data) for weekly log form
```

- [ ] **Step 5: Update Ejercicios screen**

```typescript
// apps/frontend/app/(app)/ejercicios/page.tsx
// Replace static EXERCISES from lib/data.ts with:
// - api.exercises.list(category) — now loaded from DB
// - api.exercises.get(id) for detail view
// Keep all existing UI components
```

- [ ] **Step 6: Verify navigation layout matches spec §7**

Check `apps/frontend/components/navigation.tsx` (or the layout file containing bottom nav):
- Mobile bottom nav: exactly 5 tabs = Dashboard, Entrenamiento, Natación, Hábitos, Progreso
- Nutrición and Biblioteca accessible from "Más" within Entrenamiento tab (hamburger sub-menu)
- Desktop: sidebar showing all 7 modules

If existing nav doesn't already match, update the component to enforce the 5-tab / 7-item split.

- [ ] **Step 7: Delete legacy files**

```bash
rm apps/frontend/lib/supabase.ts
rm apps/frontend/lib/store.ts
# Verify no remaining imports
grep -r "from.*supabase" apps/frontend/app/ apps/frontend/lib/ apps/frontend/middleware.ts 2>/dev/null
grep -r "from.*store" apps/frontend/app/ apps/frontend/lib/ 2>/dev/null
```
Expected: no results (all imports removed)

- [ ] **Step 8: Run full integration test**

```bash
# Both services running (api on 4000, frontend on 3000)
# 1. Register a new user
# 2. Login
# 3. Visit all 7 screens: dashboard, workout, natacion, habitos, nutricion, progreso, ejercicios
# 4. Confirm data persists after page refresh (API, not localStorage)
# 5. Check mobile nav shows exactly 5 tabs
```
Expected: All 7 screens load, data persists between refreshes, no console errors about missing supabase/store

- [ ] **Step 9: Commit**

```bash
git add apps/frontend/app/(app)/ apps/frontend/components/
git rm apps/frontend/lib/supabase.ts apps/frontend/lib/store.ts
git commit -m "feat(frontend): all screens connected to NestJS API, legacy localStorage removed"
```

---

### Task 5.4: Kind cluster deployment

- [ ] **Step 1: Build Docker images for Kind**

```bash
# Build images
docker build -f docker/frontend.Dockerfile -t healthos/frontend:latest .
docker build -f docker/api.Dockerfile -t healthos/api:latest .

# Load into Kind cluster
kind load docker-image healthos/frontend:latest --name healthos
kind load docker-image healthos/api:latest --name healthos
```

- [ ] **Step 2: Apply K8s manifests**

```bash
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/secrets.yaml      # edit values first!
kubectl apply -f k8s/base/configmap.yaml
kubectl apply -f k8s/base/postgres-statefulset.yaml
kubectl apply -f k8s/base/api-deployment.yaml
kubectl apply -f k8s/base/frontend-deployment.yaml
kubectl apply -f k8s/base/ingress.yaml
```

- [ ] **Step 3: Wait for pods to be Ready**

```bash
kubectl get pods -n healthos -w
```
Expected: All pods `Running` and `1/1 READY`

- [ ] **Step 4: Run Prisma migration in the API pod**

```bash
API_POD=$(kubectl get pods -n healthos -l app=api -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n healthos $API_POD -- npx prisma migrate deploy
kubectl exec -n healthos $API_POD -- npx prisma db seed
```

- [ ] **Step 5: Add hosts entries and verify**

```bash
echo "127.0.0.1 healthos.local api.healthos.local" | sudo tee -a /etc/hosts
curl http://api.healthos.local/health
```
Expected: `{"status":"ok"}`

- [ ] **Step 6: Install ArgoCD and apply Application**

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl apply -f k8s/argocd/application.yaml
```

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat(infra): Kind cluster deployed + ArgoCD application configured"
git push origin main
```
Expected: ArgoCD auto-syncs `k8s/base` from GitHub to Kind cluster.

---

## Summary

| Chunk | What it delivers |
|-------|-----------------|
| 1 | Monorepo structure, Docker images, K8s manifests, ArgoCD |
| 2 | Prisma schema (9 tables), migrations, seed data (exercises + 12-week plan) |
| 3 | NestJS AuthModule + UsersModule with JWT (TDD) |
| 4 | NestJS domain modules: Workouts, Swimming, Meals, Habits (score formula), Body, Exercises (TDD) |
| 5 | Frontend adaptation: replace localStorage/Supabase → API client, Kind deployment |

**At the end of Chunk 5, HealthOS runs fully on Kind — frontend, API, and PostgreSQL as separate pods synced by ArgoCD.** 🚀
