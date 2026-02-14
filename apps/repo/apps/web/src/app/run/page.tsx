"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function RunPage() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  const pace = useMemo(() => {
    return Number((6 + (elapsed % 20) * 0.03).toFixed(2));
  }, [elapsed]);

  const handleSave = async () => {
    setStatus("Saving run...");
    try {
      const run = await api.createRun({
        started_at: new Date().toISOString(),
        duration_seconds: elapsed,
        avg_pace: pace
      });
      setStatus(`Run saved #${run.id}`);
    } catch (err) {
      setStatus(`Save failed: ${(err as Error).message}`);
    }
  };

  return (
    <main className="arcade-panel p-8">
      <h2 className="text-2xl font-semibold">Run Console</h2>
      <p className="mt-2 text-white/70">Start a timer, simulate pace, and save a run.</p>

      <div className="mt-6 grid gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/60">Elapsed</span>
          <span className="font-arcade text-lg text-arcade-yellow">{formatTime(elapsed)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/60">Avg Pace</span>
          <span className="text-lg text-arcade-cyan">{pace} min/km</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="arcade-button" onClick={() => setRunning((prev) => !prev)}>
          {running ? "Stop" : "Start"}
        </button>
        <button
          className="rounded-lg border border-white/20 px-4 py-2"
          onClick={() => setElapsed(0)}
        >
          Reset
        </button>
        <button
          className="rounded-lg border border-white/20 px-4 py-2"
          onClick={handleSave}
        >
          Save Run
        </button>
      </div>

      {status && <p className="mt-4 text-sm text-arcade-cyan">{status}</p>}
    </main>
  );
}
