## A real-time dashboard for global events

World Monitor brings news, geopolitics, markets, and infrastructure signals together in an interactive dashboard.

This Runtipi entry uses the official multi-architecture web image. The browser app is served from your Runtipi host; API requests go to the configured API upstream, which defaults to `https://api.worldmonitor.app`.

This recipe runs the web frontend. It does not deploy the project's separate full self-hosting stack, which includes its own API services, Redis, relay, and seeders. See the [official self-hosting guide](https://github.com/koala73/worldmonitor/blob/main/SELF_HOSTING.md) for that deployment model.
