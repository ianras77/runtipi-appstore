import { createOpenAI } from "@ai-sdk/openai";
import { getRassyMindConfig, type Env } from "../../env.js";

export function rassymindProvider(env: Env) {
  const config = getRassyMindConfig(env);
  return createOpenAI({
    apiKey: config.apiKey || "rassymind-local",
    baseURL: config.baseUrl.replace(/\/$/, "") + "/v1",
    name: "rassymind",
  });
}

export function rassymindModel(env: Env, alias = "rassy-fast") {
  return rassymindProvider(env).chat(alias);
}
