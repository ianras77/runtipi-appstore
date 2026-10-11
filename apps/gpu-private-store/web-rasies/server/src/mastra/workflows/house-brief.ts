import type { Env } from "../../env.js";
import { getHouseStatus } from "../../status.js";
import { getThoughtsForHouse } from "../../thoughts.js";
import { getStoriesForHouse } from "../../stories.js";

export type HouseBrief = { mood: string; mission: string; surprise: string; prompts: string[] };

export async function runHouseBriefWorkflow(env: Env): Promise<HouseBrief> {
  const [status, thoughts, stories] = await Promise.allSettled([getHouseStatus(env), getThoughtsForHouse(env), getStoriesForHouse(env)]);
  const up = status.status === "fulfilled" ? status.value.items.filter((item) => item.state === "up").length : 0;
  const latestThought = thoughts.status === "fulfilled" ? thoughts.value[0]?.title : undefined;
  const latestStory = stories.status === "fulfilled" ? stories.value.books?.[0]?.title : undefined;
  return {
    mood: up > 0 ? "The house is open and ready." : "The house is taking a quiet moment.",
    mission: latestThought ? `Have a look at “${latestThought}”.` : "Pick one small thing that would make today easier.",
    surprise: latestStory ? `A bedtime story is waiting: “${latestStory}”.` : "A small, calm plan often beats a heroic one.",
    prompts: ["Help me sign in", "What can my family account do?", "Find something in the archive", "Write a family note"],
  };
}
