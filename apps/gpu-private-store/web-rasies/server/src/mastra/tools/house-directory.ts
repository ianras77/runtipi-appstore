import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { Env } from "../../env.js";

export function createHouseDirectoryTool(env: Env) {
  return createTool({
    id: "get-house-directory",
    description: "Find the authoritative Rasies family service URL and purpose.",
    inputSchema: z.object({ query: z.string().max(200).optional() }),
    execute: async (context) => {
      const entries = [
        ["app library", env.HEIMDALL_URL, "family app directory"],
        ["search", env.SEARXNG_BASE_URL, "web search"],
        ["signup", env.SIGNUP_URL, "family access and media invitations"],
        ["Plex", env.PLEX_URL, "media"],
        ["photos", env.PHOTOS_URL, "family photos"],
        ["big files", env.SEND_URL, "send large files"],
        ["draw", env.DRAW_URL, "collaborative drawing"],
        ["Minecraft", `https://${env.MC_TROUP_SERVER_HOST}`, "Minecraft server and map"],
      ];
      const query = context.query?.toLowerCase().trim();
      return (query ? entries.filter((entry) => entry.join(" ").toLowerCase().includes(query)) : entries)
        .map(([name, url, purpose]) => ({ name, url, purpose }));
    },
  });
}
