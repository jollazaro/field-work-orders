# Contrato — Work Orders API

Base: `/api`. Auth: `Authorization: Bearer <token>` salvo login y health (ya existentes).

Enums (JSON, inglés):

| Campo | Valores |
|---|---|
| `status` | `PENDING` · `IN_PROGRESS` · `DONE` |
| `priority` | `NORMAL` · `HIGH` |
| `role` | `SUPERVISOR` · `TECHNICIAN` (login actual) |

Errores: `{ "message": "<texto>" }`.

| HTTP | Cuándo |
|---|---|
| 400 | Validación (blank, email, rango lat/lng, archivo no imagen) |
| 401 | Sin token o credenciales inválidas |
| 403 | Rol insuficiente, o el técnico pide una orden que existe y no le corresponde. `message` explícito (ej. `"Not allowed to view this work order"`). |
| 404 | Id de orden o técnico inexistente. No se usa 404 para ocultar visibilidad. |
| 409 | Transición ilegal, estado ya alcanzado, o `PENDING → IN_PROGRESS` sin técnico asignado (`"Assign a technician first"`) |

Sin clave de idempotencia (demo). Reintentar `POST` puede duplicar. Un `POST` de estado ya alcanzado → `409`.

---

## Recursos

### Work order (lista y alta)

```json
{
  "id": 1,
  "title": "Cambio de medidor",
  "site": "Av. Colón 1200",
  "instruction": "Reemplazar medidor y dejar foto del número nuevo.",
  "priority": "HIGH",
  "status": "PENDING",
  "assignedTechnicianId": 2,
  "assignedTechnicianEmail": "tecnico@demo.com",
  "photoUrl": null,
  "lat": null,
  "lng": null,
  "createdAt": "2026-09-18T12:00:00Z",
  "updatedAt": "2026-09-18T12:00:00Z"
}
```

`assignedTechnicianId` / `assignedTechnicianEmail` / `photoUrl` / `lat` / `lng` pueden ser `null`.
`photoUrl` en API local: `/api/work-orders/{id}/photo`. En Pages: data URL o asset estático.

### Work order (detalle)

Lo anterior más:

```json
{
  "statusHistory": [
    {
      "fromStatus": null,
      "toStatus": "PENDING",
      "changedByEmail": "supervisor@demo.com",
      "changedAt": "2026-09-18T12:00:00Z"
    }
  ]
}
```

`fromStatus` es `null` en el evento de creación.

### Technician (alta)

```json
{ "id": 2, "email": "tecnico@demo.com" }
```

---

## Endpoints

### `GET /api/work-orders`

Query opcional: `status`, `priority`. Orden: `updatedAt` desc.

- Supervisor: todas.
- Técnico: asignadas a él **o** sin asignar.

### `POST /api/work-orders`

Solo supervisor. `201`.

```json
{
  "title": "Cambio de medidor",
  "site": "Av. Colón 1200",
  "instruction": "Reemplazar medidor y dejar foto del número nuevo.",
  "priority": "HIGH",
  "assignedTechnicianId": 2
}
```

`title`, `site`, `instruction`: required, no blank. `priority`: required. `assignedTechnicianId`: opcional; si viene, debe ser un `TECHNICIAN`. Estado inicial siempre `PENDING`. Crea el primer evento de historial.

### `GET /api/work-orders/{id}`

Misma visibilidad que la lista.

- `404` si el id no existe.
- `403` `{ "message": "Not allowed to view this work order" }` si existe y el técnico no puede verla (asignada a otro).

### `POST /api/work-orders/{id}/assignment`

Asigna técnico. **No cambia el estado.** `200` con el body de lista.

```json
{ "technicianId": 2 }
```

| Actor | Regla |
|---|---|
| Supervisor | Orden `PENDING`. `technicianId` debe ser un `TECHNICIAN`. Puede reasignar. |
| Técnico | Orden `PENDING` y **libre**. `technicianId` omitido o igual a sí mismo. No puede tomar una ya asignada. |

Otra combinación → `403` o `409`. No escribe `statusHistory` (no es cambio de estado).

### `POST /api/work-orders/{id}/status`

```json
{ "status": "IN_PROGRESS" }
```

Precondición de `IN_PROGRESS`: `assignedTechnicianId` no null. Si falta → `409` `"Assign a technician first"` (cualquier rol). El cambio de estado **nunca** asigna técnico.

