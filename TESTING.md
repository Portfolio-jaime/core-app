# Guía de Pruebas Manuales – HealthOS

> Esta guía cubre cómo verificar que cada módulo funciona correctamente.  
> No requiere herramientas externas. Solo un navegador (Chrome recomendado).

---

## Preparación

```bash
# Asegúrate de que la app está corriendo
cd /Users/jaime.henao/arheanja/core-app
npm run dev
```

Abre **http://localhost:3000** en Chrome.

Abre **DevTools** (Cmd+Option+I) → pestaña **Console** y también **Application → Local Storage** para verificar persistencia.

---

## MÓDULO 1 – Dashboard

URL: `http://localhost:3000`

### Qué verificar

| # | Acción | Resultado esperado |
|---|--------|--------------------|
| 1 | Abrir la página | Debe mostrar "Hola, Jaime 👋" y la fecha actual |
| 2 | Ver la barra de progreso superior | Debe indicar "Semana 1 de 12" (primera semana) |
| 3 | Ver las tarjetas de stats | Peso: 110 kg, Perdido: 0 kg, Meta mes: 105 kg |
| 4 | Ver el card "Hoy" | Debe mostrar la actividad del día actual (ej: lunes = Core, martes = Natación) |
| 5 | Hacer click en un hábito (ej: "💧 2L agua") | Se tacha con check verde, puntos suben |
| 6 | Marcar 3+ hábitos | Score sube en tiempo real |
| 7 | Refrescar la página | Los hábitos marcados deben PERSISTIR |
| 8 | Ver el gráfico de proyección | Línea de 110 → 100 kg en 12 semanas |
| 9 | Ver el card naranja "Zona de Quema" | Debe mostrar 105–122 bpm |

---

## MÓDULO 2 – Entrenamiento

URL: `http://localhost:3000/entrenamiento`

### Qué verificar

| # | Acción | Resultado esperado |
|---|--------|--------------------|
| 1 | Abrir la página | Lista de 7 días (Lunes–Domingo) |
| 2 | El día actual debe estar resaltado | Badge "HOY" visible, borde azul |
| 3 | Click en "Lunes" | Se expande mostrando ejercicios de core (Cat-Cow, Bird Dog, etc.) |
| 4 | Click en un ejercicio (ej: Bird Dog) | Muestra imagen, descripción, pasos numerados |
| 5 | Click en "Martes" | Se expande mostrando series de natación (4 cal, 8 libre, etc.) |
| 6 | Verificar metros en natación martes | 4+8+4+4 = 20 largos × 25m = 500 m |
| 7 | Click en "Marcar como completado" | Botón se pone verde con checkmark |
| 8 | Click en "Miércoles" | Muestra Hip Thrust, Face Pull, Farmer Carry |
| 9 | Click en "Domingo" | Muestra card de descanso activo |

---

## MÓDULO 3 – Natación

URL: `http://localhost:3000/natacion`

### Qué verificar

| # | Acción | Resultado esperado |
|---|--------|--------------------|
| 1 | Abrir la página | Muestra 105–122 bpm en zona 2, metros semana actual = 0 |
| 2 | Click "Registrar" | Abre modal con selector de día, duración, notas |
| 3 | Seleccionar "Martes" y 35 min | Valores cargados en el form |
| 4 | Click "Guardar" | Modal cierra, sesiones recientes aparece abajo |
| 5 | Verificar estadísticas | Contador de sesiones sube a 1 |
| 6 | Registrar una sesión de Sábado | Metros semana debe subir (martes+sábado) |
| 7 | Ver rutina Mes 1 | Martes: 4 cal + 8 libre + 4 espalda + 4 tabla = 500 m |
| 8 | Ver técnica | 3 cards con freestyle, espalda, patada con tabla |
| 9 | Ver ejercicios terapéuticos | Flotación, caminata en agua, patada dorsal |

---

## MÓDULO 4 – Nutrición

URL: `http://localhost:3000/nutricion`

### Qué verificar

| # | Acción | Resultado esperado |
|---|--------|--------------------|
| 1 | Abrir la página | Muestra "Semana A" activa con Lunes seleccionado |
| 2 | Ver las 5 comidas del día | Desayuno, Snack AM, Almuerzo, Snack PM, Cena |
| 3 | Cena Lunes (Keto) | Badge verde "🥑 Keto", mensaje sobre quema de grasa |
| 4 | Click en "Martes" | Cambia el contenido a comidas del martes |
| 5 | Cena Martes | Badge azul "🌽 Convencional" |
| 6 | Click flecha derecha (→) | Cambia a Semana B |
| 7 | Verificar Semana B Lunes | Desayuno diferente al de Semana A |
| 8 | Click flecha izquierda (←) | Regresa a Semana A |
| 9 | Scroll hacia abajo | Ver distribución 157g proteína por comida |
| 10 | Ver lista de mercado | 6 categorías con productos específicos |

---

## MÓDULO 5 – Hábitos

URL: `http://localhost:3000/habitos`

### Qué verificar

