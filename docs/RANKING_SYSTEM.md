# 🏆 Sistema de Ranking — Outlet FC

## Resumen General

El ranking mide el **compromiso** de cada jugador basado en tres pilares:
- **Asistencia** (presencia, puntualidad, ausencias)
- **Logística** (traer camisetas al partido)
- **Finanzas** (pago de cuotas mensuales)

Cada jugador acumula **puntos positivos** y **puntos negativos**. El balance neto (`total_points`) determina su posición en el ranking.

---

## 📊 Views de Base de Datos (Supabase)

El sistema usa 4 views SQL en el schema `public`:

| View | Propósito |
|------|-----------|
| `unified_ranking` | **Ranking principal** — Balance total por jugador |
| `scoring_details` | **Detalle de eventos** — Historial desglosado de cada punto ganado/perdido |
| `commitment_ranking` | View legacy (simplificada, sin breakdown financiero) |
| `wall_of_shame` | Muro de la vergüenza — Solo jugadores con puntos negativos netos |

---

## ⚡ unified_ranking (View Principal)

Esta es la vista que alimenta la página de Rankings y el dashboard del jugador.

### Columnas de Salida:
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `player_id` | `uuid` | ID del jugador (FK a `profiles`) |
| `full_name` | `text` | Nombre completo |
| `avatar_url` | `text` | URL del avatar |
| `role` | `text` | Rol (jugador, dt, etc.) |
| `positive_points` | `integer` | Suma total de puntos positivos |
| `negative_points` | `integer` | Suma total de puntos negativos |
| `total_points` | `integer` | `positive_points + negative_points` (el neto) |

### Estructura Interna (3 CTEs):

#### 1. `attendance_pts` — Puntos por Asistencia

Calcula puntos basados en `attendance_type` y `confirmation_status`:

| Situación | Puntos | Tipo |
|-----------|--------|------|
| Presente avisado → `confirmation_status = 'confirmed'` + `attendance_type = 'present'` | **+10** | ✅ Positivo |
| Avisó que no va → `confirmation_status = 'declined'` | **-2** | ❌ Negativo |
| Faltazo sin aviso → `attendance_type = 'absent'` (sin haber dicho 'declined') | **-8** | 🚫 Negativo |
| Llegó tarde (1er tiempo) → `attendance_type = 'late_1st_half'` | **-2** | ⏰ Negativo |
| Llegó tarde (2do tiempo) → `attendance_type = 'late_2nd_half'` | **-4** | ⏰ Negativo |
| Olvidó camisetas → `forgot_jerseys = true` | **-9** | 👕 Negativo |

> **Nota:** Los eventos con `is_pardoned = true` (indultados por el DT) **no suman ni restan puntos**.

#### 2. `logistics_pts` — Puntos por Logística

| Situación | Puntos | Tipo |
|-----------|--------|------|
| Trajo las camisetas al partido → `matches.jerseys_brought_by_id` | **+4** por partido | ✅ Positivo |

Se calcula contando cuántas veces un jugador aparece como `jerseys_brought_by_id` en la tabla `matches`.

#### 3. `finance_pts` — Puntos por Finanzas

Usa una sub-CTE `relevant_months` que obtiene dinámicamente todos los meses con cuotas configuradas en `fees_config`, **hasta el mes actual inclusive**:

```sql
SELECT DISTINCT fees_config.month, fees_config.year
FROM fees_config
WHERE (year < EXTRACT(year FROM CURRENT_DATE))
   OR (year = EXTRACT(year FROM CURRENT_DATE)
       AND month <= EXTRACT(month FROM CURRENT_DATE))
```

Esto significa que **al agregar un nuevo mes en `fees_config`**, automáticamente se incluye en el cálculo del ranking cuando ese mes llega.

| Situación | Puntos | Tipo |
|-----------|--------|------|
| Cuota pagada (por el jugador, sin financiamiento) → `pay.status = 'paid'` + `is_financed_by_team = false` | **+2** por mes | ✅ Positivo |
| Cuota impaga / financiada por el club / no registrada | **-4** por mes | ❌ Negativo |

> Los pagos con `is_pardoned = true` no se consideran (se excluyen del JOIN).

---

## 📋 scoring_details (Historial de Eventos)

Esta view genera el historial detallado que se ve cuando hacés click en un jugador en el ranking. Es un `UNION ALL` de 6 consultas:

