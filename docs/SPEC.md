# Spec — Órdenes de trabajo en campo

Demo de portafolio: Angular + Ionic (web y celular en el browser). Java / Spring Boot + PostgreSQL atrás. Repo público y página online, con datos de ejemplo si no hay API.

## Qué resuelve

El supervisor arma el trabajo del día. El técnico lo ve en el celular, lo toma, marca cómo va, sube una foto y deja el punto en el mapa.

## Roles

- **Supervisor:** crea órdenes, ve el tablero del día, filtra por estado. Puede pasar una pendiente a en curso y reabrir una hecha a pendiente. Cada cambio queda en el historial con quién lo hizo.
- **Técnico:** ve las suyas (o las libres), cambia estado, adjunta foto y ubicación. Si pide una orden que no le corresponde, recibe un error controlado (sin permiso), no un “no existe”.

Usuarios de prueba: `supervisor@demo.com` / `tecnico@demo.com` (clave `demo`).

## Pantallas

1. Login
2. Lista de órdenes (estado, prioridad, sitio)
3. Detalle (instrucción, historial de estado, foto, mapa)
4. Alta (solo supervisor)
5. En el detalle: técnico toma una libre (se asigna), En curso / Hecha, foto y pin (solo En curso). Supervisor: asigna técnico, En curso (solo si ya hay técnico) y reopen a Pendiente.

Nada más. Sin perfil, sin notificaciones, sin settings.

## Estados

`Pendiente` → `En curso` → `Hecha`

Invariante: **sin técnico asignado no se pasa a En curso**, ni supervisor ni técnico. El supervisor puede pasar Pendiente → En curso (ya asignada) y volver Hecha → Pendiente. El técnico avanza Pendiente → En curso → Hecha solo sobre una orden suya. No hay más estados. Toda transición se registra en el historial.

## Reglas (cerradas)

- **Asignación.** El supervisor puede crear una orden libre o asignarla (al crear o después, mientras esté Pendiente). El técnico ve las suyas y las libres; una libre la toma (se asigna) y **sigue Pendiente**. Nadie se autoasigna al cambiar el estado.
- **En curso exige técnico.** `Pendiente → En curso` requiere técnico ya asignado. Si está libre → `409`. Vale para los dos roles.
- **Foto y pin.** Solo en En curso, y solo el técnico asignado (archivo de imagen + lat/lng). En Pages, el archivo no sale del browser. En local, la API guarda el archivo en disco.
- **Reopen.** Hecha → Pendiente (solo supervisor) conserva técnico, foto y pin. Queda en el historial con el email del supervisor.
- **Historial.** El detalle lista cada cambio de estado (quién, cuándo, de → a), incluida la creación, el avance del supervisor y el reopen. No es solo `updatedAt`.
- **Permisos.** Supervisor: alta, listado, filtro, asignar técnico, Pendiente → En curso, reopen. Técnico: no crea ni reabre; toma libres (asignarse), estado / foto / pin sobre las que puede ver. Orden existente fuera de su visibilidad → `403` con mensaje. Id inexistente → `404`.

Contrato HTTP: [API.md](API.md). Decisiones: [adr/001-work-orders-api.md](adr/001-work-orders-api.md).

## Datos de una orden

Título, sitio (texto), instrucción, prioridad (normal/alta), estado, técnico asignado (o sin asignar), foto, lat/lng, fechas de creación y de último cambio, historial de estado.

## Cómo se prueba

- Online: link de GitHub Pages (modo demo, sin instalar nada).
- Local: clonar y `docker compose up` para API + base (cuando exista).

## Fuera de alcance

Rutas, stock, facturación, push, chat, app en stores, varios tipos de orden, reportes.
