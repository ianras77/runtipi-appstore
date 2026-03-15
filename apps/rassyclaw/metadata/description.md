# RassyClaw

RassyClaw is an OpenClaw-based coding agent package for RunTipi.

This RunTipi package deploys RassyClaw with:

- Ollama as the default local provider for chat + embeddings
- LocalAI configured as an OpenAI-compatible secondary provider
- Persistent agent state storage and docker-socket access for tool execution

Set the Ollama and LocalAI URLs in app settings so RassyClaw can discover and use your models.
