# RassyClaw

RassyClaw is an OpenClaw-based coding agent package for RunTipi.

This RunTipi package deploys RassyClaw with:

- Ollama chat models routed to `192.168.1.162:11435`
- Ollama embeddings and rerank traffic routed to `192.168.1.162:11437`
- `ollama/gpt-oss:20b` as the default model and `ollama/qwen2.5-coder:7b` as the fallback
- Persistent agent state storage and docker-socket access for tool execution

Adjust the Ollama URLs in app settings if your stack moves to a different host or ports.
