import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { Env } from "../../env.js";
import { createSignupInvite, fetchSignupServices } from "../../signup.js";

export function createSignupTools(env: Env) {
  const getSignupServices = createTool({
    id: "get-signup-services",
    description: "List the real media services currently available for family signup.",
    inputSchema: z.object({}),
    execute: async () => fetchSignupServices(env),
  });

  const createMediaInvite = createTool({
    id: "create-media-invite",
    description: "Create a Wizarr invitation only after the user explicitly approves this exact action.",
    inputSchema: z.object({ approved: z.literal(true), serviceIds: z.array(z.number().int().positive()).max(20) }),
    execute: async ({ approved, serviceIds }) => {
      if (approved !== true) throw new Error("Explicit approval is required before creating an invitation.");
      return createSignupInvite(env, serviceIds);
    },
  });

  return { getSignupServices, createMediaInvite };
}
