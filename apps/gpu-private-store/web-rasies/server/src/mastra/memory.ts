import fs from "node:fs/promises";
import path from "node:path";
import type { ModelMessage } from "ai";

type ThreadRecord = { messages: ModelMessage[]; updatedAt: string };

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120) || "anonymous";
}

export async function loadThreadMemory(root: string, threadId: string) {
  try {
    const raw = await fs.readFile(path.join(root, `${safeId(threadId)}.json`), "utf8");
    const record = JSON.parse(raw) as ThreadRecord;
    return Array.isArray(record.messages) ? record.messages.slice(-12) : [];
  } catch {
    return [];
  }
}

export async function saveThreadMemory(root: string, threadId: string, messages: ModelMessage[]) {
  try {
    await fs.mkdir(root, { recursive: true });
    const record: ThreadRecord = { messages: messages.slice(-12), updatedAt: new Date().toISOString() };
    await fs.writeFile(path.join(root, `${safeId(threadId)}.json`), JSON.stringify(record), { mode: 0o600 });
  } catch {
    // Memory is best effort and must never take down House Chat.
  }
}
