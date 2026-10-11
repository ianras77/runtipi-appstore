# Rasies Mastra migration baseline

Captured 2026-09-05 from the Runtipi package checkout.

## Source reconciliation

- Runtipi package: `/data/runtipi/runtipi-appstore/gpu-private-store/apps/web-rasies`
- Parent repository: `/data/runtipi/runtipi-appstore/gpu-private-store`
- Package checkout currently resolves to parent commit `ce448927` (`docs(web-astro): record live chart qualification`); the parent repository contains unrelated dirty sibling applications and those changes are out of scope.
- Separate canonical candidate inspected: `/data/apps/2-Migrated/web-rasies`, commit `e25c914` (`Clarify Rasies signup destinations`).
- The two trees are not equivalent. The Runtipi copy contains deployed-only behavior that must be retained: direct RassyMind environment/configuration, authenticated OpenAI-compatible requests and health probing, bounded multi-attachment handling, Runtipi packaging tests, and later family/status fixes. The separate tree contains source-only material such as GitHub workflow files, `ops/`, Capacitor configuration, and a different compose/package shape.
- No blind copy was performed. The Runtipi implementation is the working baseline until the semantic reconciliation is completed in the canonical `ianras77/web-rasies` repository.

## Current product and routes

The package contains the React/Vite portal and one Fastify server. Existing server modules cover chat/spotlight/health compatibility, SearXNG search, service status, signup/Wizarr, bedtime stories/RSS, thoughts, music, Minecraft/BlueMap, and Mr Rassy sounds. The SPA preserves the family pages for `/`, `/apps`, `/music-library`, `/thoughts`, `/bedtime-stories`, and detail routes.

Compatibility chat routes currently include `/api/cat/chat`, `/api/cat/spotlight`, and `/api/cat/health`; the liveness routes are `/health`, `/healthz`, and `/version`.

## Current AI and Cheshire state

The deployed app already prefers `RASSYMIND_BASE_URL`, `RASSYMIND_CHAT_PATH`, `RASSYMIND_MODEL`, `RASSYMIND_API_KEY`, and `RASSYMIND_TIMEOUT_MS`, with legacy `CAT_*` values as compatibility fallbacks. The default RassyMind gateway is the host gateway (`http://host.docker.internal:8844`) and the default model alias is `rassy-fast`.

The compose package still defines `rasies-cheshire-cat`, mounts Cat data, and invokes `bootstrap_cat_ollama.py`. This is a second intelligence runtime and is a migration-removal target, but its persisted data must be inspected and a rollback path retained before removal.

## Runtipi packaging

The package has one main `rasies-portal` image, read-only media mounts for stories, thoughts, sounds, and music, the host gateway mapping, and an app healthcheck against `/healthz`. `config.json` exposes the RassyMind URL/key and currently reports package version `1.0.9`.

The final release must add persistent `/data/mastra` storage without writing to read-only media mounts and must preserve the existing Runtipi project and port contract.

## Baseline qualification

At capture time, `server/node_modules` and `web/node_modules` were absent, so tests/builds have not yet been run in this checkout. The available scripts are:

- server: `npm run lint`, `npm run test:ci`, `npm run build`
- web: `npm run lint`, `npm run test:ci`, `npm run build`
- package: `docker compose config`

These must be run after dependencies are installed and recorded separately from migration failures.

## Reconciliation decisions

1. Preserve the Runtipi package's direct RassyMind and attachment/health hardening.
2. Keep `/api/cat/*` temporarily as compatibility aliases, but make House/Mastra the single implementation behind them.
3. Keep deterministic Rasies modules as the business-logic owners; Mastra tools will call those functions directly.
4. Keep the portal in one production image and run Mastra in the Fastify process.
5. Do not add cloud model providers, raw Ollama calls, a second Mastra server, or a new database service.
