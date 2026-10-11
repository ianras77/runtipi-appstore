# RassyCodex LLM Capability Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `web-rasies` use the current authenticated RassyCodex gateway internally while preserving the existing `/api/cat/*` frontend API.

**Architecture:** Canonical RassyCodex environment variables will feed the existing proxy routes. Legacy `CAT_*` environment variables will be accepted as fallback input during deployment migration. The upstream request format remains OpenAI-compatible and the gateway remains responsible for model routing and fallback behavior.

**Tech Stack:** TypeScript, Fastify, Zod, Undici, Vitest, Docker Compose.

---

### Task 1: Add canonical RassyCodex environment configuration

**Files:**
- Modify: `server/src/env.ts`
- Modify: `server/src/cat.ts`
- Modify: `server/src/status.ts`
- Modify: `docker-compose.yml`
- Test: `server/src/cat.test.ts`

- [x] **Step 1: Write the failing regression test**

Add a test environment using `RASSYCODEX_BASE_URL`, `RASSYCODEX_CHAT_PATH`, `RASSYCODEX_MODEL`, `RASSYCODEX_API_KEY`, and `RASSYCODEX_TIMEOUT_MS`; assert that chat posts to the canonical endpoint with the bearer token and `rassy-smart` model, and that health targets the gateway `/health` route.

- [x] **Step 2: Run the focused test and verify it fails**

Run: `npm run test:ci -- src/cat.test.ts`

Expected: FAIL because the current proxy reads only `CAT_*` fields and treats the gateway as a generic/legacy upstream.

- [x] **Step 3: Implement canonical settings with legacy fallback**

Extend `Env` with canonical RassyCodex fields and make `loadEnv()` resolve each canonical value from `RASSYCODEX_*`, then legacy `CAT_*`, then the current default. Replace `cat.ts` upstream reads with the canonical fields while retaining `/api/cat/*` route names. Update health and pass-through headers/errors to use RassyCodex configuration.

- [x] **Step 4: Update compose defaults**

Render `RASSYCODEX_BASE_URL=http://host.docker.internal:8844`, `RASSYCODEX_CHAT_PATH=/v1/chat/completions`, `RASSYCODEX_MODEL=rassy-smart`, `RASSYCODEX_API_KEY`, and `RASSYCODEX_TIMEOUT_MS` in `docker-compose.yml`. Preserve `CAT_*` fallback variables only for old deployed environments that have not migrated yet.

- [x] **Step 5: Run focused tests and type checks**

Run: `npm run test:ci -- src/cat.test.ts && npm run build`

Expected: focused proxy tests pass and TypeScript exits with code 0.

### Task 2: Verify the complete app contract

**Files:**
- Modify: `server/src/cat.test.ts`
- Modify: `server/src/status.test.ts` if canonical settings affect status fixtures

- [x] **Step 1: Run the complete server test suite**

Run: `npm run test:ci`

Expected: all server tests pass with no unhandled errors.

- [x] **Step 2: Run lint and formatting checks**

Run: `npm run lint && npm run format:check`

Expected: both commands exit 0.

- [x] **Step 3: Render and inspect compose configuration**

Run: `docker compose --env-file /data/runtipi/app-data/gpu-private-store/web-rasies/app.env -f docker-compose.yml config`

Expected: the rendered portal service contains the canonical RassyCodex endpoint and `/v1/chat/completions` path.

- [x] **Step 4: Probe the live RassyCodex gateway**

Run: `curl -fsS http://127.0.0.1:8844/health` and `curl -fsS http://127.0.0.1:8844/ready`

Expected: the gateway reports `status: ok` and `ready: true`.

### Task 3: Commit and publish

**Files:**
- Modify: all implementation files from Tasks 1–2

- [x] **Step 1: Review the final diff**

Run: `git diff --check && git status --short && git diff --stat`

Expected: only the RassyCodex reset, tests, compose, and approved design/plan docs are changed.

- [ ] **Step 2: Commit the implementation**

Run: `git add docs/superpowers server/src/env.ts server/src/cat.ts server/src/status.ts server/src/cat.test.ts docker-compose.yml && git commit -m "feat(web-rasies): reset llm proxy on rassycodex"`

Expected: a new commit is created on the current branch.

- [ ] **Step 3: Push the branch**

Run: `git push origin main`

Expected: the commit is accepted by the configured GitHub remote.
