# Órdenes de trabajo en campo

El supervisor carga el trabajo del día. El técnico lo ve en el celular, cambia el estado, sube una foto y deja dónde está. Deja de resolverse por WhatsApp.

**Stack:** Angular + Ionic (web y celular en el browser). Java / Spring Boot + PostgreSQL atrás.

Usuarios de prueba: `supervisor@demo.com` / `tecnico@demo.com` (clave `demo`).

Alcance y reglas: [docs/SPEC.md](docs/SPEC.md). Contrato HTTP: [docs/API.md](docs/API.md).

## Levantar local

Hace falta **Java 21**, **Docker** (solo para Postgres) y **Node 22.22+** (requerido por Angular 22 / Ionic 9 del scaffold actual).

### Backend (API + base)

Desde la raíz del repo:

```bash
docker compose up -d
cd backend
./mvnw spring-boot:run
```

- API: `http://localhost:8080`
- Login: `POST /api/auth/login` con `{"email":"supervisor@demo.com","password":"demo"}`
- Postgres: `localhost:5433` (usuario/clave `fieldwork`, base `field_work_orders`)

Tests: `cd backend && ./mvnw test`.

### Frontend (Angular + Ionic)

```bash
cd frontend
npm install
npm start
```

- App: `http://localhost:8100` (rutas hash: `#/login`, `#/orders`)
- Lint: `npm run lint`
- Build: `npm run build` (salida en `frontend/www`)
- Tests: `npm test`

- **Demo / sin API (default):** `apiBaseUrl` vacío en `src/environments/`. Login y órdenes viven en memoria (se pierden al recargar). Es el modo de GitHub Pages.
- **Contra este backend:** poné `apiBaseUrl: 'http://localhost:8080'` en `environment.ts` y levantá la API. El front manda `Authorization: Bearer`; Spring permite CORS desde `http://localhost:8100` y `http://localhost:4200`.

El visitante de la web de portafolio usa solo el modo demo. Docker y Spring son para desarrollo y para quien clone el repo.
