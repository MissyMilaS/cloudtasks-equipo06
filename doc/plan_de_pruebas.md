

## Archivos de prueba

```
tests/
├── funciones.js   ← Copia de las funciones puras de app.js (sin DOM)
├── pruebas.js     ← 51 casos de prueba
└── runner.html    ← Abre en el navegador para ver resultados
```

**Cómo ejecutar:** Abrir `tests/runner.html` con Live Server en VS Code.

---

## Tipos de caso

| Etiqueta | Significado |
|----------|-------------|
| 🔵 **normal** | Flujo esperado / camino feliz con datos válidos |
| 🟡 **error**  | Entrada inválida, nula o completamente inesperada |
| 🟣 **límite** | Condición de frontera: vacío, mínimo, máximo |

---

## Módulo 1 — `escapeHtml` (8 casos)

| ID  | Tipo    | Entrada                        | Esperado                                          | Qué valida              |
|-----|---------|-------------------------------|---------------------------------------------------|-------------------------|
| P01 | normal  | `'<script>alert(1)</script>'` | `'&lt;script&gt;alert(1)&lt;/script&gt;'`         | Prevención XSS          |
| P02 | normal  | `'Tom & Jerry'`               | `'Tom &amp; Jerry'`                               | Escapa `&`              |
| P03 | normal  | `'"hola"'`                    | `'&quot;hola&quot;'`                              | Escapa `"`              |
| P04 | normal  | `"it's done"`                 | `'it&#039;s done'`                                | Escapa `'`              |
| P05 | normal  | `'Texto normal'`              | `'Texto normal'`                                  | Sin especiales = igual  |
| P06 | error   | `null`                        | `''`                                              | Null sin error          |
| P07 | error   | `undefined`                   | `''`                                              | Undefined sin error     |
| P08 | límite  | `''`                          | `''`                                              | Cadena vacía            |

---

## Módulo 2 — `normalizeTaskState` (9 casos)

| ID  | Tipo    | Entrada (resumen)                              | Estado esperado   | Qué valida                       |
|-----|---------|------------------------------------------------|-------------------|----------------------------------|
| P09 | normal  | `completed:true, status:'iniciado'`            | `'terminado'`     | Flag completed prevalece         |
| P10 | normal  | `completed:false, status:'terminado'`          | `completed: true` | Status terminado activa flag     |
| P11 | normal  | deadline ayer + `status:'iniciado'`            | `'sin-terminar'`  | Vencimiento automático           |
| P12 | normal  | deadline ayer + `status:'en-progreso'`         | guarda previo     | Preserva statusBeforeOverdue     |
| P13 | normal  | deadline mañana + `status:'iniciado'`          | `'iniciado'`      | No cambia si no venció           |
| P14 | normal  | `status:'sin-terminar', statusBeforeOverdue`   | `'en-progreso'`   | Restaura estado anterior         |
| P15 | error   | `null`                                         | `null`            | Null no lanza error              |
| P16 | error   | `status:'estado-invalido'`                     | `'sin-empezar'`   | Status desconocido → default     |
| P17 | límite  | sin deadline, `status:'sin-empezar'`           | `'sin-empezar'`   | Sin deadline no muta             |

---

## Módulo 3 — `getEditStatusOptions` (7 casos)

| ID  | Tipo    | Status actual    | ¿Vencida? | Opciones esperadas              | Qué valida                  |
|-----|---------|-----------------|-----------|--------------------------------|-----------------------------|
| P18 | normal  | `'sin-empezar'`  | No        | `['sin-empezar', 'iniciado']`  | Avance a iniciado           |
| P19 | normal  | `'iniciado'`     | No        | `['iniciado', 'en-progreso']`  | Avance a en-progreso        |
| P20 | normal  | `'en-progreso'`  | No        | `['en-progreso']`              | Último estado editable      |
| P21 | normal  | `'terminado'`    | No        | `['terminado']`                | No puede retroceder         |
| P22 | normal  | `'iniciado'`     | Sí        | `['sin-terminar']`             | Vencida bloquea opciones    |
| P23 | error   | `'desconocido'`  | No        | `['sin-empezar', 'iniciado']`  | Fallback en status inválido |
| P24 | límite  | `'sin-terminar'` | No        | `['sin-terminar']`             | sin-terminar se mantiene    |

---

## Módulo 4 — `isTaskOverdue` (5 casos)

| ID  | Tipo    | Deadline    | Status        | Esperado | Qué valida                         |
|-----|---------|------------|---------------|----------|------------------------------------|
| P25 | normal  | Ayer       | `'iniciado'`  | `true`   | Tarea vencida detectada            |
| P26 | normal  | Mañana     | `'iniciado'`  | `false`  | Tarea vigente no vencida           |
| P27 | normal  | Ayer       | `'terminado'` | `false`  | Terminada nunca cuenta como vencida|
| P28 | error   | `null`     | `'iniciado'`  | `false`  | Sin deadline = no vencida          |
| P29 | límite  | Ayer       | `'sin-empezar'`| `true`  | Cualquier estado activo vence      |

