# Letta Server

Letta provides a stateful agent API with persistent memory and conversations. This package runs the official `letta/letta` Docker image and stores its embedded PostgreSQL data and local MemFS repositories in Runtipi app storage.

## First start

Open the app URL and use the generated Letta Server Password from the Runtipi app configuration when prompted. The API is available under `/v1`; the OpenAPI page is at `/docs`. Configure a model provider in the server or supply an OpenAI API key at install time. When creating agents on this Docker server, specify an embedding model as required by Letta's Docker deployment guide.

## Upstream support status

The upstream repository now directs active development to Letta Code. Letta's documentation still describes this API server image, but states that the Docker image is no longer an actively maintained or supported product surface. This app packages that documented server image for users who need its API; verify upstream image updates before production use and keep backups of the persistent data.
