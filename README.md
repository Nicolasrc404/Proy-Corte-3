# Plataforma Alquímica

**Grupo:** Tinteros

**Participantes:**

- Nicolás Rubiano Cortés
- Ángel Sebastián Castillo León
- Yonatan David Ruiz Guevara


## 📚 Descripción general
Plataforma académica fullstack para gestionar misiones alquímicas, inventarios de materiales, transmutaciones y auditorías de cumplimiento. El backend expone una API REST en Go que persiste en PostgreSQL, procesa trabajos pesados en background con Redis y publica eventos SSE para el frontend React + Vite, que muestra paneles diferenciados para alquimistas y supervisores. Docker Compose entrega todo el entorno orquestado en contenedores reproducibles.

## 🏛️ Arquitectura del sistema
- **API Go (backend/)**: Gorilla Mux, GORM y JWT para autenticación. Expone recursos CRUD, emite eventos SSE y delega trabajos largos al `TaskQueue` respaldado por Redis.
- **Frontend React (frontend/)**: Vite + Tailwind. Consume la API con `fetch`, administra el token con Context API y actualiza el dashboard en tiempo real mediante SSE.
- **PostgreSQL**: Base relacional `backend-avanzada-1` inicializada con [`init.sql`](./init.sql).
- **Redis**: Cola de trabajos para el worker que procesa transmutaciones, auditorías diferidas y verificaciones programadas.
- **Documentación**: Colección Postman lista para importar en [`docs/postman_collection.json`](./docs/postman_collection.json).

```
├── backend/          # API Go: config, modelos, repositorios, server y worker async
├── frontend/         # SPA React + Vite con rutas protegidas
├── docs/             # Postman collection
├── init.sql          # Datos semillas y usuarios demo
├── docker-compose.yml
└── README.md         # Este documento
```

## 🧩 Servicios y puertos

| Servicio         | Puerto | Contenedor          | Descripción                                            |
| ---------------- | ------ | ------------------- | ------------------------------------------------------ |
| Frontend (React) | `3000` | `amestris-frontend` | Panel responsive por rol (alquimista/supervisor).      |
| Backend (Go API) | `8000` | `amestris-backend`  | REST + SSE, JWT, cola Redis.                           |
| PostgreSQL       | `5432` | `amestris-postgres` | DB principal con migraciones automáticas y `init.sql`. |
| Redis            | `6379` | `amestris-redis`    | TaskQueue, verificación diaria y notificaciones async. |

## 🧪 Entidades principales

| Entidad           | Propósito                                                                   |
| ----------------- | --------------------------------------------------------------------------- |
| **User**          | Credenciales, hash de contraseña y rol (`alchemist` o `supervisor`).        |
| **Alchemist**     | Perfil extendido (especialidad, rango) asociado a un usuario.               |
| **Mission**       | Tareas asignadas; almacenan estado y fechas límite.                         |
| **Material**      | Inventario, cantidades y umbrales para alertas.                             |
| **Transmutation** | Solicitudes con `status` y `result` actualizados por el worker.             |
| **Audit**         | Bitácora de eventos: inicio de sesión, CRUD, errores async, verificaciones. |

## 🔐 Autenticación y flujo por roles
- Autenticación vía `POST /auth/login` → token JWT firmado con `JWT_SECRET`. El payload incluye `role`, `email` y `name`.
- Frontend guarda el token en `localStorage` mediante `AuthContext`, lo envía en `Authorization: Bearer <token>` y protege rutas con `AppRouter`.
- **Alquimista**: Dashboard personal, consulta misiones, materiales, solicita transmutaciones (procesadas en background) y sigue su estado por SSE.
- **Supervisor**: Todo lo anterior + CRUD completo de misiones, materiales y alquimistas, listado de auditorías en vivo y acceso a métricas globales.

## 📡 Procesamiento asíncrono y SSE
- El `TaskQueue` (backend/server/task_queue.go) consume trabajos desde Redis (`process_transmutation`, `register_audit`, `daily_verification`).
- El worker actualiza estados en BD, registra auditorías y publica eventos via `EventHub.Broadcast`.
- El endpoint `GET /events?token=<JWT>` entrega SSE. El frontend abre un `EventSource` y reacciona ante `transmutation.updated`, `audit.created`, `mission_*`, etc.

## 🗂️ Directorio detallado
```
backend/
  api/             # DTOs y validaciones
  config/          # config.json + loader
  logger/          # Logger personalizado + middleware
  models/          # Definición GORM
  repository/      # Capa de persistencia
  server/
    handlers/      # Auth, Missions, Materials, etc.
    middleware.go  # AuthMiddleware, manejo de errores
    task_queue.go  # Worker Redis, verificación diaria
    events.go      # EventHub SSE
frontend/
  src/
    components/    # Navbar, Footer, tablas reutilizables
    context/       # AuthProvider
    pages/         # Login, Register, Dashboard, CRUDs
    router/        # AppRouter con rutas protegidas
    services/      # apiFetch, manejo de token
```

## ⚙️ Puesta en marcha rápida (Docker Compose)
```bash
docker compose up --build
```
El primer arranque descarga dependencias, corre migraciones y aplica `init.sql`. Accesos:
- API: http://localhost:8000
- Frontend: http://localhost:3000

### Variables principales
Las variables ya están definidas en `docker-compose.yml`, pero puedes sobreescribirlas con un `.env`:
- `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `REDIS_HOST`, `REDIS_PORT`
- `JWT_SECRET`
- `INIT_SQL_PATH`

### Datos de prueba
```bash
docker compose exec -T postgres psql -U postgres -d backend-avanzada-1 < init.sql
```
Usuarios iniciales: `selene@alquimia.test` / `alquimia123` (supervisor) y `aurelia@alquimia.test` / `alquimia123`.

## 🔁 Ejecución sin Docker (opcional)
1. **Backend**
   ```bash
   cd backend
   export POSTGRES_HOST=localhost POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres POSTGRES_DB=backend-avanzada-1
   export REDIS_HOST=localhost REDIS_PORT=6379 JWT_SECRET=supersecreto123
   go mod download
   go run ./main.go
   ```
2. **Frontend**
   ```bash
   cd frontend
   npm install
   VITE_API_URL=http://localhost:8000 npm run dev
   ```
3. **Infraestructura**
   - PostgreSQL 15 y Redis 7 corriendo localmente.
   - Ejecuta `psql -f init.sql` tras crear la BD.

## 🧪 Pruebas
- Backend: `docker compose exec backend go test ./...`
- Frontend: `docker compose exec frontend npm run lint`

## 📬 Postman
1. Abrir Postman → Import → seleccionar [`docs/postman_collection.json`](./docs/postman_collection.json).
2. Configurar la variable `token` con el JWT obtenido en `/auth/login`.
3. Ejecutar los request; muchos endpoints requieren rol `supervisor`.

## 🆘 Depuración rápida
- Ver logs: `docker compose logs -f backend` o `frontend`.
- Redis no disponible → verifica puerto `6379` o reinicia con `docker compose restart redis`.
- SSE sin eventos → asegúrate de enviar el token en la query (`/events?token=`) y que el backend esté firmado con el mismo `JWT_SECRET`.

## 📦 Servicios adicionales
- **Verificación diaria**: `TaskQueue.ScheduleDailyVerification()` emite auditorías `daily_verification` si detecta misiones abiertas, transmutaciones pendientes o materiales críticos.
- **Auditorías automáticas**: cada CRUD, login y error del worker encola `register_audit` para mantener la trazabilidad exigida en el curso.

Con esta guía puedes clonar, ejecutar y validar el proyecto completo desde cero.