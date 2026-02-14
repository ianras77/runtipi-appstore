# Jogmania

Jogmania is a retro-arcade running companion with a FastAPI backend, Next.js web app, Expo iOS app, and shared types.

## Runtipi setup

1. Copy the monorepo folder `repo` and the `api` folder into your app data directory: `${APP_DATA_DIR}/repo` and `${APP_DATA_DIR}/api`.
2. Restart the app in Runtipi.
3. Open the web UI on port 3000.

## Notes

- The API exposes `/health`, `/auth/*`, `/runs`, `/ai/quest`, and `/ai/narrate`.
- Configure the LLM endpoint using `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL`.