---

## Módulo 5 — `sortTasks` (5 casos)

| ID  | Tipo    | Descripción                                | Esperado                  | Qué valida              |
|-----|---------|-------------------------------------------|---------------------------|-------------------------|
| P30 | normal  | 2 tareas con deadlines distintos           | Más próximo primero       | Orden por fecha         |
| P31 | normal  | Mismo deadline, prioridades distintas      | Urgente antes que baja    | Desempate por prioridad |
| P32 | normal  | Tarea sin deadline vs con deadline         | Sin deadline va al final  | null deadline = Infinity|
| P33 | error   | Lista vacía                                | `[]`                      | No rompe con vacío      |
| P34 | límite  | Lista con un solo elemento                 | Longitud = 1              | Un elemento es estable  |

---

## Módulo 6 — `getVisibleTasks` (7 casos)

| ID  | Tipo    | Rol perfil      | Escenario                           | Esperado | Qué valida                    |
|-----|---------|----------------|-------------------------------------|----------|-------------------------------|
| P35 | normal  | administrador   | 3 tareas disponibles                | 3        | Admin ve todo                 |
| P36 | normal  | lider           | 3 tareas, 2 son del líder           | 2        | Filtro por leader_id          |
| P37 | normal  | usuario         | 3 tareas, 2 asignadas al usuario    | 2        | Filtro por assigned_user_ids  |
| P38 | normal  | usuario         | Ninguna tarea asignada a él         | 0        | Usuario sin asignaciones      |
| P39 | error   | `null`          | 2 tareas disponibles                | 0        | Sin perfil → lista vacía      |
| P40 | error   | usuario         | Tarea sin campo assigned_user_ids   | 0        | Campo ausente no rompe        |
| P41 | límite  | administrador   | Lista vacía                         | 0        | Admin con cero tareas         |

---

## Módulo 7 — `formatDateInput` (3 casos)

| ID  | Tipo    | Entrada                    | Esperado           | Qué valida               |
|-----|---------|---------------------------|---------------------|--------------------------|
| P42 | normal  | `'2026-09-14T23:00:00Z'`  | `'2026-09-14T23:00'`| Recorta a 16 caracteres  |
| P43 | error   | `null`                    | `''`                | Null sin error           |
| P44 | límite  | `'2026-09-14T23:00'`      | `'2026-09-14T23:00'`| Exactamente 16 chars     |

---

## Módulo 8 — Etiquetas y clases CSS (7 casos)

| ID  | Tipo    | Función            | Entrada         | Esperado                |
|-----|---------|-------------------|-----------------|-------------------------|
| P45 | normal  | `getStatusLabel`   | `'sin-empezar'` | `'⬜ Sin empezar'`       |
| P46 | normal  | `getStatusLabel`   | `'terminado'`   | `'✅ Terminado'`         |
| P47 | normal  | `getStatusLabel`   | `'en-progreso'` | `'🟨 En progreso'`       |
| P48 | error   | `getStatusLabel`   | `'desconocido'` | `'desconocido'`         |
| P49 | normal  | `getPriorityLabel` | `'urgente'`     | `'🟣 Urgente'`          |
| P50 | error   | `getPriorityLabel` | `'extrema'`     | `'extrema'`             |
| P51 | normal  | `getStatusClass` / `getPriorityClass` | `'en-progreso'` / `'alta'` | Clases CSS correctas |

---

## Resumen de cobertura

| Módulo               | Normal | Error | Límite | Total |
|---------------------|--------|-------|--------|-------|
| escapeHtml           | 5      | 2     | 1      | 8     |
| normalizeTaskState   | 6      | 2     | 1      | 9     |
| getEditStatusOptions | 5      | 1     | 1      | 7     |
| isTaskOverdue        | 3      | 1     | 1      | 5     |
| sortTasks            | 3      | 1     | 1      | 5     |
| getVisibleTasks      | 4      | 2     | 1      | 7     |
| formatDateInput      | 1      | 1     | 1      | 3     |
| Etiquetas / Clases   | 5      | 2     | 0      | 7     |
| **Total**            | **32** | **12**| **7**  | **51**|

---

## Criterios de aceptación

- ✅ **PASA**: La salida real coincide exactamente con la esperada.
- ❌ **FALLA**: La salida difiere. El runner muestra el valor obtenido.

Un módulo se aprueba cuando **todos** sus casos pasan.
