# Jogmania Monorepo + Runtipi App

This workspace contains:

- `jogmania/` Runtipi app definition (dynamic compose v2)
- `repo/` Monorepo (Next.js web, Expo iOS, shared packages)
- `api/` FastAPI backend with Postgres, Redis, MinIO

The stack is designed to be an LLM-friendly shell with strict, predictable structure and typed contracts.

## Quickstart Local

1. Copy `.env.example` to `.env` and adjust values.
2. Start the dev stack:

```bash
docker compose -f docker-compose.dev.yml up
```

3. Web: http://localhost:3000
4. API: http://localhost:8000/docs
5. Expo: http://localhost:19000 (use Expo Go or a simulator)

### Dev scripts

From `repo/`:

```bash
pnpm install
pnpm dev
pnpm gen:client
pnpm lint
pnpm test
```

## Quickstart Runtipi

1. Copy `repo/` to `${APP_DATA_DIR}/repo` and `api/` to `${APP_DATA_DIR}/api`.
2. Configure the Jogmania app in Runtipi (DB, MinIO, JWT, LLM settings).
3. Restart the app.
4. Open the web UI on port 3000.

## LLM Endpoint (OpenAI-Compatible)

Set these environment variables in `.env` or the Runtipi form:

- `LLM_BASE_URL` (default `http://localhost:8080/v1`)
- `LLM_API_KEY`
- `LLM_MODEL` (default `gpt-4o-mini`)

The API calls the OpenAI-compatible endpoint for `/ai/quest` and `/ai/narrate`. If the endpoint is unreachable, the API returns deterministic offline text for demos.

## OpenAPI + TypeScript Client

- FastAPI generates OpenAPI at `/openapi.json`.
- Run `pnpm gen:client` to regenerate `repo/packages/api-client/src/types.ts`.
- Web and iOS import the shared client from `@jogmania/api-client`.

## CI Notes

Recommended checks:

- `pnpm lint` (web + shared)
- `pnpm test` (API + web)
- `pnpm gen:client` (ensure generated types are in sync)
- `ruff` and `black` for Python

## Troubleshooting Checklist

- API fails to start: verify `POSTGRES_*`, `REDIS_URL`, and `MINIO_*` env values.
- Web cannot reach API: confirm `NEXT_PUBLIC_API_BASE_URL` (local) or `jogmania-api` (Runtipi).
- iOS cannot reach API: set `EXPO_PUBLIC_API_BASE_URL` to your host LAN IP.
- AI endpoints return offline text: check `LLM_BASE_URL` connectivity and `LLM_API_KEY`.
- Exports fail: verify MinIO credentials, bucket access, and `MINIO_ENDPOINT`.