| Actor | Transición | Extra |
|---|---|---|
| Técnico | `PENDING` → `IN_PROGRESS` | Solo si está asignada a él |
| Técnico | `IN_PROGRESS` → `DONE` | Solo si está asignada a él |
| Supervisor | `PENDING` → `IN_PROGRESS` | Solo si ya hay técnico |
| Supervisor | `DONE` → `PENDING` | Conserva técnico, foto y pin |

Toda transición (y la creación) agrega un evento a `statusHistory` con `changedByEmail` del actor. Cualquier otra combinación → `409`. El técnico no reabre. El supervisor no marca `DONE`. Foto y pin no cambian en un cambio de estado.

### `POST /api/work-orders/{id}/photo`

Solo técnico, orden `IN_PROGRESS` asignada a él. `multipart/form-data`, campo `file` (imagen). `200` con el body de lista (incluye `photoUrl`). Reemplaza la foto anterior.

`GET /api/work-orders/{id}/photo`: misma visibilidad que el detalle (`403` si no le corresponde, `404` si el id no existe o no hay foto). En Pages no existe este GET (el `photoUrl` ya es el contenido).

`POST` de foto o pin fuera de `IN_PROGRESS`, o por alguien que no sea el técnico asignado → `409` o `403` según corresponda (no asignado / rol vs estado ilegal).

### `POST /api/work-orders/{id}/location`

Solo técnico, orden `IN_PROGRESS` asignada a él.

```json
{ "lat": -31.4201, "lng": -64.1888 }
```

Rango válido: lat `[-90, 90]`, lng `[-180, 180]`. `200` con el body de lista. Reemplaza el pin.

### `GET /api/technicians`

Solo supervisor. Lista `{ id, email }` para el alta y para asignar.

Login y health no cambian: `POST /api/auth/login`, `GET /api/health`.

---

## Seed local (API)

Al arrancar, si no hay órdenes:

1. Alta, libre, `HIGH`
2. En curso, asignada a `tecnico@demo.com`, con pin
3. Hecha, asignada, con foto placeholder y pin

---

## Modo demo (Pages)

Mismas formas JSON. Sin red. Login acepta solo los dos usuarios `demo`. Mutaciones viven en memoria y se pierden al recargar. El frontend elige demo vs API por env (`apiBaseUrl` vacío → demo).

---

## User stories

### US-1 — Supervisor arma el día

```gherkin
Dado que ingresé como supervisor
Cuando creo una orden con título, sitio, instrucción y prioridad
Y opcionalmente elijo un técnico
Entonces queda Pendiente
Y aparece en el tablero
Y el historial registra la creación
```

### US-2 — Técnico toma una libre (sin cambiar estado)

```gherkin
Dado que ingresé como técnico
Y existe una orden Pendiente sin asignar
Cuando me la asigno
Entonces queda asignada a mí y sigue Pendiente
Y un POST a En curso sobre una libre (sin asignar) responde 409
```

### US-3 — Técnico cierra con evidencia

```gherkin
Dado que tengo una orden En curso asignada a mí
Cuando subo una foto y un pin
Y la paso a Hecha
Entonces el detalle muestra foto, mapa e historial
Y ya no puedo cambiarla
```

### US-4 — Supervisor avanza y reabre (auditado)

```gherkin
Dado que una orden está Pendiente y tiene técnico
Cuando el supervisor la pasa a En curso
Entonces el historial registra PENDING → IN_PROGRESS con su email

Dado que una orden está Hecha
Cuando el supervisor la vuelve a Pendiente
Entonces conserva técnico, foto y pin
Y el historial suma DONE → PENDING con su email
Y el técnico no puede hacer esa transición
```

### US-5 — Visibilidad

```gherkin
Dado que ingresé como técnico
Cuando pido el listado
Entonces veo solo las mías y las libres
Y un GET a una orden asignada a otro técnico responde 403
Y un GET a un id que no existe responde 404
```

### US-6 — Foto y pin solo en curso

```gherkin
Dado que una orden no está En curso
Cuando el técnico intenta subir foto o pin
Entonces recibe 409
Y la orden no cambia
```

### US-7 — En curso exige técnico

```gherkin
Dado que una orden está Pendiente y sin técnico
Cuando supervisor o técnico la pasan a En curso
Entonces reciben 409 "Assign a technician first"
Y el estado no cambia
```
