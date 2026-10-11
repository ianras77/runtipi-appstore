import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { Env } from "../../env.js";
import { getStoriesForHouse } from "../../stories.js";
import { getThoughtsForHouse } from "../../thoughts.js";
import { getMusicForHouse } from "../../musicLibrary.js";

export function createArchiveTool(env: Env) {
  return createTool({
    id: "search-house-archive",
    description: "Search real Rasies thoughts, bedtime stories, or music metadata.",
    inputSchema: z.object({ type: z.enum(["thought", "story", "music"]), query: z.string().max(120) }),
    execute: async ({ type, query }) => {
      const q = query.toLowerCase().trim();
      if (type === "thought") {
        const thoughts = await getThoughtsForHouse(env);
        return thoughts.filter((item) => JSON.stringify(item).toLowerCase().includes(q)).slice(0, 8);
      }
      if (type === "story") {
        const stories = await getStoriesForHouse(env);
        return stories.books?.filter((item) => JSON.stringify(item).toLowerCase().includes(q)).slice(0, 8) ?? [];
      }
      const music = await getMusicForHouse(env);
      return music?.tracks?.filter((item) => JSON.stringify(item).toLowerCase().includes(q)).slice(0, 12) ?? [];
    },
  });
}
