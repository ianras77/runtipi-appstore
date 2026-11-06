# SUB/WAVE

SUB/WAVE runs a shared internet radio station from a Navidrome music library. This package includes the player and admin UI, AI DJ controller, Icecast/Liquidsoap broadcast, audio-analysis service, and the upstream's restricted Docker socket proxy for container statistics.

## First start

Open the app URL and complete the onboarding wizard. It collects the Navidrome server and Subsonic credentials, model provider, and DJ settings. The admin username and generated password are set in the Runtipi app configuration. The optional heavy voice-generation sidecar is not included; the default Piper voice path remains available.

The app state, station configuration, generated audio, and logs are persisted in Runtipi app data. Audio streams are served through the same app URL at `/stream.mp3` and supported alternate formats.

The acoustic analyzer uses a multi-architecture image and can consume substantial CPU and memory during analysis. Keep a backup of the `state` directory, which contains station data and generated content.
