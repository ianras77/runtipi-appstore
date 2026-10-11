# Mastra migration

House Chat now uses an in-process Mastra agent inside Fastify, with RassyMind behind the normalized model gateway and existing deterministic Rasies modules behind typed tools. The canonical House endpoints are `/api/house/chat`, `/api/house/chat/stream`, `/api/house/health`, and `/api/house/spotlight`.

The `/api/cat/*` endpoints remain temporary compatibility endpoints for existing clients. New frontend code uses House endpoints. Cheshire Cat runtime/container artifacts are removed from the Runtipi release; compatibility names are retained only where needed to avoid breaking old clients and configuration during rollout.
