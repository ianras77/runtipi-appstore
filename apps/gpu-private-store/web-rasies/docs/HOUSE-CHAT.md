# House Chat

House Chat is the family-safe concierge. `POST /api/house/chat` accepts bounded messages and returns a stable `{ runId, threadId, text, sources }` response. `POST /api/house/chat/stream` emits `message_start`, `text_delta`, `message_end`, or `error` SSE events.

The initial typed tool is the authoritative house directory. More tools are added by calling existing service functions directly; tools must not call the portal over localhost or expose secrets. Media invitations remain explicit approval-gated writes.
