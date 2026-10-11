# Web Family RassyCodex Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align every `web-*` app in the custom Runtipi store with the authenticated live RassyCodex chat, embedding, and retrieval stack, then publish versioned packages.

**Architecture:** Preserve each app’s existing client protocol, but point its chat, embedding, and rerank surfaces at the container-facing RassyCodex gateway on port 8844. API keys will be placed only in local Runtipi environment layers and `/data/apps/rassycodex/.env`; no secret values enter Git. Every package receives a patch version and `tipi_version` increment so Runtipi can discover the update.

**Scope:** `web-astro`, `web-bat`, `web-crackstack`, `web-jogmania`, `web-lickingvape`, `web-rasies`, `web-rassyapp`, `web-rassyonline`, `web-rassys`, `web-totallyrighteoustales`, and `web-usmender`, plus installed copies and generated runtime configuration where present.

**Verification:** Scan tracked and hidden files for retired endpoints, render all source Compose files, compare installed/generated Compose and app env layers, run app-local tests where available, probe RassyCodex `/health`, `/ready`, authenticated `/v1/models`, chat, embeddings, and rerank, then commit and push the appstore.