| # | Acción | Resultado esperado |
|---|--------|--------------------|
| 1 | Abrir la página | Score = 0 pts, nivel "Junior" |
| 2 | Marcar "💧 Beber 2L de agua" | Score = 10, fondo verde en el hábito |
| 3 | Marcar "🏋️ Ejercicio del día" | Score = 25 (10+15) |
| 4 | Marcar "😴 Dormir 7 horas" | Score = 35 |
| 5 | Marcar "🧘 Pausa / mindfulness" | Score = 50 |
| 6 | Al llegar a 31+ pts | Nivel cambia a "Semi-Senior" |
| 7 | Al llegar a 56+ pts | Nivel cambia a "Senior – ¡Arquitectura de alto rendimiento!" |
| 8 | Desmarcar un hábito | Score baja, se pueden desmarcar |
| 9 | Refrescar página | Estado guardado persiste |
| 10 | Ver errores del sistema | 4 cards rojos: Error 404, Error 500, Memory Leak, Low Battery |

---

## MÓDULO 6 – Progreso

URL: `http://localhost:3000/progreso`

### Qué verificar

| # | Acción | Resultado esperado |
|---|--------|--------------------|
| 1 | Abrir la página | Stats en 0 (sin registros), calendario vacío |
| 2 | Click "Semana 1" (botón superior) | Abre modal de registro |
| 3 | En el modal: peso = 108.5, cintura = 102 | Valores ingresados |
| 4 | Energía: click en "4" | Botón verde activo |
| 5 | Dolor lumbar: click en "2" | Botón rojo activo |
| 6 | Click "Guardar" | Modal cierra |
| 7 | Ver tarjetas de stats | Peso actual = 108.5, Perdido = 1.5 kg |
| 8 | Ver calendario Semana 1 | Muestra 108.5 kg en verde |
| 9 | Agregar un segundo registro (Semana 2) | El gráfico de peso muestra 2 puntos |
| 10 | Ver tabla histórica | Fila con semana, peso, cintura, energía (★), dolor |
| 11 | Gráfico "Peso real vs proyectado" | Línea azul sólida (real) sobre línea punteada (proyectado) |

---

## MÓDULO 7 – Ejercicios

URL: `http://localhost:3000/ejercicios`

### Qué verificar

| # | Acción | Resultado esperado |
|---|--------|--------------------|
| 1 | Abrir la página | Lista de 10 ejercicios |
| 2 | Buscar "glute" | Solo muestra Glute Bridge |
| 3 | Buscar "Glúteo" (por músculo) | Muestra ejercicios relacionados |
| 4 | Limpiar búsqueda | Vuelven los 10 |
| 5 | Filtro "Core" | Solo Bird Dog, Dead Bug, Glute Bridge, Side Plank |
| 6 | Filtro "Fuerza" | Hip Thrust, Face Pull, Farmer Carry |
| 7 | Filtro "Movilidad" | Cat-Cow, Pelvic Tilt, Thoracic Rotation |
| 8 | Click en "Bird Dog" | Se expande con imagen grande, pasos, músculos |
| 9 | Ver alerta amarilla | "⚠️ No arquear la zona lumbar..." |
| 10 | Click en otro ejercicio | El anterior se cierra, el nuevo se abre |
| 11 | Ver McGill Big 3 | Card azul en el fondo con los 3 ejercicios |

---

## Prueba de persistencia completa

Esta prueba verifica que los datos sobreviven entre sesiones.

```
1. Ir a /habitos → marcar 5 hábitos
2. Ir a /natacion → registrar una sesión
3. Ir a /progreso → registrar semana con peso 108 kg
4. Cerrar completamente el navegador
5. Volver a abrir http://localhost:3000
6. Verificar:
   - Dashboard muestra peso 108 kg
   - Dashboard muestra los hábitos marcados
   - /natacion muestra la sesión registrada
   - /progreso muestra el registro y el gráfico
```

---

## Verificar localStorage en DevTools

1. Abre `http://localhost:3000`  
2. DevTools → **Application** → **Local Storage** → `http://localhost:3000`  
3. Deberías ver:

| Clave | Contenido de ejemplo |
|-------|---------------------|
| `hos_habits` | `[{"id":"2026-03-16","water2L":true,...}]` |
| `hos_weekly_records` | `[{"week":1,"weight":108.5,...}]` |
| `hos_swimming` | `[{"id":"...","totalMeters":500,...}]` |

---

## Prueba responsive (móvil)

1. DevTools → icono de dispositivo móvil (Ctrl+Shift+M)
2. Seleccionar "iPhone 14 Pro" o "Pixel 7"
3. Verificar:
   - Navegación aparece en la **barra inferior** (no sidebar)
   - Cards se adaptan a 1 columna
   - Textos legibles sin scroll horizontal

---

## Build de producción (prueba final)

```bash
# Compilar todo
npm run build

# Si sale ✓ Generating static pages (10/10) → éxito total

# Arrancar en producción
npm run start
# → http://localhost:3000
```

El build exitoso confirma:
- Sin errores de TypeScript
- Sin imports rotos
- Todas las páginas renderizables

---

## Limpieza de datos para resetear

```javascript
// Pegar en DevTools → Console
Object.keys(localStorage)
  .filter(k => k.startsWith('hos_'))
  .forEach(k => localStorage.removeItem(k));

console.log('✓ Datos resetados');
location.reload();
```

---

**HealthOS v0.1.0 – Build limpio confirmado ✓**
