# Rasies Mastra architecture

Mastra runs inside the existing Fastify process. Fastify remains the HTTP/security boundary and the deterministic Rasies modules remain the source of truth for media, signup, status, search, stories, thoughts, music, and Minecraft. House agents and typed tools sit behind `/api/house/*`; the existing `/api/cat/*` contract remains a compatibility surface during cutover.

Production model traffic is RassyMind-only through the OpenAI-compatible provider configured by `RASSYMIND_*`. The portal does not call Ollama or external commercial models. `/data/mastra` is reserved for future local LibSQL state and is persisted by Runtipi.

House Chat must fail independently of `/healthz`; a RassyMind outage is a degraded intelligence state, not a portal liveness failure.