### Eventos Positivos:
| Evento | Icon | Categoría | Puntos | Fuente |
|--------|------|-----------|--------|--------|
| Presente avisado | ✅ | Asistencia | +10 | `attendance` (confirmed + present) |
| Trajo camisetas | 👕 | Logística | +4 | `matches` (jerseys_brought_by_id) |
| Cuota al día | 💰 | Finanzas | +2 | `payments` (paid, no financiado) |

### Eventos Negativos:
| Evento | Icon | Categoría | Puntos | Fuente |
|--------|------|-----------|--------|--------|
| Aviso de ausencia | 🚩 | Asistencia | -2 | `attendance` (declined) |
| Faltazo sin aviso | 🚫 | Asistencia | -8 | `attendance` (absent, no declined) |
| Llegó 1er tiempo | ⏰ | Asistencia | -2 | `attendance` (late_1st_half) |
| Llegó 2do tiempo | ⏰ | Asistencia | -4 | `attendance` (late_2nd_half) |
| Olvidó camisetas | 👕 | Logística | -9 | `attendance` (forgot_jerseys) |
| Cuota pendiente / Financiado por club | 💸 | Finanzas | -4 | `payments` (no paid / financiado) |

Cada evento trae:
- `source_table` + `source_id` → para identificar el registro original (usado por "Indultar")
- `is_pardoned` → si fue indultado por el DT
- `event_date` → fecha del partido o mes de la cuota

---

## 🔴 wall_of_shame (Muro de la Vergüenza)

Filtra solo jugadores con **puntos negativos netos** y agrega contadores:

| Columna | Descripción |
|---------|-------------|
| `total_shame_points` | Balance negativo total |
| `late_count` | Cantidad de veces que llegó tarde |
| `absent_count` | Cantidad de faltas |
| `forgot_jerseys_count` | Cantidad de veces que olvidó camisetas |
| `unpaid_months_count` | Cantidad de meses impagos |

---

## 🖥️ Frontend (Rankings.tsx)

### Secciones de la Página:

1. **🏆 Los Más Comprometidos (Top 3 — Podium)**
   - Cards de podio con avatares grandes
   - Posiciones 1, 2, 3 con diseño especial
   - El #1 tiene trofeo animado y color dorado

2. **🛡️ Tabla General (Posición 4+)**
   - Tabla con filas interactivas
   - Muestra puntos positivos y negativos por separado

3. **⚠️ El Muro de la Vergüenza**
   - Cards oscuras (`bg-[#0a0f1a]`) con borde rojo
   - Fotos en escala de grises
   - Muestra breakdown: Déficit / Ahorro / Neto

### Interacción:
- **Click en cualquier jugador** → Abre BottomSheet con historial detallado (`scoring_details`)
- **Indultar** (solo DT) → El DT puede perdonar una infracción negativa, marcándola como `is_pardoned` en la tabla original

### Player Dashboard:
- Muestra **Top 3** del ranking en widget lateral
- Si un jugador tiene ≤ -10 puntos → muestra **alerta del Muro de la Vergüenza**
- Si el jugador es el último del ranking → alerta especial "SOS EL COLISTA DEL EQUIPO"

---

## 🔧 Tabla de Puntos Resumen

| Acción | Puntos | Categoría |
|--------|--------|-----------|
| Presente al partido (avisado) | **+10** | Asistencia |
| Trajo camisetas | **+4** | Logística |
| Cuota pagada | **+2** | Finanzas |
| Avisó ausencia | **-2** | Asistencia |
| Llegó tarde (1er T) | **-2** | Asistencia |
| Llegó tarde (2do T) | **-4** | Asistencia |
| Faltazo sin aviso | **-8** | Asistencia |
| Olvidó camisetas | **-9** | Logística |
| Cuota impaga | **-4** | Finanzas |

---

## ⚠️ Consideraciones y Mejoras Pendientes

1. **Indulto**: Al indultar una infracción, se marca `is_pardoned = true` en la tabla original (`attendance` o `payments`). Los puntos indultados **se excluyen** del cálculo del `unified_ranking`.
2. **Pagos financiados por el club**: Cuentan como **-4** (misma penalidad que impagos) porque el jugador no pagó de su bolsillo.
3. **`commitment_ranking`**: View legacy más simple, no distingue positivos/negativos, no excluye indultados. Se recomienda usar `unified_ranking` para todo.
4. **Meses financieros**: Se calculan dinámicamente desde `fees_config` hasta el mes actual. Al configurar cuotas para un nuevo mes, se incluyen automáticamente en el ranking.
