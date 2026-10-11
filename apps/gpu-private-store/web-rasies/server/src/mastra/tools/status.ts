import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { Env } from "../../env.js";
import { getHouseStatus } from "../../status.js";

export function createHouseStatusTool(env: Env) {
  return createTool({
    id: "get-house-status",
    description: "Check current Rasies service health before making availability claims.",
    inputSchema: z.object({ service: z.string().max(80).optional() }),
    execute: async ({ service }) => {
      const result = await getHouseStatus(env);
      if (!service?.trim()) return result.items;
      const q = service.toLowerCase();
      return result.items.filter((item) => `${item.key} ${item.label}`.toLowerCase().includes(q));
    },
  });
}
