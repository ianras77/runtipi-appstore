import type { Env } from "../../env.js";
import { searchWeb } from "../../search.js";

export type ResearchEvidence = { title: string; url: string; snippet: string; engine?: string };

export async function runResearchWorkflow(env: Env, question: string): Promise<{ question: string; evidence: ResearchEvidence[] }> {
  const normalized = question.trim().slice(0, 500);
  if (!normalized) return { question: "", evidence: [] };
  const queries = Array.from(new Set([normalized, `${normalized} latest`, `${normalized} official source`])).slice(0, 3);
  const responses = await Promise.allSettled(queries.map((q) => searchWeb(env, { q })));
  const evidence: ResearchEvidence[] = [];
  const seen = new Set<string>();
  for (const response of responses) {
    if (response.status !== "fulfilled") continue;
    const body = response.value.body as { results?: Array<Record<string, unknown>> };
    for (const item of body.results ?? []) {
      const url = typeof item.url === "string" ? item.url : "";
      if (!url || seen.has(url)) continue;
      seen.add(url);
      evidence.push({ title: typeof item.title === "string" ? item.title.slice(0, 200) : url, url, snippet: typeof item.content === "string" ? item.content.slice(0, 600) : "", engine: typeof item.engine === "string" ? item.engine : undefined });
      if (evidence.length >= 8) return { question: normalized, evidence };
    }
  }
  return { question: normalized, evidence };
}
