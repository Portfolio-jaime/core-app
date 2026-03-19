# HealthOS – Sistema Personal de Bienestar

> Programa de 12 semanas para Jaime Henao: natación, core, nutrición y seguimiento – Espondilolistesis L5-S1

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS (dark mode) |
| Gráficos | Recharts |
| Persistencia | localStorage (sin backend) |
| Fuentes | Google Fonts – Inter |

---

## Requisitos previos

- Node.js ≥ 18  
- npm ≥ 9

```bash
node -v   # debe ser ≥ 18
npm -v    # debe ser ≥ 9
```

---

## Instalación y arranque

```bash
# 1. Clonar / entrar al directorio
cd /Users/jaime.henao/arheanja/core-app

# 2. Instalar dependencias
npm install

# 3. Arrancar en modo desarrollo
npm run dev
```

La app queda disponible en **http://localhost:3000**

---

## Scripts disponibles

| Comando | Descripción |
|---------|------------|
| `npm run dev` | Servidor de desarrollo con hot-reload |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | ESLint sobre todo el proyecto |

---

## Estructura de archivos

```
core-app/
├── app/                        # Páginas (App Router)
│   ├── page.tsx                # Dashboard principal
│   ├── entrenamiento/page.tsx  # Plan semanal de entrenamiento
│   ├── natacion/page.tsx       # Módulo de natación
│   ├── nutricion/page.tsx      # Plan nutricional
│   ├── habitos/page.tsx        # Tracker de hábitos (checklist)
│   ├── progreso/page.tsx       # Seguimiento corporal y gráficos
│   ├── ejercicios/page.tsx     # Biblioteca de ejercicios
│   ├── layout.tsx              # Layout global + navegación
│   └── globals.css             # Variables CSS + Tailwind base
│
├── components/
│   ├── navigation.tsx          # Sidebar (desktop) + bottom bar (móvil)
│   └── ui/
│       ├── card.tsx            # Card, StatCard, ProgressBar, Badge, SectionHeader
│       └── button.tsx          # Button (múltiples variantes)
│
├── lib/
│   ├── data.ts                 # Datos estáticos: ejercicios, menús, proyecciones
│   ├── store.ts                # Capa de persistencia (localStorage)
│   └── utils.ts                # Utilidades: fechas, semana actual, calcHabitScore
│
├── types/
│   └── index.ts                # Todos los tipos TypeScript del sistema
│
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

---

## Módulos de la aplicación

### 1. Dashboard `/`
El punto de entrada principal. Muestra:
- Peso actual y kg perdidos
- Score del día (0–70 pts)
- Entrenamiento del día con series/metros
- Checklist de hábitos interactivo (click para marcar)
- Gráfico de proyección de peso (12 semanas)
- Recordatorio de Zona 2: 105–122 bpm
- Stats de la semana (metros nadados, sesiones, score promedio)

### 2. Entrenamiento `/entrenamiento`
- Plan semanal completo (Lunes–Domingo)
- Cada día es expandible
- Días de natación: muestra largos, estilo y metros por set
- Días de core/fuerza: muestra ejercicios con instrucciones desplegables
- Imagen de referencia por ejercicio
- Botón para marcar el día como completado

### 3. Natación `/natacion`
- Registro de sesiones (modal con día, duración, notas)
- Rutina progresiva Mes 1 / Mes 2 / Mes 3 (automática según semana actual)
- Gráfico de metros reales vs proyectados
- Técnica de 3 estilos (libre, espalda, tabla)
- Zona 2 HR: 105–122 bpm
- Ejercicios terapéuticos para L5-S1 en piscina

### 4. Nutrición `/nutricion`
- Menús rotativos A → B → C → D (navegables)
- Cada menú tiene 7 días con las 5 comidas del día
- Indicador de cena Keto vs Convencional
- Distribución de 157 g proteína por comida
- Protocolo Paula Bedón Wellness Coach
- Lista de mercado semanal completa

### 5. Hábitos `/habitos`
- 9 hábitos diarios interactivos con puntos
- Sistema de niveles: Junior (0–30) / Semi-Senior (31–55) / Senior (56–70)
- Historial de scores en gráfico de barras (14 días)
- "System Errors" – errores comunes a evitar
- Persistencia diaria en localStorage

### 6. Progreso `/progreso`
- Modal de registro semanal (peso, cintura, energía, dolor lumbar)
- Calendario de 12 semanas con estado visual
- Gráfico: peso real vs proyectado
- Gráfico: metros nadados por semana
- Tabla histórica de registros
- Barras de progreso hacia las 3 metas de peso

### 7. Ejercicios `/ejercicios`
- Biblioteca de 10 ejercicios
- Búsqueda en tiempo real por nombre o músculo
- Filtros por categoría (Core, Fuerza, Movilidad)
- Cada ejercicio: imagen, descripción, pasos numerados, músculos, prescripción
- Sección McGill Big 3

---

## Datos del programa

### Perfil del usuario
| Campo | Valor |
|-------|-------|
| Nombre | Jaime Henao |
| Edad | 45 años |
| Altura | 1.80 m |
| Peso inicial | 110 kg |
| Condición | Espondilolistesis L5-S1 |
| Inicio programa | 16 de marzo 2026 |

### Metas de peso
| Mes | Meta |
|-----|------|
| Mes 1 | 110 → 105 kg |
| Mes 2 | 105 → 101 kg |
| Mes 3 | 101 → 97 kg |

### Frecuencia cardíaca
| Zona | Rango |
|------|-------|
| FC Máxima | 175 bpm |
| Zona 2 (quema grasa) | 105–122 bpm |

### Proteína diaria objetivo: **157 g**
### Agua diaria: **2 L**

---

## Persistencia de datos

Todos los datos se guardan en `localStorage` del navegador bajo estas claves:

| Clave | Contenido |
|-------|-----------|
| `hos_habits` | Hábitos diarios (array DailyHabits[]) |
| `hos_weekly_records` | Registros semanales (WeeklyRecord[]) |
| `hos_swimming` | Sesiones de natación (SwimmingSession[]) |
| `hos_training` | Sesiones de entrenamiento (TrainingSession[]) |

Para **limpiar todos los datos** y volver al estado inicial:
```javascript
// En la consola del navegador (DevTools → Console)
Object.keys(localStorage).filter(k => k.startsWith('hos_')).forEach(k => localStorage.removeItem(k))
location.reload()
```

---

## Cómo probar la aplicación (paso a paso)

Ver sección **TESTING.md** para guía completa de pruebas manuales.

---

## Troubleshooting

### Puerto 3000 ocupado
```bash
# Matar el proceso en el puerto 3000
lsof -ti:3000 | xargs kill -9
npm run dev
```

### Limpiar caché de Next.js
```bash
rm -rf .next
npm run dev
```

### Reinstalar dependencias
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Próximos pasos sugeridos

- [ ] Autenticación con Supabase Auth
- [ ] Backend con Supabase (PostgreSQL)
- [ ] Notificaciones push (PWA)
- [ ] Exportar progreso a PDF
- [ ] Integración con Apple Health / Google Fit
- [ ] App móvil con React Native / Expo

---

*HealthOS v0.1.0 · Jaime Henao · Inicio: 16 Mar 2026*
