# ADR 002 — UI frontend (paleta, tipografía, legibilidad de campo)

## Contexto

El cliente Ionic demo debe usarse en mobile y desktop, también por operadores con manos robustas. Se descartó una dirección oscura/SaaS: hace falta alto contraste, tipografía grande y poca información confusa. La app actual no cambia hasta que este ADR se implemente en un corte explícito.

## Decisiones cerradas

### Paleta: `sky` (Cielo operativo)

| Token | Claro | Oscuro |
|---|---|---|
| `bg` | `#F7F9FC` | `#0B1220` |
| `surface` | `#FFFFFF` | `#152033` |
| `text` | `#0F172A` | `#F8FAFC` |
| `textMuted` | `#334155` | `#CBD5E1` |
| `border` | `#CBD5E1` | `#334155` |
| `accent` (acción primaria) | `#1D4ED8` | `#60A5FA` |
| `accentText` | `#FFFFFF` | `#0B1220` |
| Estado Pendiente | `#EAB308` / texto `#0F172A` | `#FACC15` / texto `#0F172A` |
| Estado En curso | `#2563EB` / texto `#FFFFFF` | `#3B82F6` / texto `#FFFFFF` |
| Estado Completada | `#15803D` / texto `#FFFFFF` | `#22C55E` / texto `#052E16` |
| Urgente | `#DC2626` | `#F87171` |

Reglas: prioridad normal sin chip de color; un color de estado = un significado; sin púrpura ni crema.

### Tipografía: Source Sans 3

- Familia: `"Source Sans 3", system-ui, sans-serif` (Google Fonts o self-host).
- Pesos: 400 (cuerpo), 600/700 (títulos y botones).

Escala mínima (táctil):

| Uso | Tamaño |
|---|---|
| Título de pantalla | 28–32 px |
| Título de orden | 22–24 px |
| Cuerpo / sitio | 18–20 px |
| Botón / chip | 18 px bold |
| Prohibido en UI táctil crítica | &lt; 16 px |

Targets: fila ≥ 72 px; botón primario ≥ 56 px; chip ≥ 48 px.

## Decisiones de producto (propuestas, pendientes de OK de copy)

Nomenclatura sugerida (UI en español; enums API siguen en inglés):

| Hoy | Copy campo |
|---|---|
| PENDING sin técnico | Sin asignar (chip/filtro UI; API sigue `PENDING`) |
| DONE | Completada |
| HIGH | Urgente |
| Tomar orden | Tomar |
| Reabrir | Pasar a Pendiente |
| Completar | Completar |
| Volver al listado | Atrás |

Sacar o esconder: email+rol siempre en header, lat/lng en texto, historial abierto por defecto, chip “Normal”, hints largos, marca duplicada en login.

## Consecuencias

- ThemeService / `variables.scss` / chips deben mapear a estos tokens (light + `ion-palette-dark`).
- Cargar Source Sans 3 en `index.html` o Angular assets.
- Corte de implementación separado: no mezclar con features de dominio.
- Layout por pantalla (login sin chrome, sticky CTA) implementado en el corte UX; kanban supervisor sigue fuera de alcance.

## Estado

- **Cerrado:** paleta `sky`, tipografía Source Sans 3, escala y targets.
- **Copy de campo:** aplicada en UI (`Pendiente`, `Completada`, `Urgente`, `Tomar`, `Atrás`, etc.).
- **Layout UX (2026-09):** login sin chrome; sticky CTA en detalle; filtros colapsables + empty con limpiar; create con required unificado y lat/lng ocultos; chips/targets al tamaño ADR; header solo con rol (sin email).
- **Abierto:** kanban supervisor (fuera del piloto).
