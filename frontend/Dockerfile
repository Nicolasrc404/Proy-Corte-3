# ------------------------------------------------------------
# 1) Build de la app React con Vite
# ------------------------------------------------------------
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# ------------------------------------------------------------
# 2) NGINX para servir los archivos estáticos
# ------------------------------------------------------------
FROM nginx:alpine

# Copiar archivo de configuración nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar build
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
