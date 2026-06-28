# =============================================================================
# frontend/Dockerfile — SPA Vite/React servida por Nginx.
# Build CONTEXT = pasta `hospedandoAnjos/` (pai), porque o Vite/tsconfig do front
# referencia ../shared (checkout-contract). No Coolify:
#   Base Directory: hospedandoAnjos
#   Dockerfile Location: frontend/Dockerfile
#
# VITE_API_BASE_URL é embutido NO BUILD (Vite). Passe via Build Arg no Coolify:
#   VITE_API_BASE_URL=https://api-anjos.fastdevdigital.com.br
# Sem ele, o front cai no MOCK e o cancelamento vira falso-positivo.
# =============================================================================

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN cd frontend && npm install

COPY frontend ./frontend
COPY shared ./shared

RUN cd frontend && npm run build

# ---- runtime (Nginx) ----
FROM nginx:alpine AS runtime
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
