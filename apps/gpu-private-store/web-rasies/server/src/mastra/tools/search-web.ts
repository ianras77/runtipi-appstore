import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { Env } from "../../env.js";
import { searchWeb } from "../../search.js";

export function createSearchWebTool(env: Env) {
  return createTool({
    id: "search-web",
    description: "Search the configured SearXNG instance for current web evidence. Use only when web search is appropriate.",
    inputSchema: z.object({ query: z.string().min(2).max(500), category: z.string().max(80).optional() }),
    execute: async ({ query, category }) => {
      const result = await searchWeb(env, { q: query, categories: category });
      const body = result.body as { results?: Array<Record<string, unknown>> };
      return { statusCode: result.statusCode, results: (body.results ?? []).slice(0, 8).map((item) => ({ title: item.title, url: item.url, content: item.content, engine: item.engine })) };
    },
  });
}
