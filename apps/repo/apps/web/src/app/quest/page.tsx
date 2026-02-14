"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function QuestPage() {
  const [prompt, setPrompt] = useState("Give me a 20-minute neon night run quest.");
  const [quest, setQuest] = useState<string | null>(null);
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleQuest = async () => {
    setStatus("Requesting quest...");
    try {
      const response = await api.aiQuest({ prompt });
      setQuest(response.quest_text);
      setMeta(response.metadata);
      setStatus("Quest ready.");
    } catch (err) {
      setStatus(`Quest failed: ${(err as Error).message}`);
    }
  };

  return (
    <main className="arcade-panel p-8">
      <h2 className="text-2xl font-semibold">Quest Terminal</h2>
      <p className="mt-2 text-white/70">Generate a quest and narration from the AI provider.</p>

      <div className="mt-6 grid gap-3">
        <textarea
          className="min-h-[120px] rounded-lg border border-white/20 bg-white/10 p-3"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />
        <button className="arcade-button" onClick={handleQuest}>
          Generate Quest
        </button>
      </div>

      {status && <p className="mt-4 text-sm text-arcade-cyan">{status}</p>}

      {quest && (
        <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-6">
          <h3 className="font-arcade text-xs text-arcade-yellow">Quest</h3>
          <p className="mt-3 text-lg">{quest}</p>
          {meta && (
            <pre className="mt-4 text-xs text-white/60">
              {JSON.stringify(meta, null, 2)}
            </pre>
          )}
        </div>
      )}
    </main>
  );
}
