## SearXNG Toolstack

API-first SearXNG profile for agent/tool workloads where reliability and response-time consistency are more important than broad UI search coverage.

### What Is Tuned
- Local health endpoint check (`/healthz`) for stable readiness.
- Granian multi-worker, multi-thread runtime options.
- Lower upstream timeouts to avoid long hangs.
- Problematic engines disabled by default (`duckduckgo`, `brave`, etc.) to reduce spikes.

### Best For
- Open WebUI tool calls
- Cheshire Cat integrations
- Programmatic `/search?format=json` workflows
