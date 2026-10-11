# Deployment

The production image contains the built Vite SPA and Fastify server and runs as a non-root user on Node 22. Mastra runs in the same Fastify process; no second Mastra server, Postgres, Redis, Qdrant, Cheshire Cat, or app-local Ollama is required.

Runtipi persists `/data/mastra` through the app-data mount. `/healthz` is liveness only; `/api/house/health` reports intelligence-provider health and must not control container restart policy.
