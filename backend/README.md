# Backend · API Go

## 🧾 Resumen
Servicio HTTP escrito en Go que centraliza autenticación, CRUD de entidades alquímicas, auditorías y trabajo en background. Se construye sobre Gorilla Mux, GORM y JWT; expone SSE y se integra con PostgreSQL y Redis.

## 🧱 Arquitectura interna
- `config/`: lee `config.json` (puerto, tipo de base de datos, parámetros de verificación async).
- `models/`: structs GORM (`User`, `Alchemist`, `Mission`, `Material`, `Transmutation`, `Audit`).
- `repository/`: capa de persistencia con métodos typed (`FindByID`, `Save`, `Delete`).
- `server/handlers`: controladores REST por recurso + validaciones.
- `server/router.go`: registra rutas y aplica `AuthMiddleware`.
- `server/task_queue.go`: `TaskQueue` respaldada por Redis, worker, verificación diaria y broadcasting.
- `server/events.go`: `EventHub` para SSE.
- `logger/`: middleware HTTP + helper estructurado.

```
main.go
config/
models/
repository/
server/
  handlers/
  middleware.go
  router.go
  task_queue.go
  events.go
```

## ⚙️ Configuración y variables
`config/config.json` define `address`, `database`, `redis_address`, `verification_interval_minutes`, etc. Variables de entorno necesarias:

| Variable                                                             | Descripción                                           |
| -------------------------------------------------------------------- | ----------------------------------------------------- |
| `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credenciales PostgreSQL usadas por GORM.              |
| `REDIS_HOST`, `REDIS_PORT`                                           | Ubicación del broker Redis.                           |
| `JWT_SECRET`                                                         | Clave para firmar y validar tokens.                   |
| `INIT_SQL_PATH`                                                      | Ruta al `init.sql` opcional para semillas al iniciar. |

## 🚀 Ejecución con Docker
Desde la raíz:
```bash
docker compose up --build backend
```
La imagen copia el código, ejecuta `go mod download` y corre `main.go`. El contenedor escucha en `0.0.0.0:8000`.

## 🔁 Ejecución local sin Docker
```bash
cd backend
go mod download
export POSTGRES_HOST=localhost POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres POSTGRES_DB=backend-avanzada-1
export REDIS_HOST=localhost REDIS_PORT=6379 JWT_SECRET=supersecreto123
go run ./main.go
```
Asegura que PostgreSQL 15 y Redis 7 estén en marcha. Corre `psql -f ../init.sql backend-avanzada-1` para semillas.

## 🛣️ Router, handlers y middlewares
`server/router.go` registra los endpoints y aplica middlewares:
- `AuthMiddleware` valida tokens y roles (`alchemist`, `supervisor`).
- `HandleError` centraliza respuestas JSON.
- `RequestLogger` (logger/middleware) captura método, ruta y latencia.

Principales rutas:
- `/auth/register`, `/auth/login` (AuthHandler) → generan JWT (`AuthClaims`).
- `/missions`, `/materials`, `/transmutations`, `/alchemists`, `/audits` → CRUD completos y filtros por rol.
- `/events` → SSE autenticado por token.

Cada handler recibe:
- Repositorio correspondiente.
- `TaskQueue` para encolar auditorías (`register_audit`) y trabajos (`process_transmutation`).
- `currentUserExtractor` para conocer el usuario autenticado.

## 📦 TaskQueue, Redis y worker
`TaskQueue` vive en `server/task_queue.go`:
- Se conecta al broker definido en `config.redis_address`.
- Exponer métodos `EnqueueTransmutationProcessing`, `EnqueueAudit`, `ScheduleDailyVerification`.
- El worker (`go q.worker()`) hace `BRPOP` sobre Redis y despacha:
  - `process_transmutation`: cambia el estado, simula procesamiento, guarda resultado y emite `transmutation.updated`.
  - `register_audit`: persiste auditorías y emite `audit.created`.
  - `daily_verification`: consulta misiones abiertas, transmutaciones pendientes y materiales escasos; registra `daily_verification`.
- `recordWorkerError` guarda auditorías `worker_error` si algo falla.

## 🔌 PostgreSQL y resolución de problemas
- El DSN se arma en `initDB()` usando las variables de entorno.
- GORM corre `AutoMigrate` para mantener el esquema.
- Si la conexión falla: verifica credenciales, firewall y que `sslmode=disable` sea aceptado.
- `INIT_SQL_PATH` permite aplicar seeds adicionales desde el backend. Si no se encuentra, se registra un warning y continúa.
- Logs útiles: `docker compose logs backend` (busca "unable to read seed file" o "async queue is not available").

## 🔐 JWT y SSE
- El `AuthHandler` firma tokens con `jwtSecret` e incluye `role`, `email`, `name`, `id`.
- `AuthMiddleware` verifica la firma y rechaza si el rol requerido no coincide.
- `/events` exige `token` en la query string, valida el JWT y usa `EventHub` para transmitir JSON `{type, payload, timestamp}`.

## 🧪 Pruebas
```bash
# Dentro del contenedor
docker compose exec backend go test ./...

# Local
cd backend && go test ./...
```

## 🛠️ Depuración común
| Problema                           | Posible causa                             | Solución                                                                  |
| ---------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| `async queue has not been started` | Redis inaccesible o no levantado.         | Verifica `REDIS_HOST:REDIS_PORT`, ejecuta `docker compose restart redis`. |
| `JWT_SECRET is not set`            | Variable faltante.                        | Exportar antes de ejecutar o definirla en Compose.                        |
| Migraciones lentas o bloqueadas    | PostgreSQL sin permisos o DB inexistente. | Confirma credenciales y crea `backend-avanzada-1`.                        |

## 📬 Colección Postman
Importa [`../docs/postman_collection.json`](../docs/postman_collection.json). Configura variables:
- `baseUrl = http://localhost:8000`
- `token = <JWT>` obtenido con `/auth/login`.

## 🔎 Auditorías y trazabilidad
- Cada operación CRUD en handlers encola `register_audit` con acción (`mission_created`, `material_deleted`, etc.).
- Logins y registros producen `USER_LOGIN` y `USER_REGISTERED`.
- Worker y `asyncErrorReporter` registran `worker_error` y `async_error`.
- Supervisores consumen `/audits` y SSE para monitoreo en vivo.

Con esta guía puedes modificar, extender y depurar la API manteniendo los lineamientos académicos.