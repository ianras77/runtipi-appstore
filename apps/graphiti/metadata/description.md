# Graphiti

Graphiti builds temporal knowledge graphs for AI applications. This Runtipi app runs the upstream Graphiti FastAPI reference service with Neo4j and keeps graph data on persistent app storage.

## Configuration

- Enter an OpenAI API key during installation. The packaged server uses OpenAI for its default language model and embeddings.
- Connect clients to the API at `http://<runtipi-host>:<app-port>`; the interactive API documentation is at `/docs`.
- Neo4j is private to the app's Docker network. Its database and logs are stored under the app data directory.

## Network security

The upstream reference API does not provide authentication or authorization. Runtipi does not expose this app through a public Traefik route. Treat the allocated host port as private too: firewall it from untrusted networks and only allow trusted clients to reach it. For a production deployment, put an authenticated service or access-controlled reverse proxy in front of Graphiti.

Back up the app's Neo4j data directory before upgrades or host maintenance.
