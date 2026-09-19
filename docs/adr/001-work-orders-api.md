# ADR 001 — API de órdenes y modo demo

## Contexto

El backend ya autentica con JWT. Falta el dominio que la spec vende: órdenes, transiciones, foto, pin e historial. El portafolio tiene que vivir en GitHub Pages a $0; Spring + Postgres no se hospedan.

## Opciones

| Tema | Opción A | Opción B | Elección |
|---|---|---|---|
| Asignación | Autoasignar al pasar a En curso | Asignar primero (alta, supervisor, o técnico que toma una libre); el estado no asigna | **B** — En curso exige técnico ya asignado |
| Foto | URL/base64 en el JSON de la orden | `multipart` a disco; demo en memoria | **B** — API real local, Pages sin servidor |
| Reopen | Limpiar técnico/foto/pin | Conservarlos | **B** — reopen = devolver a corrección |
| Historial | Solo `createdAt` / `updatedAt` | Eventos de estado | **B** — la spec pide historial en el detalle |
| Demo pública | API en free tier | Fixtures en el frontend | **B** — sin costo ni link dormido |
| Avance del supervisor | Solo el técnico pasa a En curso | Supervisor también, si ya hay técnico | **B** — validado |
| Orden ajena (técnico) | `404` (ocultar existencia) | `403` con mensaje | **B** — excepción controlada |

## Decisión

Contrato en `docs/API.md`. Misma forma JSON en API real y en modo demo. Identificadores en inglés (`PENDING`, `HIGH`); la UI traduce.

Toda transición (creación, En curso, Hecha, reopen) escribe historial con `changedByEmail`. Foto y pin solo en `IN_PROGRESS`. `PENDING → IN_PROGRESS` es ilegal si `assignedTechnicianId` es null (ambos roles). La toma de una libre es `POST .../assignment`, no un cambio de estado.

Fuera de este corte: compose con la API, CORS fino, CI, frontend.

## Consecuencias

- El frontend puede nacer contra fixtures y después apuntar a `/api` sin cambiar pantallas.
- Foto en Pages no persiste entre recargas (session/memory). Aceptable para demo.
- Disco local no sirve para más de un nodo; no es un problema de portafolio.
- Un `403` permite enumerar ids; irrelevante en demo con seed chico.
- Contrato validado; el siguiente corte es implementación de backend.
