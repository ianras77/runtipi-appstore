# Open Terminal

Open Terminal is the terminal execution backend for Open WebUI.

## What this app does

- Exposes an API endpoint Open WebUI can call for command execution, file operations, and terminal sessions.
- Persists working files under `${APP_DATA_DIR}/data/home` (mounted to `/home/user` in the container).
- Secures the endpoint with `OPEN_TERMINAL_API_KEY`.

## Connect it to your existing Open WebUI

1. Install/start this app in Runtipi.
2. Copy the generated `OPEN_TERMINAL_API_KEY` from this app settings.
3. In Open WebUI admin settings, configure Open Terminal URL and API key.
4. Use the Open Terminal app URL from Runtipi (or an internal URL reachable from Open WebUI).

## Security notes

- Treat this app as high-trust. It can execute shell commands in its container.
- Avoid exposing it publicly unless required.
- If you mount Docker socket manually, the container can control the Docker host.
