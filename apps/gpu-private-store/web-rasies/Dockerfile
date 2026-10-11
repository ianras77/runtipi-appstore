# ---------- build web ----------
FROM node:22-alpine AS webbuild
WORKDIR /app/web
ARG VITE_UMAMI_SCRIPT_URL="https://umami.rasies.com/script.js"
ARG VITE_UMAMI_WEBSITE_ID=""
ARG VITE_UMAMI_DOMAINS=""
ENV VITE_UMAMI_SCRIPT_URL=${VITE_UMAMI_SCRIPT_URL}
ENV VITE_UMAMI_WEBSITE_ID=${VITE_UMAMI_WEBSITE_ID}
ENV VITE_UMAMI_DOMAINS=${VITE_UMAMI_DOMAINS}
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ---------- build server ----------
FROM node:22-alpine AS serverbuild
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./
RUN npm run build && npm prune --omit=dev

# ---------- runtime ----------
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup -S app && adduser -S app -G app

# Copy compiled server
COPY --from=serverbuild --chown=app:app /app/server/dist ./server/dist
COPY --from=serverbuild --chown=app:app /app/server/package.json ./server/package.json
COPY --from=serverbuild --chown=app:app /app/server/node_modules ./server/node_modules

# Copy built web dist
COPY --from=webbuild --chown=app:app /app/web/dist ./web/dist

EXPOSE 3000
USER app
CMD ["node", "server/dist/index.js"]
