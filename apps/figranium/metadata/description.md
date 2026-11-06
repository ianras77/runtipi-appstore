# Figranium

Figranium is a self-hosted visual browser-automation platform. Create workflows in its UI, call them through its API, schedule them, and review saved screenshots and recordings.

## First start

Open the app URL and complete the first-run setup in the UI. The main web application is proxied through Runtipi. The upstream Compose example also publishes its VNC/noVNC browser-view port; this package keeps that port private because it is not needed for ordinary workflow creation and may expose browser session details.

Application data and captures persist in the Runtipi app data directory. The telemetry option is disabled by default. Review Figranium's license and current release notes before production use.
