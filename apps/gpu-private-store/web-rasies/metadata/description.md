# Web Rasies

A welcoming self-hosted family site for the Rasies, built to feel more like a front porch than a dashboard.

## What It Includes

- A home page centered on family life, self-hosting, and the rooms that matter most.
- Cozy routes for bedtime stories, thoughts, and the listening room.
- Quiet Search and House Chat for calmer searching, planning, and everyday help.
- Status and Minecraft map panels so the site feels alive and easy to check.

## Live Data

- Stories are mounted from the family podcast shelf.
- Music is mounted from the home music library.
- Thoughts are read from the `web-rasies` media folder when markdown posts are present.

## Notes

- The live app now serves the cleaned-up family-focused UI and hardened backend routes.
- Missing asset requests return real `404` responses instead of the SPA shell.
- Thought media serving now blocks markdown, dotfiles, and JSON files from leaking.
