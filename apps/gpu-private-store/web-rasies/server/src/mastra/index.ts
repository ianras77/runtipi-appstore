import { Agent } from "@mastra/core/agent";
import type { Env } from "../env.js";
import { HOUSE_CONSTITUTION } from "./policy.js";
import { rassymindModel } from "./models/rassymind.js";
import { createHouseDirectoryTool } from "./tools/house-directory.js";
import { createArchiveTool } from "./tools/archive.js";
import { createHouseStatusTool } from "./tools/status.js";
import { createSignupTools } from "./tools/signup.js";
import { createSearchWebTool } from "./tools/search-web.js";
import { createSpecialistAgents } from "./agents/specialists.js";

export function createHouseAgent(env: Env) {
  const signupTools = createSignupTools(env);
  return new Agent({
    id: "house-agent",
    name: "House Chat",
    instructions: HOUSE_CONSTITUTION,
    model: rassymindModel(env),
    tools: { houseDirectory: createHouseDirectoryTool(env), searchHouseArchive: createArchiveTool(env), getHouseStatus: createHouseStatusTool(env), searchWeb: createSearchWebTool(env), ...signupTools },
  });
}

export function createMastraAgents(env: Env) {
  return { houseAgent: createHouseAgent(env), ...createSpecialistAgents(env) };
}

export type HouseAgent = ReturnType<typeof createHouseAgent>;
