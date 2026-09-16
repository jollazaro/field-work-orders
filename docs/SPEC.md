# Spec — Órdenes de trabajo en campo

Demo de portafolio: Angular + Ionic (web y celular en el browser). Java / Spring Boot + PostgreSQL atrás. Repo público y página online, con datos de ejemplo si no hay API.

## Qué resuelve

El supervisor arma el trabajo del día. El técnico lo ve en el celular, lo toma, marca cómo va, sube una foto y deja el punto en el mapa.

## Roles

- **Supervisor:** crea órdenes, ve el tablero del día, filtra por estado. Puede reabrir una orden hecha a pendiente.
- **Técnico:** ve las suyas (o las libres), cambia estado, adjunta foto y ubicación.

Usuarios de prueba: `supervisor@demo.com` / `tecnico@demo.com` (clave `demo`).

## Pantallas

1. Login
2. Lista de órdenes (estado, prioridad, sitio)
3. Detalle (instrucción, historial de estado, foto, mapa)
4. Alta (solo supervisor)
5. En el detalle, el técnico: En curso / Hecha, foto, pin

Nada más. Sin perfil, sin notificaciones, sin settings.

## Estados

`Pendiente` → `En curso` → `Hecha`

El supervisor puede volver una hecha a pendiente si hace falta. No hay más estados.

## Datos de una orden

Título, sitio (texto), instrucción, prioridad (normal/alta), estado, técnico asignado (o sin asignar), foto, lat/lng, fechas de creación y de último cambio.

## Cómo se prueba

- Online: link de GitHub Pages (modo demo, sin instalar nada).
- Local: clonar y `docker compose up` para API + base (cuando exista).

## Fuera de alcance

Rutas, stock, facturación, push, chat, app en stores, varios tipos de orden, reportes.
