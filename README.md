# Plataforma Alquímica

Sistema fullstack para la gestión de materiales, misiones, transmutaciones y auditorías de la orden alquímica. El backend está desarrollado en Go con PostgreSQL y Redis, y el frontend en React + Vite servido con Nginx. Todo el entorno se orquesta con Docker Compose.

## 🚀 Puesta en marcha rápida

```bash
docker compose up --build
```

> El primer arranque descarga imágenes, instala dependencias e inicializa la base de datos. La API queda disponible en `http://localhost:8000` y el panel web en `http://localhost:3000`.

### Variables y servicios principales

| Servicio    | Puerto local | Notas |
|-------------|--------------|-------|
| Backend Go  | `8000`       | Expuesto desde `backend/server` con Gorilla Mux. |
| Frontend    | `3000`       | Aplicación React + Vite, sirve el panel por roles. |
| PostgreSQL  | `5432`       | Base de datos `backend-avanzada-1`. |
| Redis       | `6379`       | Cola de tareas para el worker asíncrono. |

El backend requiere las variables (ya definidas en `docker-compose.yml`):

- `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `REDIS_HOST`, `REDIS_PORT`
- `JWT_SECRET`

## 👤 Credenciales iniciales

Tras aplicar migraciones, ejecute el script [`init.sql`](./init.sql) contra la base de datos para cargar datos base:

```bash
docker compose exec -T postgres psql -U postgres -d backend-avanzada-1 < init.sql
```

Credenciales listas para usar:

| Rol         | Email                     | Contraseña     |
|-------------|---------------------------|----------------|
| Supervisor  | `selene@alquimia.test`    | `alquimia123`  |
| Alquimista  | `aurelia@alquimia.test`   | `alquimia123`  |
| Alquimista  | `benedict@alquimia.test`  | `alquimia123`  |

Puedes registrar nuevos usuarios desde `/auth/register` en el frontend o consumiendo el endpoint `POST /auth/register`.

## 🧪 Colección Postman

La colección con todos los endpoints se encuentra en [`docs/postman_collection.json`](./docs/postman_collection.json). Importa el archivo en Postman e indica el valor de la variable `token` con el JWT devuelto por el login.

## 📚 Flujo por roles

### Alquimista
- Inicia sesión y accede al dashboard con resumen de misiones, materiales y transmutaciones.
- Consulta su inventario y puede crear nuevas transmutaciones, que se envían a la cola para procesarse en background.
- Visualiza el estado de las misiones asignadas y material disponible.

### Supervisor
- Posee el mismo panel con datos adicionales: lista completa de alquimistas y auditorías en tiempo real.
- Crea/edita misiones, materiales y transmutaciones. Gestiona auditorías manuales cuando sea necesario.
- Supervisa el estado de procesamiento y recibe alertas automáticas del sistema.

## ⚙️ Procesamiento asíncrono

El backend incluye un `TaskQueue` respaldado por Redis:

1. **Procesamiento de transmutaciones** (`process_transmutation`):
   - El handler crea la transmutación en estado `PENDING`, descuenta el stock de material y encola la tarea.
   - El worker marca la transmutación como `PROCESSING`, simula el cálculo y finaliza en `COMPLETED` o `FAILED`.
   - Cada actualización se emite mediante SSE y registra una auditoría `transmutation_processed`.

2. **Auditorías diferidas** (`register_audit`):
   - Los handlers delegan en la cola para no bloquear la respuesta HTTP.
   - El worker persiste la auditoría y emite el evento SSE `audit.created`.

3. **Verificación diaria** (`daily_verification`):
   - Un ticker (`time.NewTicker`) dispara el job cada 24 horas (configurable en `config/config.json`).
   - Evalúa misiones abiertas demasiado tiempo, transmutaciones pendientes y materiales con stock crítico.
   - Genera una auditoría `daily_verification` con el resumen encontrado.

## 🔐 Auditorías automáticas

El sistema genera registros en los siguientes momentos:

- Registro y login de usuarios (`USER_REGISTERED`, `USER_LOGIN`).
- Creación, actualización y cierre de misiones.
- Creación y procesamiento de transmutaciones.
- Errores internos del worker o de encolamiento (`worker_error`, `async_error`).

Todos los eventos se transmiten en vivo a través de `GET /events?token=<JWT>`.

## 🧭 Navegación del frontend

- **Dashboard**: tarjetas con métricas clave, gráfico de misiones por estado, barras de transmutaciones y materiales destacados.
- **Misiones**: CRUD para supervisores, visualización para alquimistas.
- **Materiales**: catálogo y gestión de existencias.
- **Transmutaciones**: formulario para solicitar transmutaciones y feed en tiempo real de su estado.
- **Auditorías**: bitácora solo para supervisores, actualizada por SSE.

## 🧰 Scripts útiles

```bash
# Ejecutar pruebas de backend
docker compose exec backend go test ./...

# Construir el frontend (dentro del contenedor)
docker compose exec frontend npm run build
```

## 🗺️ Estructura relevante

```
backend/
  server/        -> Handlers HTTP, middleware, cola asíncrona y SSE
  repository/    -> Capa de acceso a datos con GORM
  models/        -> Modelos de dominio
frontend/
  src/
    pages/       -> Vistas por rol (Dashboard, Missions, Materials, etc.)
    context/     -> Manejo del JWT y sesión de usuario
    services/    -> Cliente API con manejo de errores y token
```

¡Listo! Con el stack levantado podrás probar el flujo completo de registro, asignación de misiones, creación de transmutaciones y monitoreo por auditorías en tiempo real.