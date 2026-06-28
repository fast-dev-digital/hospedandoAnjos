# =============================================================================
# backend/Dockerfile — API Express (Node + TypeScript).
# IMPORTANTE: o build CONTEXT precisa ser a pasta `hospedandoAnjos/` (pai), porque
# o tsconfig do backend usa rootDir ".." e compila ../shared junto. No Coolify:
#   Base Directory: hospedandoAnjos
#   Dockerfile Location: backend/Dockerfile
# =============================================================================

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app

# manifests primeiro (cache de layer)
COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && npm install

# código: backend + shared (o tsc do backend referencia ../shared)
COPY backend ./backend
COPY shared ./shared

RUN cd backend && npm run build
# poda devDependencies para a imagem final
RUN cd backend && npm prune --omit=dev

# ---- runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/package.json ./package.json

EXPOSE 3000
# o build emite dist/backend/src/server.js (por causa do rootDir "..")
CMD ["node", "dist/backend/src/server.js"]
