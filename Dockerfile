# Production image: builds the site and runs `next start` as an unprivileged user.
# Used by docker-compose.yml (one server: app + PostgreSQL + HTTPS) and by any
# host that deploys a Dockerfile.
FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* values are written into the pages at build time, so they are
# build arguments (docker-compose.yml passes them from .env).
ARG NEXT_PUBLIC_BRAND_NAME
ARG NEXT_PUBLIC_SUPPORT_EMAIL
ARG NEXT_PUBLIC_SUPPORT_PHONE
ARG NEXT_PUBLIC_SUPPORT_WHATSAPP
ARG NEXT_PUBLIC_LEGAL_ENTITY
ARG NEXT_PUBLIC_REGISTERED_ADDRESS
ARG NEXT_PUBLIC_GSTIN
ARG NEXT_PUBLIC_GRIEVANCE_OFFICER_NAME
ARG NEXT_PUBLIC_GRIEVANCE_EMAIL
ARG NEXT_PUBLIC_GRIEVANCE_PHONE
ARG NEXT_PUBLIC_ENABLED_LOCALES
ENV NEXT_PUBLIC_BRAND_NAME=${NEXT_PUBLIC_BRAND_NAME} \
    NEXT_PUBLIC_SUPPORT_EMAIL=${NEXT_PUBLIC_SUPPORT_EMAIL} \
    NEXT_PUBLIC_SUPPORT_PHONE=${NEXT_PUBLIC_SUPPORT_PHONE} \
    NEXT_PUBLIC_SUPPORT_WHATSAPP=${NEXT_PUBLIC_SUPPORT_WHATSAPP} \
    NEXT_PUBLIC_LEGAL_ENTITY=${NEXT_PUBLIC_LEGAL_ENTITY} \
    NEXT_PUBLIC_REGISTERED_ADDRESS=${NEXT_PUBLIC_REGISTERED_ADDRESS} \
    NEXT_PUBLIC_GSTIN=${NEXT_PUBLIC_GSTIN} \
    NEXT_PUBLIC_GRIEVANCE_OFFICER_NAME=${NEXT_PUBLIC_GRIEVANCE_OFFICER_NAME} \
    NEXT_PUBLIC_GRIEVANCE_EMAIL=${NEXT_PUBLIC_GRIEVANCE_EMAIL} \
    NEXT_PUBLIC_GRIEVANCE_PHONE=${NEXT_PUBLIC_GRIEVANCE_PHONE} \
    NEXT_PUBLIC_ENABLED_LOCALES=${NEXT_PUBLIC_ENABLED_LOCALES}
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    STORAGE_DIR=/data/uploads \
    PGLITE_DIR=/data/pglite
COPY --from=build --chown=node:node /app ./
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
EXPOSE 3000
VOLUME /data
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node_modules/.bin/next", "start"]
