# OpenClaw

OpenClaw is an open-source coding agent you can run in your own infrastructure.

This RunTipi package deploys OpenClaw with:

- Ollama as the default local provider for chat + embeddings
- LocalAI configured as an OpenAI-compatible secondary provider
- Persistent OpenClaw state storage and docker-socket access for tool execution

Set the Ollama and LocalAI URLs in app settings so OpenClaw can discover and use your models.
