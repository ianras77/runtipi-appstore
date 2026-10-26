## Clean podcast feeds for playback

MinusPod transcribes podcast episodes, finds ad segments, and serves recut episodes through replacement RSS feeds. It includes a review UI and can learn recurring sponsor patterns from corrections.

This recipe uses the project's CPU-only image, which supports AMD64 and ARM64 hosts. The default transcription setting is the small `tiny` CPU model; you can change transcription and add provider credentials in the install fields or MinusPod settings. Processing still needs an LLM provider and Whisper backend. The app is configured to require authentication and to block public feed requests from triggering paid processing.

Set up the first app password in the web UI. The generated master passphrase encrypts saved provider keys and downloaded database backups. Keep it for as long as you need to restore those encrypted backups.
