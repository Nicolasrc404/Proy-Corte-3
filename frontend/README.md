# Frontend · React + Vite

## 🎯 Objetivo
SPA que consume la API Go para ofrecer paneles y CRUDs diferenciados por rol. Construida con React 19, Vite, Tailwind 4, Context API y React Router 7. Escucha eventos SSE para reflejar cambios en vivo sin refrescar la página.

## 🏗️ Arquitectura
- `src/main.tsx`: monta `App` dentro de `AuthProvider` y `BrowserRouter`.
- `src/context/AuthContext.tsx`: guarda token JWT y usuario en `localStorage`, expone `login/logout` y se usa en toda la app.
- `src/router/AppRouter.tsx`: protege rutas según autenticación y rol; usuarios sin token son redirigidos a `/login`.
- `src/services/api.ts`: helper `apiFetch` para peticiones `fetch` tipadas, manejo de JSON y errores.
- `src/pages`: vistas principales (Login, Register, Dashboard, Alchemists, Missions, Materials, Transmutations, Audits).
- `src/components`: `Navbar`, `Footer`, `TableList` reutilizable.

```
src/
  App.tsx
  main.tsx
  config.ts          # VITE_API_URL fallback a http://localhost:8000
  context/AuthContext.tsx
  router/AppRouter.tsx
  services/api.ts
  pages/
```

## 🔐 Rutas protegidas y manejo de JWT
1. `AuthContext` lee token y usuario desde `localStorage` al cargar.
2. `login()` guarda ambos valores, `logout()` los elimina.
3. `AppRouter` verifica `token`:
   - Sin token → solo `/login` y `/register`.
   - Con token → `/dashboard`, `/missions`, `/materials`, `/transmutations`.
   - Rol `supervisor` → acceso adicional a `/alchemists` y `/audits`.
4. `apiFetch` agrega `Authorization: Bearer <token>` cuando está disponible.

## 📃 Páginas principales
| Ruta              | Rol        | Descripción                                                                                                    |
| ----------------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| `/login`          | Público    | Autenticación con email y contraseña.                                                                          |
| `/register`       | Público    | Alta de usuario/alquimista (usa `/auth/register`).                                                             |
| `/dashboard`      | Ambos      | KPI, gráficos y tarjetas con acceso rápido. Escucha SSE para refrescar misiones, transmutaciones y auditorías. |
| `/missions`       | Ambos      | Listado; supervisores pueden crear, editar, cerrar y eliminar.                                                 |
| `/materials`      | Ambos      | Inventario y CRUD según permisos.                                                                              |
| `/transmutations` | Ambos      | Formulario para solicitar nuevas transmutaciones; muestra estado en vivo.                                      |
| `/alchemists`     | Supervisor | Gestión de perfiles de alquimistas.                                                                            |
| `/audits`         | Supervisor | Bitácora en tiempo real de eventos críticos.                                                                   |

## 🔴 Eventos en tiempo real
El Dashboard abre un `EventSource` hacia `GET /events?token=<JWT>`:
- `transmutation.updated` → actualiza cards y tablas.
- `audit.created` → refresca la bitácora del supervisor.
- `mission_*` → sincroniza estado de misiones.
Cualquier SSE no reconocido se ignora de forma segura.

## 🐳 Ejecución con Docker
```bash
docker compose up --build frontend
```
El contenedor instala dependencias y levanta Vite en modo desarrollo sobre `3000`, proxied por Nginx si se personaliza el Dockerfile.

## 🖥️ Ejecución local sin Docker
```bash
cd frontend
npm install
npm run dev
```
La aplicación estará en http://localhost:5173 por defecto. Configura la variable `VITE_API_URL` si el backend no corre en `http://localhost:8000`:
```bash
VITE_API_URL=http://localhost:8000 npm run dev
```

## 🏗️ Construcción y despliegue
```bash
npm run build   # genera dist/
npm run preview # sirve el build para pruebas locales
```
El Dockerfile existente compila y expone la carpeta `dist` mediante Nginx.

## ✅ Pruebas y calidad
```bash
npm run lint
```
ESLint (configurado en `eslint.config.js`) revisa hooks, reglas recomendadas y compatibilidad con React 19.

## 🔗 Integración con la API
- Todas las peticiones se centralizan en `apiFetch` y usan `API_URL` de `src/config.ts`.
- El token se agrega automáticamente cuando existe.
- Los mensajes de error del backend se muestran en los formularios mediante `try/catch`.

## 🧾 Postman y pruebas end-to-end
1. Importa [`../docs/postman_collection.json`](../docs/postman_collection.json) para probar la API manualmente.
2. Obtén un JWT válido y colócalo en la variable de entorno `token` de Postman.
3. Usa las mismas credenciales en el frontend para validar el flujo completo.

## 🆘 Tips de depuración
| Problema                | Acción                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `NetworkError` en fetch | Verifica `VITE_API_URL` y que el backend acepte CORS (habilitado por defecto).          |
| SSE desconectado        | Revisa en el dashboard la consola y confirma que `/events?token=` reciba respuesta 200. |
| Token expirado/inválido | Ejecuta `logout` (Navbar) para limpiar `localStorage` y volver a iniciar sesión.        |

Con esta guía puedes instalar, ejecutar y extender la interfaz cumpliendo los requisitos académicos.