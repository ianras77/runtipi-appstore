# House memory

Anonymous memory is thread-scoped. The server creates a random thread identity when one is not supplied and never uses an IP address as durable memory. Only the latest bounded conversation messages are retained, under the configured Mastra data directory with restrictive file permissions.

Memory is best-effort and can be unavailable without affecting chat or the public portal. Durable family memory is not enabled in this release.
