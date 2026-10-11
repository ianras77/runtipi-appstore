# RassyCodex LLM Capability Reset

## Goal

Reset `web-rasies` onto the current authenticated RassyCodex gateway while preserving the existing `/api/cat/*` API used by the frontend.

## Scope

- Keep `/api/cat/chat`, `/api/cat/health`, `/api/cat/spotlight`, and the `/api/cat/*` passthrough routes stable.
- Make the upstream contract explicitly RassyCodex-backed.
- Use the container-facing gateway `http://host.docker.internal:8844` and OpenAI-compatible `/v1/chat/completions`.
- Send the configured RassyCodex bearer token.
- Keep `rassy-smart` as the requested model so current gateway routing and fallbacks remain authoritative.
- Preserve attachments, spotlight generation, timeout retry behavior, and existing frontend behavior.

## Configuration

The app will introduce `RASSYCODEX_BASE_URL`, `RASSYCODEX_CHAT_PATH`, `RASSYCODEX_MODEL`, `RASSYCODEX_API_KEY`, and `RASSYCODEX_TIMEOUT_MS` as the canonical settings. Existing `CAT_*` names remain accepted as compatibility fallbacks so existing deployed environment files do not break during rollout. Compose will render the RassyCodex names by default and continue exposing the legacy names only where the code needs compatibility.

## Request and health behavior

- Chat and spotlight requests target the canonical RassyCodex chat endpoint.
- Requests include `Authorization: Bearer <RASSYCODEX_API_KEY>` when configured.
- The health probe targets the gateway `/health` endpoint and reports RassyCodex terminology in logs and errors.
- The frontend-facing route names and response shape remain unchanged.
- Empty upstream responses and non-2xx responses continue to produce the existing safe proxy errors.

## Verification

- Add regression coverage for canonical RassyCodex configuration, authenticated chat requests, model selection, and health targeting.
- Run the server test suite and compose rendering checks.
- Probe the live gateway health and authenticated chat endpoint where runtime access is available.
- Confirm no frontend route changes are required.
