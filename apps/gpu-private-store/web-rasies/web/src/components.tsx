import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BookOpen,
  Copy,
  ExternalLink,
  FileText,
  Headphones,
  Loader2,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { trackUsage } from "./analytics";
import {
  KONAMI_SEQUENCE,
  isTypingTarget,
  normalizeSecretKey,
} from "./easterEggs";

type SafeStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type ServiceLink = {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  helperPrompt?: string;
  badge?: string;
  tone?: "default" | "live";
  note?: string;
};

type MoveDrawer = {
  title: string;
  summary: string;
  links: ServiceLink[];
};

type SearchHit = {
  title: string;
  url: string;
  snippet: string;
  engine?: string;
};

type CatPromptEventDetail = {
  prompt?: string;
};

type SearchQueryEventDetail = {
  query?: string;
};

type ChatRole = "user" | "assistant";

type ChatAttachment = {
  id: string;
  name: string;
  size: number;
  type?: string;
  content?: string;
  truncated?: boolean;
  previewable?: boolean;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  attachments?: ChatAttachment[];
};

type HealthState = "checking" | "online" | "degraded" | "offline";

type CatApiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type CatApiFile = {
  name: string;
  size: number;
  type?: string;
  content?: string;
};

type AboutConfig = {
  name: string;
  tagline: string;
  bio: string;
  highlights: string[];
};

type PortalStatusItem = {
  key: string;
  label: string;
  url: string;
  state: "up" | "warn" | "down";
  statusCode?: number;
  latencyMs?: number;
  detail?: string;
};

type PortalStatusResponse = {
  checkedAt?: string;
  items?: PortalStatusItem[];
};

type SignupInviteStatus = "pending" | "used" | "expired";

type SignupService = {
  id: number;
  name: string;
  type: string;
  url: string;
  verified: boolean;
  allowDownloads: boolean;
  allowLiveTv: boolean;
  allowMobileUploads: boolean;
};

type SpotlightPayload = {
  mood: string;
  mission: string;
  surprise: string;
  prompts: string[];
};

const CHAT_STARTERS = [
  "Turn tonight’s chores, dinner, and downtime into a calm little plan.",
  "Help me explain our self-hosted family site to a relative in plain language.",
  "What should we back up every week so family memories stay safe?",
  "Plan a cozy Rasies night with one practical task, one meal, and one fun thing.",
  "Give me three small ideas that would make this family site feel even more like home.",
  "Help me sort a messy to-do list into what matters tonight and what can wait.",
  "Make a simple weekend reset routine for the house and the home server.",
  "Draft a warm note I can send to the family without making it sound stiff.",
];

const BIRTHDAY_UNLOCK_SEQUENCE = [...KONAMI_SEQUENCE, "select", "start"];

const BIRTHDAY_ARCADE_BUTTONS = [
  { label: "Left", value: "ArrowLeft" },
  { label: "B", value: "b" },
  { label: "Up", value: "ArrowUp" },
  { label: "Select", value: "select" },
  { label: "Right", value: "ArrowRight" },
  { label: "Down", value: "ArrowDown" },
  { label: "A", value: "a" },
  { label: "START", value: "start" },
];

const CHAT_MODES = [
  {
    label: "Checklist",
    instruction:
      "Turn this into a short checklist with plain language and practical steps.",
  },
  {
    label: "Explain simply",
    instruction:
      "Explain this in plain language for a non-technical family member.",
  },
  {
    label: "Plan it",
    instruction:
      "Turn this into a step-by-step plan with the next best action first.",
  },
  {
    label: "Write a message",
    instruction: "Draft a short, warm message that I can send to the family.",
  },
  {
    label: "Compare options",
    instruction:
      "Compare the best options clearly, call out tradeoffs, and end with a recommendation.",
  },
];

const CHAT_SYSTEM_PROMPT =
  "You are House Chat, the friendly assistant on the Rasies family site. Help with everyday questions, planning, writing, research prep, and gentle guidance around the family's self-hosted tools. Keep replies concise, practical, warm, and clear.";

const DEFAULT_SPOTLIGHT: SpotlightPayload = {
  mood: "The house is open, the lights are on, and House Chat is ready to help.",
  mission:
    "Pick one thing that would make today feel easier and let House Chat help you do it cleanly.",
  surprise:
    "Try one useful question, one fun question, or one small self-hosting idea you have been meaning to chase.",
  prompts: [
    "Help me plan the rest of today without overcomplicating it.",
    "Tell me one surprising thing worth sharing at dinner.",
    "Draft a short note I can send to the family tonight.",
    "Give me one small idea that would make this site feel even more like ours.",
  ],
};

const QUICK_COMMAND = {
  label: "/untangle-tonight",
  prompt:
    "I have family stuff, house stuff, and one little home-lab thing all pulling at me tonight. Turn that chaos into a calm three-step plan, make it feel achievable, and make me smile once.",
};

const MAX_STORED_CHAT_MESSAGES = 24;
const MAX_CHAT_CONTEXT_MESSAGES = 12;
const MAX_CHAT_UPLOAD_FILES = 4;
const MAX_CHAT_UPLOAD_CHARS = 8000;
const READABLE_CHAT_FILE_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".json",
  ".log",
  ".yaml",
  ".yml",
  ".xml",
  ".html",
  ".css",
  ".js",
  ".ts",
  ".tsx",
]);
const STATUS_POLL_INTERVAL_MS = 1000 * 60 * 2;
const CHAT_HEALTH_POLL_INTERVAL_MS = 1000 * 60 * 2;
const SPOTLIGHT_POLL_INTERVAL_MS = 1000 * 60 * 6;

const LANGUAGE_OPTIONS = [
  { value: "all", label: "Auto language" },
  { value: "en-US", label: "English" },
  { value: "es-US", label: "Spanish" },
];

function getSafeStorage(): SafeStorage | null {
  if (typeof window === "undefined") return null;
  try {
    const storage = window.localStorage;
    const testKey = "__rasies_storage_test__";
    storage.setItem(testKey, "ok");
    storage.removeItem(testKey);
    return storage;
  } catch {
    return null;
  }
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function createId(prefix: string) {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}

function isExternalLink(href: string) {
  return /^https?:\/\//i.test(href);
}

function openChatWithPrompt(prompt: string) {
  if (typeof window === "undefined") return;
  const normalized = prompt.trim();
  if (!normalized) return;
  window.dispatchEvent(
    new CustomEvent<CatPromptEventDetail>("rasies:cat-prompt", {
      detail: { prompt: normalized },
    }),
  );
  if (window.location.hash !== "#chat") {
    window.location.hash = "chat";
  }
}

function runSearchFromChat(query: string) {
  if (typeof window === "undefined") return;
  const normalized = query.trim();
  if (!normalized) return;
  window.dispatchEvent(
    new CustomEvent<SearchQueryEventDetail>("rasies:search-query", {
      detail: { query: normalized },
    }),
  );
  if (window.location.hash !== "#search") {
    window.location.hash = "search";
  }
}

function MarkdownMessage({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={
        className ? `markdown-message ${className}` : "markdown-message"
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function randomSubset(list: string[], size: number) {
  const shuffled = [...list].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, size);
}

function trimChatHistory(
  messages: ChatMessage[],
  limit = MAX_STORED_CHAT_MESSAGES,
) {
  return messages.slice(-limit);
}

function isPageVisible() {
  return (
    typeof document === "undefined" || document.visibilityState !== "hidden"
  );
}

function startVisiblePolling(run: () => void, intervalMs: number) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const tick = () => {
    if (isPageVisible()) run();
  };

  const intervalId = window.setInterval(tick, intervalMs);

  if (typeof document === "undefined") {
    return () => window.clearInterval(intervalId);
  }

  const handleVisibility = () => {
    if (isPageVisible()) run();
  };

  document.addEventListener("visibilitychange", handleVisibility);

  return () => {
    window.clearInterval(intervalId);
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}

function joinTextParts(parts: string[]) {
  const merged = parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
  return merged.length > 0 ? merged : null;
}

function extractTextFromUnknown(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (typeof item === "string") return item;
        if (!item || typeof item !== "object") return "";
        const record = item as Record<string, unknown>;
        return (
          extractTextFromUnknown(record.text) ??
          extractTextFromUnknown(record.content) ??
          extractTextFromUnknown(record.message) ??
          ""
        );
      })
      .filter((item) => item.trim().length > 0);

    return joinTextParts(parts);
  }

  if (!isRecord(value)) return null;

  for (const key of ["reply", "message", "text", "answer", "response"]) {
    const direct = extractTextFromUnknown(value[key]);
    if (direct) return direct;
  }

  const content = extractTextFromUnknown(value.content);
  if (content) return content;

  if (Array.isArray(value.choices)) {
    for (const choice of value.choices) {
      if (!isRecord(choice)) continue;

      if (isRecord(choice.message)) {
        const messageText =
          extractTextFromUnknown(choice.message.content) ??
          extractTextFromUnknown(choice.message.reasoning) ??
          extractTextFromUnknown(choice.message.text);
        if (messageText) return messageText;
      }

      const choiceText =
        extractTextFromUnknown(choice.text) ??
        extractTextFromUnknown(choice.delta) ??
        extractTextFromUnknown(choice.content);
      if (choiceText) return choiceText;
    }
  }

  return null;
}

function parseSearchHits(payload: unknown): SearchHit[] {
  let rawItems: unknown[] = [];

  if (Array.isArray(payload)) {
    rawItems = payload;
  } else if (isRecord(payload)) {
    if (Array.isArray(payload.results)) {
      rawItems = payload.results;
    } else if (Array.isArray(payload.items)) {
      rawItems = payload.items;
    }
  }

  return rawItems
    .filter(isRecord)
    .map((item) => {
      const url = typeof item.url === "string" ? item.url.trim() : "";
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const snippetRaw =
        typeof item.content === "string"
          ? item.content
          : typeof item.snippet === "string"
            ? item.snippet
            : "";
      const engine =
        typeof item.engine === "string" ? item.engine.trim() : undefined;

      return {
        url,
        title: title || url,
        snippet: snippetRaw.trim(),
        engine,
      };
    })
    .filter((item) => item.url.length > 0);
}

function parseChatReply(payload: unknown, fallbackText: string) {
  const direct = extractTextFromUnknown(payload);
  if (direct) return direct;

  const fallbackPayload = safeJsonParse(fallbackText);
  const fallback =
    extractTextFromUnknown(fallbackPayload) ?? fallbackText.trim();
  return fallback || "No response received.";
}

function extractSearchQueries(reply: string) {
  return Array.from(
    new Set(
      reply
        .split("\n")
        .map((line) => line.trim())
        .map((line) => {
          const normalized = line.replace(/^[-*]\s*/, "");
          const match =
            normalized.match(/^query\s*[:-]\s*(.+)$/i) ??
            normalized.match(/^search\s*[:-]\s*(.+)$/i);
          if (match?.[1]) return match[1].trim();
          return "";
        })
        .filter((item) => item.length > 0),
    ),
  ).slice(0, 3);
}

function readStoredMessages(
  storage: SafeStorage | null,
  key: string,
): ChatMessage[] {
  const raw = storage?.getItem(key);
  if (!raw) return [];
  const parsed = safeJsonParse(raw);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(isRecord)
    .map((item) => {
      const role =
        item.role === "assistant"
          ? "assistant"
          : item.role === "user"
            ? "user"
            : null;
      const content = typeof item.content === "string" ? item.content : "";
      const id = typeof item.id === "string" ? item.id : createId("msg");
      const attachments = normalizeStoredChatAttachments(item.attachments);
      if (!role || (!content.trim() && attachments.length === 0)) return null;
      return { id, role, content, attachments };
    })
    .filter((item): item is ChatMessage => Boolean(item))
    .slice(-MAX_STORED_CHAT_MESSAGES);
}

function toApiMessages(messages: ChatMessage[]): CatApiMessage[] {
  return [
    { role: "system", content: CHAT_SYSTEM_PROMPT },
    ...trimChatHistory(messages, MAX_CHAT_CONTEXT_MESSAGES).map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}

function normalizeStoredChatAttachments(value: unknown): ChatAttachment[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isRecord)
    .map((item) => {
      const name = typeof item.name === "string" ? item.name.trim() : "";
      const size = typeof item.size === "number" ? item.size : 0;
      const id = typeof item.id === "string" ? item.id : createId("file");
      const type = typeof item.type === "string" ? item.type : undefined;
      const truncated = item.truncated === true;
      const previewable = item.previewable === true;
      if (!name) return null;
      return { id, name, size, type, truncated, previewable };
    })
    .filter((item): item is ChatAttachment => Boolean(item))
    .slice(0, MAX_CHAT_UPLOAD_FILES);
}

function sanitizeChatAttachmentsForMessage(
  attachments: ChatAttachment[],
): ChatAttachment[] {
  return attachments.map((attachment) => ({
    id: attachment.id,
    name: attachment.name,
    size: attachment.size,
    type: attachment.type,
    truncated: attachment.truncated,
    previewable: attachment.previewable,
  }));
}

function attachmentToApiFile(attachment: ChatAttachment): CatApiFile {
  return {
    name: attachment.name,
    size: attachment.size,
    type: attachment.type,
    content: attachment.content,
  };
}

function formatChatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isReadableChatFile(file: File) {
  if (file.type.startsWith("text/")) return true;
  if (
    [
      "application/json",
      "application/xml",
      "application/x-yaml",
      "application/yaml",
    ].includes(file.type)
  ) {
    return true;
  }

  const lowerName = file.name.toLowerCase();
  return Array.from(READABLE_CHAT_FILE_EXTENSIONS).some((extension) =>
    lowerName.endsWith(extension),
  );
}

async function readChatFileText(file: File) {
  if (typeof file.text === "function") {
    return file.text();
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () =>
      reject(reader.error ?? new Error("Could not read file")),
    );
    reader.readAsText(file);
  });
}

async function fileToChatAttachment(file: File): Promise<ChatAttachment> {
  const readable = isReadableChatFile(file);
  let content: string | undefined;
  let truncated = false;

  if (readable) {
    const text = await readChatFileText(file);
    content = text.slice(0, MAX_CHAT_UPLOAD_CHARS);
    truncated = text.length > MAX_CHAT_UPLOAD_CHARS;
  }

  return {
    id: createId("file"),
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    content,
    truncated,
    previewable: readable,
  };
}

function healthLabel(state: HealthState) {
  switch (state) {
    case "online":
      return "Connected";
    case "degraded":
      return "Degraded";
    case "offline":
      return "Offline";
    case "checking":
    default:
      return "Checking";
  }
}

function formatCheckedAt(value?: string) {
  if (!value) return "Not checked yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not checked yet";
  return `Checked ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function formatLatency(value?: number) {
  if (typeof value !== "number") return "No timing";
  return `${value} ms`;
}

function formatInviteDateLabel(value: string | undefined, prefix: string) {
  if (!value) return `${prefix}.`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return `${prefix}.`;
  return `${prefix} ${date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  })}.`;
}

function formatInviteExpiry(value?: string) {
  return formatInviteDateLabel(value, "Invite expires");
}

function formatInviteMoment(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatHostLabel(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function formatInviteStatusLabel(status: SignupInviteStatus) {
  switch (status) {
    case "used":
      return "Used";
    case "expired":
      return "Expired";
    case "pending":
    default:
      return "Pending";
  }
}

function formatInviteStatusNote({
  status,
  usedBy,
  usedAt,
  expiresAt,
}: {
  status: SignupInviteStatus;
  usedBy?: string | null;
  usedAt?: string | null;
  expiresAt?: string;
}) {
  if (status === "used") {
    const usedMoment = formatInviteMoment(usedAt);
    if (usedBy && usedMoment) {
      return `Accepted by ${usedBy} on ${usedMoment}.`;
    }
    if (usedBy) {
      return `Accepted by ${usedBy}.`;
    }
    if (usedMoment) {
      return `Accepted on ${usedMoment}.`;
    }
    return "This invite has already been used.";
  }

  if (status === "expired") {
    return `${formatInviteDateLabel(expiresAt, "This invite expired")} Create a fresh one here.`;
  }

  return `Still pending. ${formatInviteExpiry(expiresAt)}`;
}

function getSignupServiceKey(service: SignupService) {
  return `${service.name} ${service.type}`.toLowerCase();
}

function getCanonicalSignupServiceTitle(value: string) {
  const key = value.trim().toLowerCase();
  if (key.includes("plex")) return "Plex";
  if (
    key.includes("music") ||
    key.includes("navidrome") ||
    key.includes("subsonic") ||
    key.includes("mstream")
  ) {
    return "Music";
  }
  if (key.includes("audio")) return "Audiobooks";
  if (key.includes("book")) return "Books";
  return value.trim() || "Media service";
}

function getSignupServicePriority(service: SignupService) {
  const key = getSignupServiceKey(service);
  if (key.includes("plex")) return 0;
  if (
    key.includes("music") ||
    key.includes("navidrome") ||
    key.includes("subsonic") ||
    key.includes("mstream")
  ) {
    return 1;
  }
  if (key.includes("audio")) return 2;
  if (key.includes("book")) return 3;
  return 4;
}

function sortSignupServices(services: SignupService[]) {
  return [...services].sort(
    (a, b) =>
      getSignupServicePriority(a) - getSignupServicePriority(b) ||
      a.name.localeCompare(b.name),
  );
}

function getSignupServiceTitle(service: SignupService) {
  return getCanonicalSignupServiceTitle(`${service.name} ${service.type}`);
}

function normalizeInviteServerNames(value: string[] | undefined) {
  return Array.from(
    new Set(
      (value ?? [])
        .map((item) => getCanonicalSignupServiceTitle(item))
        .filter(Boolean),
    ),
  );
}

function formatNaturalList(items: string[]) {
  const cleaned = Array.from(
    new Set(items.map((item) => item.trim()).filter(Boolean)),
  );

  if (cleaned.length === 0) return "the family media rooms";
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(", ")}, and ${cleaned[cleaned.length - 1]}`;
}

function getSignupServiceDescription(service: SignupService) {
  const key = getSignupServiceKey(service);
  if (key.includes("plex")) {
    return "Movies, shows, and the family watchlist through the media lane.";
  }
  if (
    key.includes("music") ||
    key.includes("navidrome") ||
    key.includes("subsonic") ||
    key.includes("mstream")
  ) {
    return "Music and albums for the family.";
  }
  if (key.includes("audio")) {
    return "Audiobooks and listening shelves for the family.";
  }
  if (key.includes("book")) {
    return "Books, comics, and reading shelves for the family.";
  }
  return "Available through the Wizarr media signup.";
}

function getSignupServiceIcon(service: SignupService) {
  const key = getSignupServiceKey(service);
  if (
    key.includes("music") ||
    key.includes("navidrome") ||
    key.includes("subsonic") ||
    key.includes("mstream")
  ) {
    return <Headphones className="h-4 w-4" />;
  }
  if (key.includes("audio")) {
    return <Headphones className="h-4 w-4" />;
  }
  if (key.includes("book")) {
    return <BookOpen className="h-4 w-4" />;
  }
  return <Sparkles className="h-4 w-4" />;
}

function statusStateLabel(state: PortalStatusItem["state"]) {
  switch (state) {
    case "up":
      return "Up";
    case "warn":
      return "Needs attention";
    case "down":
    default:
      return "Down";
  }
}

async function copyText(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    throw new Error("Clipboard copy is not available in this browser.");
  }
  await navigator.clipboard.writeText(text);
}

async function requestCatReply(
  messages: ChatMessage[],
  files: CatApiFile[] = [],
  context: { sessionId: string; threadId: string },
) {
  const res = await fetch("/api/house/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: toApiMessages(messages),
      sessionId: context.sessionId,
      threadId: context.threadId,
      source: "web",
      ...(files.length > 0 ? { files } : {}),
    }),
  });

  const raw = await res.text();
  const payload = safeJsonParse(raw);

  if (!res.ok) {
    const message =
      isRecord(payload) && typeof payload.error === "string"
        ? payload.error
        : `HTTP ${res.status}`;
    const detail =
      isRecord(payload) && typeof payload.detail === "string"
        ? payload.detail.trim()
        : "";
    throw new Error(
      `Chat failed: ${detail && detail !== message ? `${message} (${detail})` : message}`,
    );
  }

  if (res.headers.get("content-type")?.includes("text/event-stream")) {
    const chunks: string[] = [];
    for (const line of raw.split(/\r?\n/)) {
      if (!line.startsWith("data: ")) continue;
      const event = safeJsonParse(line.slice(6));
      if (isRecord(event) && typeof event.text === "string") chunks.push(event.text);
    }
    if (chunks.length > 0) return chunks.join("");
  }
  return parseChatReply(payload, raw);
}

async function fetchCatHealthState() {
  const res = await fetch("/api/house/health", { cache: "no-store" });
  const data = (await res.json().catch(() => null)) as {
    ok?: boolean;
    upstreamStatus?: number;
  } | null;

  if (res.ok && (data?.ok ?? true) && (data?.upstreamStatus ?? 200) < 500) {
    return "online" as const;
  }

  return "degraded" as const;
}

export function SmartQuickChat() {
  const isTest = import.meta.env.MODE === "test";
  const [spotlight, setSpotlight] =
    useState<SpotlightPayload>(DEFAULT_SPOTLIGHT);
  const [health, setHealth] = useState<HealthState>("checking");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [spotlightRefreshing, setSpotlightRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const loadSpotlight = useCallback(async (manual = false) => {
    if (manual) setSpotlightRefreshing(true);

    try {
      const res = await fetch("/api/house/spotlight", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const payload = (await res
        .json()
        .catch(() => null)) as Partial<SpotlightPayload> | null;
      const prompts = Array.isArray(payload?.prompts)
        ? payload.prompts
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter((item) => item.length > 0)
            .slice(0, 4)
        : DEFAULT_SPOTLIGHT.prompts;

      setSpotlight({
        mood: payload?.mood?.trim() || DEFAULT_SPOTLIGHT.mood,
        mission: payload?.mission?.trim() || DEFAULT_SPOTLIGHT.mission,
        surprise: payload?.surprise?.trim() || DEFAULT_SPOTLIGHT.surprise,
        prompts: prompts.length > 0 ? prompts : DEFAULT_SPOTLIGHT.prompts,
      });
    } catch {
      setSpotlight(DEFAULT_SPOTLIGHT);
    } finally {
      if (manual) setSpotlightRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isTest) return;

    void loadSpotlight();
    return startVisiblePolling(() => {
      void loadSpotlight();
    }, SPOTLIGHT_POLL_INTERVAL_MS);
  }, [isTest, loadSpotlight]);

  useEffect(() => {
    if (isTest) return;

    const run = async (manual = false) => {
      if (manual) setHealth("checking");
      try {
        setHealth(await fetchCatHealthState());
      } catch {
        setHealth("offline");
      }
    };

    void run(true);
    return startVisiblePolling(() => {
      void run();
    }, CHAT_HEALTH_POLL_INTERVAL_MS);
  }, [isTest]);

  async function sendQuickMessage(promptOverride?: string, isCommand = false) {
    if (busy) return;

    const prompt = (promptOverride ?? input).trim();
    if (!prompt) return;

    const nextMessages = [
      ...messages.slice(-5),
      { id: createId("quick-user"), role: "user" as const, content: prompt },
    ];
    setMessages(nextMessages);
    setBusy(true);
    setError(null);
    if (!promptOverride) setInput("");
    trackUsage("dj.send");
    if (isCommand) trackUsage("dj.prompt");

    try {
      const replyText = await requestCatReply(nextMessages, [], { sessionId: "quick-chat", threadId: "quick-chat" });
      setMessages([
        ...nextMessages,
        {
          id: createId("quick-assistant"),
          role: "assistant",
          content: replyText,
        },
      ]);
      setHealth("online");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Chat failed";
      setError(message);
      setHealth("degraded");
      setMessages([
        ...nextMessages,
        {
          id: createId("quick-assistant"),
          role: "assistant",
          content: `House Chat hit a snag for a moment. ${message}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function runQuickCommand() {
    await sendQuickMessage(QUICK_COMMAND.prompt, true);
  }

  const latestMessages = messages.slice(-4);

  return (
    <aside
      id="quick-chat"
      className="dj-booth quick-chat"
      aria-labelledby="quick-chat-heading"
    >
      <div className="dj-header">
        <div>
          <p className="hero-side-label">House Chat is awake</p>
          <h2 id="quick-chat-heading">Talk to House Chat</h2>
        </div>
        <div className="dj-tools">
          <div className="dj-health">
            <span className={`dot dot-${health}`} aria-hidden />
            <span>{healthLabel(health)}</span>
          </div>
          <button
            type="button"
            className="service-helper"
            onClick={() => void loadSpotlight(true)}
            disabled={spotlightRefreshing}
          >
            {spotlightRefreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <WandSparkles className="h-3.5 w-3.5" />
            )}
            Refresh ideas
          </button>
        </div>
      </div>

      <div className="dj-spotlight-grid" aria-label="Live House Chat spotlight">
        <div className="dj-spotlight-card">
          <span>Mood</span>
          <strong>{spotlight.mood}</strong>
        </div>
        <div className="dj-spotlight-card">
          <span>Try this</span>
          <strong>{spotlight.mission}</strong>
        </div>
        <div className="dj-spotlight-card">
          <span>For fun</span>
          <strong>{spotlight.surprise}</strong>
        </div>
      </div>

      <div className="dj-prompt-row" aria-label="Quick chat starter prompts">
        {spotlight.prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="chip chip-ghost"
            onClick={() => {
              trackUsage("dj.prompt");
              setInput(prompt);
              inputRef.current?.focus();
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="quick-command-card">
        <span className="quick-command-label">Quick prompt</span>
        <code className="quick-command-code">{QUICK_COMMAND.label}</code>
        <p>{spotlight.mission}</p>
        <div className="quick-command-meta">
          <span>{spotlight.mood}</span>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void runQuickCommand()}
            disabled={busy}
          >
            <Send className="h-4 w-4" />
            Try it
          </button>
        </div>
      </div>

      <div className="dj-transcript" aria-live="polite">
        {latestMessages.length === 0 ? (
          <div className="dj-empty">New thread</div>
        ) : (
          latestMessages.map((message) => (
            <div key={message.id} className={`dj-line dj-line-${message.role}`}>
              <span>{message.role === "assistant" ? "House Chat" : "You"}</span>
              {message.role === "assistant" ? (
                <MarkdownMessage
                  content={message.content}
                  className="dj-markdown"
                />
              ) : (
                <p>{message.content}</p>
              )}
            </div>
          ))
        )}

        {busy && (
          <div className="dj-line dj-line-assistant dj-line-loading">
            <span>House Chat</span>
            <p>
              <Loader2 className="h-4 w-4 animate-spin" /> Putting that together
            </p>
          </div>
        )}
      </div>

      {error && <div className="status-line status-error">{error}</div>}

      <form
        className="dj-compose"
        onSubmit={(event) => {
          event.preventDefault();
          void sendQuickMessage();
        }}
      >
        <label htmlFor="quick-chat-input" className="input-callout">
          <span>Quick ask</span>
          <strong>Message House Chat</strong>
        </label>
        <textarea
          id="quick-chat-input"
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type here..."
          rows={3}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void sendQuickMessage();
            }
          }}
        />
        <div className="dj-compose-actions">
          <a href="#chat" className="btn btn-ghost">
            Open full chat
          </a>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || input.trim().length === 0}
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
      </form>
    </aside>
  );
}

const CHAT_PREVIEW_CARDS = [
  {
    label: "Plan",
    description: "Untangle the evening, the week, or the next practical step.",
  },
  {
    label: "Write",
    description: "Turn a rough thought into a warm note, message, or update.",
  },
  {
    label: "Decide",
    description: "Compare options clearly and figure out what matters first.",
  },
];

export function HomeChatPreview() {
  const previewPrompts = CHAT_STARTERS.slice(0, 3);

  function jumpToChat(prompt?: string) {
    if (prompt) {
      trackUsage("chat.preview.prompt");
      openChatWithPrompt(prompt);
      return;
    }

    trackUsage("chat.preview.open");
    if (typeof window !== "undefined" && window.location.hash !== "#chat") {
      window.location.hash = "chat";
    }
  }

  return (
    <aside
      className="dj-booth home-chat-preview"
      aria-labelledby="home-chat-preview-heading"
    >
      <div>
        <p className="hero-side-label">House Chat</p>
        <h2 id="home-chat-preview-heading">House Chat</h2>
      </div>

      <div
        className="dj-spotlight-grid"
        aria-label="What House Chat helps with"
      >
        {CHAT_PREVIEW_CARDS.map((item) => (
          <div key={item.label} className="dj-spotlight-card">
            <span>{item.label}</span>
            <strong>{item.description}</strong>
          </div>
        ))}
      </div>

      <div className="dj-prompt-row" aria-label="House Chat starter prompts">
        {previewPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="chip"
            onClick={() => jumpToChat(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="home-chat-preview-actions">
        <a
          href="#chat"
          className="btn btn-primary"
          onClick={() => trackUsage("chat.preview.open")}
        >
          <Send className="h-4 w-4" />
          Open House Chat
        </a>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => jumpToChat(QUICK_COMMAND.prompt)}
        >
          <WandSparkles className="h-4 w-4" />
          Start with {QUICK_COMMAND.label}
        </button>
      </div>
    </aside>
  );
}

export function FamilyAccessPanel({
  signupUrl,
  authentikUrl,
  accountRequestUrl,
  signupEnabled,
  links,
}: {
  signupUrl: string;
  authentikUrl: string;
  accountRequestUrl: string;
  signupEnabled: boolean;
  links: ServiceLink[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [servicesLoading, setServicesLoading] = useState(signupEnabled);
  const [signupServices, setSignupServices] = useState<SignupService[]>([]);
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | undefined>();
  const [reusedInvite, setReusedInvite] = useState(false);
  const [inviteStatus, setInviteStatus] =
    useState<SignupInviteStatus>("pending");
  const [inviteUsedBy, setInviteUsedBy] = useState<string | null>(null);
  const [inviteUsedAt, setInviteUsedAt] = useState<string | null>(null);
  const [inviteServerNames, setInviteServerNames] = useState<string[]>([]);
  const [inviteRequestedServiceIds, setInviteRequestedServiceIds] = useState<
    number[] | null
  >(null);
  const [statusRefreshing, setStatusRefreshing] = useState(false);

  const sortedSignupServices = useMemo(
    () => sortSignupServices(signupServices),
    [signupServices],
  );

  const familyInviteServiceNames = useMemo(
    () => sortedSignupServices.map((service) => getSignupServiceTitle(service)),
    [sortedSignupServices],
  );

  const familyInviteServiceIds = useMemo(
    () => sortedSignupServices.map((service) => service.id),
    [sortedSignupServices],
  );

  const familyInviteLabel = formatNaturalList(
    familyInviteServiceNames.length > 0
      ? familyInviteServiceNames
      : ["Plex", "Audiobooks", "Books"],
  );

  const activeInviteNames =
    inviteServerNames.length > 0
      ? inviteServerNames
      : familyInviteServiceNames.length > 0
        ? familyInviteServiceNames
        : ["Plex", "Audiobooks", "Books"];

  const activeInviteLabel = formatNaturalList(activeInviteNames);
  const freshInviteServiceIds =
    inviteRequestedServiceIds && inviteRequestedServiceIds.length > 0
      ? inviteRequestedServiceIds
      : familyInviteServiceIds.length > 0
        ? familyInviteServiceIds
        : undefined;

  const createInviteLabel =
    inviteUrl && inviteStatus !== "pending"
      ? "Create a fresh invite for every media library"
      : "Create one invite for every media library";

  const loadServices = useCallback(async () => {
    if (!signupEnabled) {
      setServicesLoading(false);
      setServicesError(null);
      setSignupServices([]);
      return;
    }

    setServicesLoading(true);
    setServicesError(null);

    try {
      const res = await fetch("/api/signup/services", { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as {
        services?: SignupService[];
        detail?: string;
        error?: string;
      } | null;

      if (!res.ok || !Array.isArray(payload?.services)) {
        const message =
          payload?.detail?.trim() ||
          payload?.error?.trim() ||
          `HTTP ${res.status}`;
        throw new Error(message);
      }

      setSignupServices(sortSignupServices(payload.services));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Service lookup failed";
      setServicesError(message);
    } finally {
      setServicesLoading(false);
    }
  }, [signupEnabled]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  async function requestInvite(
    serviceIds?: number[],
    usageEvent = "signup.invite.media.create",
  ) {
    if (!signupEnabled) return;

    setBusy(true);
    setError(null);
    setCopyNote(null);

    try {
      const body =
        Array.isArray(serviceIds) && serviceIds.length > 0
          ? JSON.stringify({ serviceIds })
          : undefined;

      const res = await fetch("/api/signup/invite", {
        method: "POST",
        headers: {
          accept: "application/json",
          ...(body ? { "content-type": "application/json" } : {}),
        },
        body,
      });

      const payload = (await res.json().catch(() => null)) as {
        inviteUrl?: string;
        expiresAt?: string;
        code?: string;
        reused?: boolean;
        status?: SignupInviteStatus;
        usedBy?: string | null;
        usedAt?: string | null;
        serverNames?: string[];
        detail?: string;
        error?: string;
      } | null;

      if (!res.ok || !payload?.inviteUrl) {
        const message =
          payload?.detail?.trim() ||
          payload?.error?.trim() ||
          `HTTP ${res.status}`;
        throw new Error(message);
      }

      trackUsage(usageEvent);
      setInviteUrl(payload.inviteUrl);
      setInviteCode(payload.code?.trim() || null);
      setInviteExpiresAt(payload.expiresAt);
      setReusedInvite(Boolean(payload.reused));
      setInviteStatus(payload.status ?? "pending");
      setInviteUsedBy(payload.usedBy?.trim() || null);
      setInviteUsedAt(payload.usedAt?.trim() || null);
      setInviteServerNames(normalizeInviteServerNames(payload.serverNames));
      setInviteRequestedServiceIds(
        Array.isArray(serviceIds) && serviceIds.length > 0
          ? [...serviceIds]
          : familyInviteServiceIds.length > 0
            ? [...familyInviteServiceIds]
            : null,
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Invite creation failed";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function refreshInviteStatus() {
    if (!inviteCode) return;

    setStatusRefreshing(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/signup/invite-status?code=${encodeURIComponent(inviteCode)}`,
        {
          cache: "no-store",
        },
      );

      const payload = (await res.json().catch(() => null)) as {
        status?: SignupInviteStatus;
        expiresAt?: string;
        usedBy?: string | null;
        usedAt?: string | null;
        serverNames?: string[];
        detail?: string;
        error?: string;
      } | null;

      if (!res.ok || !payload?.status) {
        const message =
          payload?.detail?.trim() ||
          payload?.error?.trim() ||
          `HTTP ${res.status}`;
        throw new Error(message);
      }

      trackUsage("signup.invite.status.refresh");
      setInviteStatus(payload.status);
      setInviteExpiresAt(payload.expiresAt ?? inviteExpiresAt);
      setInviteUsedBy(payload.usedBy?.trim() || null);
      setInviteUsedAt(payload.usedAt?.trim() || null);
      setInviteServerNames((current) => {
        const next = normalizeInviteServerNames(payload.serverNames);
        return next.length > 0 ? next : current;
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Status refresh failed";
      setError(message);
    } finally {
      setStatusRefreshing(false);
    }
  }

  async function copyInviteLink() {
    if (!inviteUrl) return;

    try {
      await copyText(inviteUrl);
      trackUsage("signup.invite.copy");
      setCopyNote("Invite link copied");
      setTimeout(() => setCopyNote(null), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Copy failed";
      setError(message);
    }
  }

  return (
    <div className="family-access-shell family-access-shell-clear">
      <article className="family-access-hero media-access-lane">
        <div
          className="family-access-topline"
          aria-label="Wizarr media signup status"
        >
          <span className="family-access-pill">Wizarr media lane</span>
          <span
            className={
              signupEnabled
                ? "family-access-pill family-access-pill-live"
                : "family-access-pill"
            }
          >
            {signupEnabled ? "Live library list" : "Needs setup"}
          </span>
        </div>

        <div className="family-access-copy">
          <h3>Media libraries through Wizarr</h3>
          <p>
            One media invite can unlock every library Wizarr knows about:{" "}
            <strong>{familyInviteLabel}</strong>. This lane is only for movies,
            shows, books, audiobooks, and music. It does not create the
            Authentik account for the rest of the family apps.
          </p>
        </div>

        <div className="family-access-lane-grid" aria-label="Media signup path">
          <div className="family-access-step">
            <span className="family-access-result-kicker">
              Choose this lane
            </span>
            <strong>Media only</strong>
            <span>
              Use this when someone wants the family media libraries and does
              not need photos, files, planning, or the app library.
            </span>
          </div>
          <div className="family-access-step">
            <span className="family-access-result-kicker">
              Create the invite
            </span>
            <strong>All libraries together</strong>
            <span>
              The main button asks Wizarr for every available media service, so
              it does not silently turn into a Plex-only signup.
            </span>
          </div>
          <div className="family-access-step">
            <span className="family-access-result-kicker">
              Finish in Wizarr
            </span>
            <strong>signup.rasies.com</strong>
            <span>
              Wizarr finishes the media account. Authentik stays separate for
              the full family app account.
            </span>
          </div>
        </div>

        <div className="family-access-actions family-access-actions-media">
          {signupEnabled ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                void requestInvite(
                  familyInviteServiceIds.length > 0
                    ? familyInviteServiceIds
                    : undefined,
                )
              }
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {createInviteLabel}
            </button>
          ) : (
            <a
              href={signupUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              onClick={() => trackUsage("signup.signup.open")}
            >
              <ExternalLink className="h-4 w-4" />
              Open Wizarr media signup
            </a>
          )}

          <a
            href={signupUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
            onClick={() => trackUsage("signup.signup.open")}
          >
            <ExternalLink className="h-4 w-4" />
            Open signup.rasies.com
          </a>
        </div>

        <p className="family-access-footnote">
          Already used a media invite? You usually do not need another one. Need
          family photos, files, notes, planning, or the app dashboard? Use the
          Authentik lane beside this one.
        </p>

        {error && <div className="status-line status-error">{error}</div>}
        {copyNote && <div className="status-line">{copyNote}</div>}

        {inviteUrl && (
          <div className="family-access-result" aria-live="polite">
            <div className="family-access-result-copy">
              <span className="family-access-result-kicker">
                {reusedInvite
                  ? "Still ready from a moment ago"
                  : "Media invite ready"}
              </span>
              <strong>
                {reusedInvite
                  ? `Your recent invite for ${activeInviteLabel} is still good.`
                  : `Your invite is ready for ${activeInviteLabel}.`}
              </strong>
              <p>
                This link opens the Wizarr media signup for {activeInviteLabel}.
                It is separate from the Authentik family app account request.
              </p>
              <div
                className="family-access-chip-row"
                aria-label="What this invite includes"
              >
                {activeInviteNames.map((name) => (
                  <span key={name} className="family-access-chip">
                    {name}
                  </span>
                ))}
              </div>
              <div className="family-access-result-meta">
                <span
                  className={`family-access-status-pill family-access-status-pill-${inviteStatus}`}
                >
                  {formatInviteStatusLabel(inviteStatus)}
                </span>
                <p>
                  {inviteCode ? `Invite code ${inviteCode}. ` : ""}
                  {formatInviteStatusNote({
                    status: inviteStatus,
                    usedBy: inviteUsedBy,
                    usedAt: inviteUsedAt,
                    expiresAt: inviteExpiresAt,
                  })}
                </p>
              </div>
            </div>

            <div className="service-actions">
              {inviteStatus === "pending" ? (
                <>
                  <a
                    href={inviteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="service-open"
                    onClick={() => trackUsage("signup.invite.open")}
                  >
                    Open Wizarr signup
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                  <button
                    type="button"
                    className="service-helper"
                    onClick={() => void copyInviteLink()}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                    Copy invite link
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="service-helper"
                  onClick={() => void requestInvite(freshInviteServiceIds)}
                  disabled={busy}
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  Make another invite for {activeInviteLabel}
                </button>
              )}
              <button
                type="button"
                className="service-helper"
                onClick={() => void refreshInviteStatus()}
                disabled={!inviteCode || statusRefreshing}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${statusRefreshing ? "animate-spin" : ""}`}
                  aria-hidden
                />
                Refresh status
              </button>
            </div>
          </div>
        )}

        <div className="family-access-service-stage">
          <div className="family-access-service-head">
            <div className="family-access-stage-copy">
              <span className="family-access-result-kicker">Available now</span>
              <strong>Libraries included in the Wizarr media lane</strong>
              <p>
                These cards come from the live Wizarr service list. If a library
                appears here, the every-library invite includes it.
              </p>
            </div>
            {signupEnabled && (
              <button
                type="button"
                className="service-helper"
                onClick={() => {
                  trackUsage("signup.services.refresh");
                  void loadServices();
                }}
                disabled={servicesLoading}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${servicesLoading ? "animate-spin" : ""}`}
                  aria-hidden
                />
                Refresh media list
              </button>
            )}
          </div>

          {servicesError && (
            <div className="status-line status-error">{servicesError}</div>
          )}

          {servicesLoading ? (
            <div className="empty-state">
              Loading the Wizarr media libraries...
            </div>
          ) : sortedSignupServices.length > 0 ? (
            <div
              className="service-grid service-grid-media"
              aria-label="Wizarr media libraries"
            >
              {sortedSignupServices.map((service) => {
                const title = getSignupServiceTitle(service);
                const note = service.verified
                  ? `${formatHostLabel(service.url)} | included by Wizarr`
                  : formatHostLabel(service.url);

                return (
                  <article
                    key={service.id}
                    className="service-card service-card-live service-card-media"
                  >
                    <div className="service-card-top">
                      <div className="service-title">
                        <span className="service-icon">
                          {getSignupServiceIcon(service)}
                        </span>
                        <span>{title}</span>
                      </div>
                      <span className="service-badge">
                        {service.verified ? "Wizarr ready" : "Media library"}
                      </span>
                    </div>
                    <p>{getSignupServiceDescription(service)}</p>
                    <span className="service-meta">{note}</span>
                    <div className="service-actions">
                      <a
                        href={service.url}
                        target="_blank"
                        rel="noreferrer"
                        className="service-helper"
                        onClick={() => trackUsage("signup.service.open")}
                      >
                        Open {title} after signup
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : signupEnabled ? (
            <div className="empty-state">
              Wizarr is reachable, but it did not report any media libraries
              yet.
            </div>
          ) : (
            <div className="empty-state">
              The Wizarr media lane is not wired up on this copy yet.
            </div>
          )}
        </div>
      </article>

      <aside
        id="family-request"
        className="family-access-side family-auth-lane"
        aria-labelledby="family-request-heading"
      >
        <div className="family-access-side-card">
          <div className="family-access-topline">
            <span className="family-access-pill family-access-pill-auth">
              Authentik account lane
            </span>
          </div>
          <div className="family-access-stage-copy">
            <span className="family-access-result-kicker">
              Full family access
            </span>
            <h3 id="family-request-heading">Family apps through Authentik</h3>
            <p>
              This is a separate account request for the family app library:
              photos, files, notes, planning, dashboards, and the other tools I
              host. After approval, Authentik is the front door.
            </p>
          </div>
          <div className="family-auth-action-row">
            <a
              href={accountRequestUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              onClick={() => trackUsage("signup.auth.request.open")}
            >
              <ExternalLink className="h-4 w-4" />
              Request family account
            </a>
            <a
              href={authentikUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
              onClick={() => trackUsage("signup.auth.open")}
            >
              <ExternalLink className="h-4 w-4" />
              Sign in to Authentik
            </a>
          </div>
          <ServiceLaunchpad links={links} />
        </div>
      </aside>
    </div>
  );
}

export function ServiceLaunchpad({ links }: { links: ServiceLink[] }) {
  return (
    <div className="service-grid" aria-label="Family service launch links">
      {links.map((link) => {
        const external = isExternalLink(link.href);

        return (
          <article
            key={link.title}
            className={`service-card ${link.tone === "live" ? "service-card-live" : ""}`}
          >
            <div className="service-card-top">
              <div className="service-title">
                <span className="service-icon">{link.icon}</span>
                <span>{link.title}</span>
              </div>
              {link.badge && (
                <span className="service-badge">{link.badge}</span>
              )}
            </div>
            <p>{link.description}</p>
            <span className="service-meta">
              {link.note ??
                (external ? "Opens in a new tab" : "Opens on this page")}
            </span>
            <div className="service-actions">
              <a
                href={link.href}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
                className="service-open"
                onClick={() => trackUsage(`launch.${link.title}`)}
              >
                Open {link.title}
                {external && (
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                )}
              </a>
              {link.helperPrompt && (
                <button
                  type="button"
                  className="service-helper"
                  onClick={() => {
                    trackUsage(`launch.${link.title}.ask`);
                    openChatWithPrompt(link.helperPrompt ?? "");
                  }}
                >
                  Ask House Chat
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function MoveBoard({
  featuredLinks,
  drawers,
}: {
  featuredLinks: ServiceLink[];
  drawers: MoveDrawer[];
}) {
  return (
    <div className="move-board">
      <div className="move-feature-grid" aria-label="Featured portal moves">
        {featuredLinks.map((link) => {
          const external = isExternalLink(link.href);

          return (
            <a
              key={link.title}
              href={link.href}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer" : undefined}
              className="move-feature-card"
              onClick={() => trackUsage(`launch.${link.title}`)}
            >
              <span className="move-feature-icon">{link.icon}</span>
              <strong>{link.title}</strong>
              <p>{link.description}</p>
              <span>
                {link.note ??
                  (external ? "Opens in a new tab" : "Opens on this page")}
              </span>
            </a>
          );
        })}
      </div>

      <div className="move-drawer-stage">
        <div className="move-board-copy">
          <p className="card-kicker">More rooms</p>
          <h3>The rest of the house is grouped underneath</h3>
          <p>
            Open the drawer that matches what you want to do instead of scanning
            one long wall of links.
          </p>
          <p className="welcome-note">
            Start with the front row, then open the next layer only when you
            need it.
          </p>
        </div>

        <div className="move-drawer-list">
          {drawers.map((drawer, index) => (
            <details
              key={drawer.title}
              className="move-drawer"
              open={index === 0}
            >
              <summary>
                <span>{drawer.title}</span>
                <span>{drawer.summary}</span>
              </summary>

              <div className="move-drawer-grid">
                {drawer.links.map((link) => {
                  const external = isExternalLink(link.href);

                  return (
                    <a
                      key={link.title}
                      href={link.href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noreferrer" : undefined}
                      className="move-mini-card"
                      onClick={() => trackUsage(`launch.${link.title}`)}
                    >
                      <div className="move-mini-top">
                        <span className="move-mini-icon">{link.icon}</span>
                        <strong>{link.title}</strong>
                      </div>
                      <p>{link.description}</p>
                      <span>
                        {link.note ??
                          (external
                            ? "Opens in a new tab"
                            : "Opens on this page")}
                      </span>
                    </a>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AboutPanel({ about }: { about: AboutConfig }) {
  return (
    <section className="info-card" aria-labelledby="about-heading">
      <div className="card-kicker">From Rassy</div>
      <h2 id="about-heading">{about.name}</h2>
      <p className="info-emphasis">{about.tagline}</p>
      <p>{about.bio}</p>
      <div className="highlight-row" aria-label="Rassy highlights">
        {about.highlights.map((item) => (
          <span key={item} className="highlight-pill">
            {item}
          </span>
        ))}
      </div>
      <div className="card-footer-note">
        Useful things can still feel warm and unmistakably ours.
      </div>
    </section>
  );
}

export function PortalActivityPanel() {
  return (
    <section className="info-card" aria-labelledby="activity-heading">
      <div className="card-kicker">Why We Self-Host</div>
      <h2 id="activity-heading">Our own little corner of the internet</h2>
      <p>
        The exciting part of self-hosting is not the software list. It is that
        the useful parts, the memory parts, and the playful parts all get to
        live in one place that feels like the family it belongs to.
      </p>

      <div className="activity-metrics" aria-label="Activity totals">
        <div className="activity-metric">
          <strong>It sounds like us</strong>
          <span>The words can feel like home instead of product copy.</span>
        </div>
        <div className="activity-metric">
          <strong>It keeps memories close</strong>
          <span>
            Photos, stories, music, and notes stay near the family that made
            them.
          </span>
        </div>
        <div className="activity-metric">
          <strong>It makes the web fun again</strong>
          <span>
            Practical rooms and weird little delights can share the same front
            porch.
          </span>
        </div>
      </div>
      <div className="card-footer-note">
        The goal is not to impress the internet. It is to make a home there.
      </div>
    </section>
  );
}

export function StatusPanel({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<PortalStatusItem[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastGoodSnapshotRef = useRef<PortalStatusResponse | null>(null);

  const loadStatus = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      const payload = (await res
        .json()
        .catch(() => null)) as PortalStatusResponse | null;

      if (!res.ok) {
        throw new Error(`Status failed: HTTP ${res.status}`);
      }

      const nextItems = Array.isArray(payload?.items) ? payload.items : [];
      setItems(nextItems);
      setCheckedAt(payload?.checkedAt);
      lastGoodSnapshotRef.current = {
        checkedAt: payload?.checkedAt,
        items: nextItems,
      };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Status check failed";
      const fallback = lastGoodSnapshotRef.current;
      if (fallback) {
        setItems(Array.isArray(fallback.items) ? fallback.items : []);
        setCheckedAt(fallback.checkedAt);
        setError(`${message}. Showing the last good check.`);
      } else {
        setError(message);
        setItems([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    return startVisiblePolling(() => {
      void loadStatus();
    }, STATUS_POLL_INTERVAL_MS);
  }, [loadStatus]);

  const summary = useMemo(() => {
    const up = items.filter((item) => item.state === "up").length;
    const warn = items.filter((item) => item.state === "warn").length;
    const down = items.filter((item) => item.state === "down").length;
    return { up, warn, down };
  }, [items]);

  const fastestItem = useMemo(
    () =>
      items
        .filter((item) => typeof item.latencyMs === "number")
        .sort(
          (a, b) =>
            (a.latencyMs ?? Number.MAX_SAFE_INTEGER) -
            (b.latencyMs ?? Number.MAX_SAFE_INTEGER),
        )[0],
    [items],
  );

  const needsAttention = useMemo(
    () =>
      items.find((item) => item.state === "down") ??
      items.find((item) => item.state === "warn"),
    [items],
  );

  const summaryNarrative = useMemo(() => {
    if (loading) {
      return compact
        ? "Checking services..."
        : "Checking the main services right now.";
    }

    if (error) {
      return compact
        ? "Showing the last good check while the board catches up."
        : "The house lights are showing the last good check while a fresh one catches up.";
    }

    if (items.length === 0) {
      return "Nothing is on the watch list yet.";
    }

    if (summary.down === 0 && summary.warn === 0) {
      return compact
        ? `All ${summary.up} watched services are up.`
        : `All ${summary.up} watched services are awake and ready.`;
    }

    if (summary.down > 0) {
      return compact
        ? `${summary.down} services need attention right now.`
        : `${summary.down} services are down and ${summary.warn} more need attention.`;
    }

    return compact
      ? `${summary.warn} services are showing a warning.`
      : `${summary.warn} services are showing a warning, but the rest of the site is holding steady.`;
  }, [
    compact,
    error,
    items.length,
    loading,
    summary.down,
    summary.up,
    summary.warn,
  ]);

  const overviewCards = useMemo(
    () => [
      {
        label: "Watching",
        value: `${items.length}`,
        note: compact ? "services on the board" : "services on the board",
      },
      {
        label: "Online",
        value: `${summary.up}`,
        note: compact ? "fully available" : "services responding normally",
      },
      {
        label: "Needs care",
        value: `${summary.warn + summary.down}`,
        note: needsAttention
          ? needsAttention.label
          : "nothing urgent right now",
      },
      {
        label: "Fastest response",
        value: fastestItem?.label ?? "Waiting",
        note: fastestItem
          ? formatLatency(fastestItem.latencyMs)
          : "no timings yet",
      },
    ],
    [
      compact,
      fastestItem,
      items.length,
      needsAttention,
      summary.down,
      summary.up,
      summary.warn,
    ],
  );

  return (
    <div className={`status-panel ${compact ? "status-panel-compact" : ""}`}>
      <div className="status-oracle">
        <div className="status-oracle-copy">
          <p className="card-kicker">
            {compact ? "House lights" : "Site status"}
          </p>
          <h3>
            {compact
              ? "What is awake right now"
              : "A quick check on what is awake right now"}
          </h3>
          <p>{summaryNarrative}</p>
        </div>
        <div className="status-topline">
          <div className="status-badges" aria-label="Status summary">
            <span className="status-badge status-badge-up">
              {summary.up} up
            </span>
            <span className="status-badge status-badge-warn">
              {summary.warn} warn
            </span>
            <span className="status-badge status-badge-down">
              {summary.down} down
            </span>
          </div>
          <div className="status-topline-actions">
            <span className="status-timestamp">
              {formatCheckedAt(checkedAt)}
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void loadStatus(true)}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {!loading && items.length > 0 && (
        <div
          className={`status-overview-grid ${compact ? "status-overview-grid-compact" : ""}`}
        >
          {overviewCards.map((item) => (
            <article key={item.label} className="status-overview-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.note}</p>
            </article>
          ))}
        </div>
      )}

      {loading && (
        <div className="status-line">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking services...
        </div>
      )}

      {error && <div className="status-line status-error">{error}</div>}

      {!loading && items.length > 0 && (
        <div className={`status-grid ${compact ? "status-grid-compact" : ""}`}>
          {items.map((item) => (
            <article
              key={item.key}
              className={`status-card status-card-${item.state} ${compact ? "status-card-compact" : ""}`}
            >
              <div className="status-card-top">
                <div>
                  <h3>{item.label}</h3>
                  {!compact && <p>{item.detail ?? "Status check complete"}</p>}
                </div>
                <span className={`status-pill status-pill-${item.state}`}>
                  {statusStateLabel(item.state)}
                </span>
              </div>
              <div className="status-card-meta">
                <span>{formatHostLabel(item.url)}</span>
                <span>{formatLatency(item.latencyMs)}</span>
                {typeof item.statusCode === "number" && (
                  <span>HTTP {item.statusCode}</span>
                )}
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="service-helper"
              >
                Open service
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function MinecraftPanel({
  serverHost,
  blueMapUrl,
  blueMapEmbedUrl,
}: {
  serverHost: string;
  blueMapUrl: string;
  blueMapEmbedUrl: string;
}) {
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const joinPrompt = `Give me three build ideas, one easy starter quest, and one ridiculous group goal for my family Minecraft server at ${serverHost}.`;

  async function copyServerHost() {
    try {
      await copyText(serverHost);
      setCopyNote("Server address copied");
      setTimeout(() => setCopyNote(null), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Copy failed";
      setCopyNote(message);
    }
  }

  return (
    <div className="minecraft-panel">
      <div className="minecraft-sidebar">
        <div className="minecraft-sidebar-card">
          <div className="card-kicker">Minecraft anytime</div>
          <div className="minecraft-invite">
            <span className="minecraft-invite-tag">Come play</span>
            <strong>
              Come and play Minecraft anytime. Big Momma Ras Land is open.
            </strong>
          </div>
          <h3>Copy the address, peek at the map, then jump in.</h3>
          <p>
            The map and helper bots are here so you can wander in, find the
            server, and start building without hunting for the details.
          </p>

          <div
            className="minecraft-meta-grid"
            aria-label="Minecraft server details"
          >
            <div className="minecraft-meta-card">
              <span>Join address</span>
              <strong>{serverHost}</strong>
            </div>
            <div className="minecraft-meta-card">
              <span>Map source</span>
              <strong>{blueMapUrl}</strong>
            </div>
          </div>

          <div className="minecraft-bot-grid" aria-label="Minecraft helpers">
            <div className="minecraft-bot-card">
              <span>Map bot</span>
              <strong>Scout first</strong>
              <p>
                The live map is close so you can see where everybody has been.
              </p>
            </div>
            <div className="minecraft-bot-card">
              <span>Build bot</span>
              <strong>Bring an idea</strong>
              <p>
                Ask House Chat for a quest, a base plan, or a silly project.
              </p>
            </div>
            <div className="minecraft-bot-card">
              <span>Join bot</span>
              <strong>Copy and go</strong>
              <p>The server address is one tap away when you are ready.</p>
            </div>
          </div>

          <div className="service-actions">
            <a
              href={blueMapUrl}
              target="_blank"
              rel="noreferrer"
              className="service-open"
            >
              Open live map
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
            <button
              type="button"
              className="service-helper"
              onClick={() => void copyServerHost()}
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Copy server address
            </button>
            <button
              type="button"
              className="service-helper"
              onClick={() => openChatWithPrompt(joinPrompt)}
            >
              Ask the build bot
            </button>
          </div>

          <p className="minecraft-note">
            Come and play whenever the mood hits. I want this to be easy.
          </p>

          {copyNote && <div className="status-line">{copyNote}</div>}
        </div>
      </div>

      <div className="minecraft-map-wrap">
        <iframe
          className="minecraft-map-frame"
          src={blueMapEmbedUrl}
          title="Big Momma Ras Land BlueMap"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}

export function BirthdayEasterEgg({ gameUrl }: { gameUrl: string }) {
  const [active, setActive] = useState(false);
  const [progressCount, setProgressCount] = useState(0);
  const sequenceIndexRef = useRef(0);

  const advanceBirthdayChallenge = useCallback((value: string) => {
    const key = normalizeSecretKey(value);
    const currentIndex = sequenceIndexRef.current;

    if (key === BIRTHDAY_UNLOCK_SEQUENCE[currentIndex]) {
      const nextIndex = currentIndex + 1;
      if (nextIndex === BIRTHDAY_UNLOCK_SEQUENCE.length) {
        sequenceIndexRef.current = 0;
        setProgressCount(0);
        trackUsage("easter.double_dragon");
        setActive(true);
        return;
      }

      sequenceIndexRef.current = nextIndex;
      setProgressCount(nextIndex);
      return;
    }

    const fallbackIndex = key === BIRTHDAY_UNLOCK_SEQUENCE[0] ? 1 : 0;
    sequenceIndexRef.current = fallbackIndex;
    setProgressCount(fallbackIndex);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return () => undefined;

    const handleKeydown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      advanceBirthdayChallenge(event.key);
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [advanceBirthdayChallenge]);

  useEffect(() => {
    if (
      !active ||
      typeof window === "undefined" ||
      typeof document === "undefined"
    )
      return () => undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActive(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [active]);

  return (
    <>
      <section
        id="birthday-challenge"
        className="panel panel-birthday-riddle reveal reveal-6"
        aria-labelledby="birthday-riddle-heading"
      >
        <div className="section-head">
          <WandSparkles className="h-5 w-5" aria-hidden />
          <div>
            <h2 id="birthday-riddle-heading">Birthday challenge</h2>
            <p>
              I tucked my birthday arcade memory back in here. The buttons are
              mixed up; the order is the puzzle.
            </p>
          </div>
        </div>

        <div className="birthday-riddle-grid">
          <article className="birthday-riddle-card">
            <p className="birthday-riddle-kicker">
              Level 11 // 4:30 AM // before school
            </p>
            <h3>Wake the Double Dragon sunrise memory.</h3>
            <p>
              Tap up twice, down twice, left right left right, then B and A.
              After that, hit Select, then START, and I will open the arcade.
            </p>

            <div
              className="birthday-riddle-meta"
              aria-label="Birthday challenge clues"
            >
              <span>Use up and down</span>
              <span>The buttons are intentionally scrambled</span>
              <span>Progress lights up as you go</span>
            </div>

            <div className="birthday-riddle-actions">
              <span className="birthday-riddle-status" aria-live="polite">
                {active
                  ? "I opened the secret arcade."
                  : progressCount >= KONAMI_SEQUENCE.length
                    ? "Now hit Select, then START."
                    : progressCount > 0
                      ? `You are ${progressCount} of ${BIRTHDAY_UNLOCK_SEQUENCE.length} taps in.`
                      : "Tap the mixed buttons to wake it up."}
              </span>
            </div>
          </article>

          <article className="birthday-riddle-clue-card">
            <span className="birthday-riddle-clue-label">Arcade buttons</span>
            <div
              className="birthday-riddle-chip-grid"
              aria-label="Birthday challenge arcade buttons"
            >
              {BIRTHDAY_ARCADE_BUTTONS.map((button) => (
                <button
                  type="button"
                  key={button.label}
                  onClick={() => advanceBirthdayChallenge(button.value)}
                  className="birthday-riddle-chip"
                  aria-label={`Birthday arcade button ${button.label}`}
                >
                  {button.label}
                </button>
              ))}
            </div>
            <div
              className="birthday-riddle-progress"
              aria-label="Birthday challenge progress"
            >
              {BIRTHDAY_UNLOCK_SEQUENCE.map((step, index) => (
                <span
                  key={`${step}-${index}`}
                  className={
                    index < progressCount
                      ? "birthday-riddle-progress-dot birthday-riddle-progress-dot-active"
                      : "birthday-riddle-progress-dot"
                  }
                />
              ))}
            </div>
            <p className="birthday-riddle-note">
              No clue button. Just the old magic, a scrambled pad, Select, and
              START.
            </p>
          </article>
        </div>
      </section>

      {active && (
        <div
          className="birthday-egg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="birthday-egg-heading"
        >
          <div
            className="birthday-egg-backdrop"
            onClick={() => setActive(false)}
            aria-hidden
          />

          <section className="birthday-egg-shell">
            <div className="birthday-egg-topline">
              <span className="birthday-egg-badge">START pressed</span>
              <button
                type="button"
                className="birthday-egg-close"
                onClick={() => setActive(false)}
                aria-label="Close Double Dragon birthday mode"
              >
                Close
              </button>
            </div>

            <div className="birthday-egg-copy">
              <p className="birthday-egg-kicker">
                11th birthday // 4:30 AM // before school
              </p>
              <h2 id="birthday-egg-heading">Double Dragon Birthday Mode</h2>
              <p>
                I opened the hidden sunrise arcade: quiet house, before-school,
                birthday-morning energy, and a game ready to play.
              </p>
            </div>

            <div className="birthday-egg-stage">
              <div
                className="birthday-egg-marquee"
                aria-label="Birthday mode details"
              >
                <span>4:30 AM club</span>
                <span>Secret arcade</span>
                <span>Level 11 unlocked</span>
                <span>Double Dragon</span>
              </div>

              <div className="birthday-egg-screen-wrap">
                <iframe
                  className="birthday-egg-frame"
                  src={gameUrl}
                  title="Double Dragon birthday celebration"
                  loading="eager"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div
              className="birthday-egg-notes"
              aria-label="Birthday mode notes"
            >
              <span className="birthday-egg-note">
                The magic is behind START.
              </span>
              <span className="birthday-egg-note">
                Press `Esc` to vanish back into the site.
              </span>
              <span className="birthday-egg-note">
                Best experienced like you are trying to beat the bus clock.
              </span>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export function SearchPanel() {
  const storage = useMemo(() => getSafeStorage(), []);
  const recentsKey = "rasies_web_search_recent_v1";

  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [copyNote, setCopyNote] = useState<string | null>(null);

  const canSearch = query.trim().length >= 2;

  useEffect(() => {
    const raw = storage?.getItem(recentsKey);
    if (!raw) return;
    const parsed = safeJsonParse(raw);
    if (!Array.isArray(parsed)) return;

    const cleaned = parsed
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0)
      .slice(0, 8);

    if (cleaned.length > 0) setRecentQueries(cleaned);
  }, [storage]);

  const persistRecents = useCallback(
    (nextRecents: string[]) => {
      setRecentQueries(nextRecents);
      storage?.setItem(recentsKey, JSON.stringify(nextRecents));
    },
    [storage],
  );

  function clearRecents() {
    setRecentQueries([]);
    storage?.removeItem(recentsKey);
  }

  const runSearch = useCallback(
    async (event?: React.FormEvent, forcedQuery?: string) => {
      event?.preventDefault();
      const nextQuery = (forcedQuery ?? query).trim();
      if (forcedQuery) setQuery(forcedQuery);
      if (nextQuery.length < 2) return;

      setError(null);
      setCopyNote(null);
      setLoading(true);
      setResults([]);
      trackUsage("search.run");

      try {
        const url = new URL("/api/search", window.location.origin);
        url.searchParams.set("q", nextQuery);
        if (language !== "all") {
          url.searchParams.set("language", language);
        }

        const res = await fetch(`${url.pathname}${url.search}`, {
          cache: "no-store",
        });

        const raw = await res.text();
        const payload = safeJsonParse(raw);

        if (!res.ok) {
          const message =
            isRecord(payload) && typeof payload.error === "string"
              ? payload.error
              : `HTTP ${res.status}`;
          throw new Error(`Search failed: ${message}`);
        }

        const parsedHits = parseSearchHits(payload);
        setResults(parsedHits.slice(0, 12));

        const nextRecents = [
          nextQuery,
          ...recentQueries.filter(
            (item) => item.toLowerCase() !== nextQuery.toLowerCase(),
          ),
        ].slice(0, 8);
        persistRecents(nextRecents);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Search error";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [language, persistRecents, query, recentQueries],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const custom = event as CustomEvent<SearchQueryEventDetail>;
      const nextQuery = custom.detail?.query?.trim();
      if (!nextQuery) return;
      void runSearch(undefined, nextQuery);
    };

    window.addEventListener("rasies:search-query", handler);
    return () => window.removeEventListener("rasies:search-query", handler);
  }, [runSearch]);

  async function copyResultLink(url: string) {
    try {
      await copyText(url);
      trackUsage("search.result.copy");
      setCopyNote("Result link copied");
      setTimeout(() => setCopyNote(null), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Copy failed";
      setError(message);
    }
  }

  function askSmartChatAboutResult(item: SearchHit) {
    trackUsage("search.result.ask");
    openChatWithPrompt(
      [
        `I searched for "${query.trim()}".`,
        `Help me evaluate this result: ${item.title}`,
        `URL: ${item.url}`,
        item.snippet ? `Snippet: ${item.snippet}` : "Snippet: none provided.",
        "Tell me whether it looks worth opening and what I should look for first.",
      ].join("\n\n"),
    );
  }

  return (
    <div className="search-panel">
      <div className="search-shell">
        <div className="search-sidebar">
          <form className="search-form" onSubmit={runSearch}>
            <label
              htmlFor="web-search-input"
              className="input-callout input-callout-search"
            >
              <span>Search box</span>
              <strong>Search the web without the sludge</strong>
            </label>
            <div className="search-form-row">
              <div className="search-input-wrap">
                <Search className="h-4 w-4" aria-hidden />
                <input
                  id="web-search-input"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Look for an answer, an idea, or the next rabbit hole worth keeping..."
                  autoComplete="off"
                />
              </div>

              <label className="search-select">
                <span className="search-select-label">Language</span>
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={!canSearch || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching
                  </>
                ) : (
                  "Search"
                )}
              </button>
            </div>
          </form>

          <div className="search-sidebar-card">
            <div className="search-note">
              I kept this simple: type the thing you actually want, search it,
              and I will keep your recent searches here in this browser.
            </div>

            {recentQueries.length > 0 && (
              <div className="meta-row search-meta-row search-meta-row-recents">
                <span>Recent searches:</span>
                <div className="meta-links">
                  {recentQueries.slice(0, 4).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => void runSearch(undefined, item)}
                    >
                      {item}
                    </button>
                  ))}
                  <button type="button" onClick={clearRecents}>
                    Clear recent
                  </button>
                </div>
              </div>
            )}

            {query.trim().length >= 2 && (
              <div className="meta-row search-meta-row search-meta-row-helper">
                <span>Want House Chat to sharpen this search?</span>
                <div className="meta-links">
                  <button
                    type="button"
                    onClick={() => {
                      trackUsage("search.ask_cheshire");
                      openChatWithPrompt(
                        `Help me improve this web search query and suggest 3 alternatives: "${query.trim()}".`,
                      );
                    }}
                  >
                    Ask House Chat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="search-results-panel">
          {results.length > 0 && (
            <div className="results-summary">
              <strong>{results.length}</strong>
              <span>
                results for "{query.trim()}"
                {language !== "all"
                  ? ` in ${LANGUAGE_OPTIONS.find((item) => item.value === language)?.label}`
                  : ""}
              </span>
            </div>
          )}

          {results.length > 0 && (
            <div className="meta-row search-meta-row search-meta-row-handoff">
              <span>Want House Chat to sort these results?</span>
              <div className="meta-links">
                <button
                  type="button"
                  onClick={() => {
                    trackUsage("search.handoff");
                    const top = results
                      .slice(0, 5)
                      .map(
                        (item, index) =>
                          `${index + 1}. ${item.title} — ${item.url}`,
                      )
                      .join("\n");
                    openChatWithPrompt(
                      [
                        `I searched for "${query.trim()}".`,
                        "Use these top results to help me decide what to click next:",
                        top,
                        "Then suggest 3 better follow-up searches in this exact format:",
                        "Query: ...",
                      ].join("\n\n"),
                    );
                  }}
                >
                  Hand off to House Chat
                </button>
              </div>
            </div>
          )}

          {error && <div className="status-line status-error">{error}</div>}
          {copyNote && !error && <div className="status-line">{copyNote}</div>}

          {!error &&
            !loading &&
            results.length === 0 &&
            query.trim().length >= 2 && (
              <div className="status-line">
                Nothing useful came back for that one. Try different words or
                another language.
              </div>
            )}

          {results.length > 0 && (
            <ol className="search-results">
              {results.map((item, index) => (
                <li key={`${item.url}-${index}`}>
                  <article className="result-card">
                    <div className="result-top">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="result-link"
                      >
                        <div className="result-title">
                          {item.title}
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        </div>
                        <div className="result-url">{item.url}</div>
                      </a>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => void copyResultLink(item.url)}
                      >
                        <Copy className="h-4 w-4" aria-hidden />
                        Copy
                      </button>
                    </div>
                    {item.snippet && (
                      <p className="result-snippet">{item.snippet}</p>
                    )}
                    <div className="result-footer">
                      <div className="result-meta">
                        {item.engine
                          ? `via ${item.engine}`
                          : "Source ready to open"}
                      </div>
                      <div className="result-actions">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-action"
                        >
                          Open source
                        </a>
                        <button
                          type="button"
                          className="text-action"
                          onClick={() => askSmartChatAboutResult(item)}
                        >
                          Ask House Chat
                        </button>
                      </div>
                    </div>
                  </article>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatPanel({
  variant = "full",
}: { variant?: "full" | "minimal" } = {}) {
  const storage = useMemo(() => getSafeStorage(), []);
  const threadKey = "rasies_family_chat_thread_v1";
  const sessionKey = "rasies_family_chat_session_v1";
  const sessionId = useMemo(() => {
    const existing = storage?.getItem(sessionKey);
    if (existing) return existing;
    const created = crypto.randomUUID();
    storage?.setItem(sessionKey, created);
    return created;
  }, [storage]);
  const threadId = useMemo(() => {
    const existing = storage?.getItem(threadKey + "_id");
    if (existing) return existing;
    const created = crypto.randomUUID();
    storage?.setItem(threadKey + "_id", created);
    return created;
  }, [storage]);
  const draftKey = "rasies_family_chat_draft_v1";
  const logRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isTest = import.meta.env.MODE === "test";
  const initialDraft = storage?.getItem(draftKey) ?? "";

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    readStoredMessages(storage, threadKey),
  );
  const [input, setInput] = useState(initialDraft);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [draggingUpload, setDraggingUpload] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthState>("checking");
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const [starters, setStarters] = useState<string[]>(() =>
    randomSubset(CHAT_STARTERS, 4),
  );

  useEffect(() => {
    storage?.setItem(threadKey, JSON.stringify(trimChatHistory(messages)));
  }, [messages, storage]);

  useEffect(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      storage?.removeItem(draftKey);
      return;
    }
    storage?.setItem(draftKey, input);
  }, [draftKey, input, storage]);

  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, busy]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: Event) => {
      const custom = event as CustomEvent<CatPromptEventDetail>;
      const prompt = custom.detail?.prompt?.trim();
      if (!prompt) return;
      setInput(prompt);
      setTimeout(() => inputRef.current?.focus(), 0);
    };

    window.addEventListener("rasies:cat-prompt", handler);
    return () => window.removeEventListener("rasies:cat-prompt", handler);
  }, []);

  useEffect(() => {
    if (isTest) return;

    const run = async (manual = false) => {
      if (manual) setHealth("checking");
      try {
        setHealth(await fetchCatHealthState());
      } catch {
        setHealth("offline");
      }
    };

    void run(true);
    return startVisiblePolling(() => {
      void run();
    }, CHAT_HEALTH_POLL_INTERVAL_MS);
  }, [isTest]);

  function refreshStarters() {
    setStarters(randomSubset(CHAT_STARTERS, 4));
  }

  function applyMode(instruction: string) {
    trackUsage("chat.mode");
    setInput((current) =>
      current.trim().length > 0
        ? `${instruction}

${current.trim()}`
        : `${instruction}

`,
    );
    inputRef.current?.focus();
  }

  async function addAttachments(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    const availableSlots = MAX_CHAT_UPLOAD_FILES - attachments.length;
    if (availableSlots <= 0) {
      setError(`House Chat can take ${MAX_CHAT_UPLOAD_FILES} files at once.`);
      return;
    }

    const selected = incoming.slice(0, availableSlots);
    if (incoming.length > availableSlots) {
      setError(
        `I attached the first ${availableSlots} files. Send those, then add more.`,
      );
    } else {
      setError(null);
    }

    try {
      const nextAttachments = await Promise.all(
        selected.map((file) => fileToChatAttachment(file)),
      );
      setAttachments((current) =>
        [...current, ...nextAttachments].slice(0, MAX_CHAT_UPLOAD_FILES),
      );
      trackUsage("chat.attach");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "File attachment failed";
      setError(message);
    }
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((item) => item.id !== id));
    fileInputRef.current?.focus();
  }

  async function sendMessage(event?: React.FormEvent, forcedText?: string) {
    event?.preventDefault();

    const text = (forcedText ?? input).trim();
    const readyAttachments = attachments;
    if ((!text && readyAttachments.length === 0) || busy) return;

    const messageText =
      text ||
      `Please help with ${readyAttachments.length === 1 ? "this attachment" : "these attachments"}.`;
    const displayAttachments =
      sanitizeChatAttachmentsForMessage(readyAttachments);
    const apiFiles = readyAttachments.map(attachmentToApiFile);

    const userMessage: ChatMessage = {
      id: createId("user"),
      role: "user",
      content: messageText,
      attachments: displayAttachments,
    };

    const nextMessages = trimChatHistory([...messages, userMessage]);
    setMessages(nextMessages);
    setInput("");
    setAttachments([]);
    setBusy(true);
    setError(null);
    trackUsage("chat.send");

    try {
      const assistantReply = await requestCatReply(nextMessages, apiFiles, { sessionId, threadId });
      const assistantMessage: ChatMessage = {
        id: createId("assistant"),
        role: "assistant",
        content: assistantReply,
      };

      setMessages(trimChatHistory([...nextMessages, assistantMessage]));
      setHealth("online");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Chat failed";
      setError(message);
      setHealth("degraded");
      setMessages(
        trimChatHistory([
          ...nextMessages,
          {
            id: createId("assistant"),
            role: "assistant",
            content: `House Chat couldn't complete that request. ${message}`,
          },
        ]),
      );
    } finally {
      setBusy(false);
    }
  }

  function clearChat() {
    setMessages([]);
    setInput("");
    setAttachments([]);
    setError(null);
    storage?.removeItem(threadKey);
    storage?.removeItem(threadKey + "_id");
    storage?.removeItem(draftKey);
    inputRef.current?.focus();
  }

  async function copyConversation() {
    if (messages.length === 0) return;

    const transcript = messages
      .map(
        (message) =>
          `${message.role === "assistant" ? "House Chat" : "You"}: ${message.content}`,
      )
      .join("\n\n");

    try {
      await copyText(transcript);
      setCopyNote("Conversation copied");
      setTimeout(() => setCopyNote(null), 1500);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Clipboard copy failed";
      setError(message);
    }
  }

  const totalTurns = messages.reduce(
    (sum, message) => sum + (message.role === "user" ? 1 : 0),
    0,
  );
  const isMinimal = variant === "minimal";
  const canSend = input.trim().length > 0 || attachments.length > 0;
  const draftWords = input.trim()
    ? input.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const visibleStarters = isMinimal ? starters.slice(0, 4) : starters;

  return (
    <div className={isMinimal ? "chat-panel chat-panel-minimal" : "chat-panel"}>
      <div
        className={isMinimal ? "chat-shell chat-shell-minimal" : "chat-shell"}
      >
        {!isMinimal && (
          <aside className="chat-sidebar">
            <div className="chat-sidebar-card">
              <div className="chat-tools">
                <div className="chat-health">
                  <span className={`dot dot-${health}`} aria-hidden />
                  <span>{healthLabel(health)}</span>
                </div>
                <div className="tool-buttons">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={refreshStarters}
                  >
                    <WandSparkles className="h-4 w-4" />
                    New ideas
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={copyConversation}
                    disabled={messages.length === 0}
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={clearChat}
                    disabled={
                      busy ||
                      (messages.length === 0 && input.trim().length === 0)
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear
                  </button>
                </div>
              </div>

              <div className="chat-sidebar-intro">
                <h3>House Chat</h3>
              </div>

              <div className="chat-rail-metrics" aria-label="Thread state">
                <div className="chat-rail-metric">
                  <span>Thread</span>
                  <strong>{messages.length}</strong>
                </div>
                <div className="chat-rail-metric">
                  <span>Draft</span>
                  <strong>{draftWords}</strong>
                </div>
                <div className="chat-rail-metric">
                  <span>Files</span>
                  <strong>{attachments.length}</strong>
                </div>
              </div>

              <div className="chat-mode-row" aria-label="Chat helper modes">
                {CHAT_MODES.map((mode) => (
                  <button
                    key={mode.label}
                    type="button"
                    className="chip chip-ghost"
                    onClick={() => applyMode(mode.instruction)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <div className="chat-starters" aria-label="Chat starter prompts">
                {visibleStarters.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    className="chip"
                    onClick={() => {
                      trackUsage("chat.starter");
                      setInput(starter);
                      inputRef.current?.focus();
                    }}
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        <div className="chat-main">
          {isMinimal && (
            <aside className="chat-utility-rail" aria-label="House Chat tools">
              <div className="chat-rail-topline">
                <div>
                  <p className="card-kicker">House Chat</p>
                  <h2>House Chat</h2>
                </div>
                <div className="chat-rail-tools">
                  <div className="chat-health">
                    <span className={`dot dot-${health}`} aria-hidden />
                    <span>{healthLabel(health)}</span>
                  </div>
                  <button
                    type="button"
                    className="service-helper"
                    onClick={refreshStarters}
                  >
                    <WandSparkles className="h-3.5 w-3.5" />
                    New prompts
                  </button>
                </div>
              </div>

              <div className="chat-rail-metrics" aria-label="Thread state">
                <div className="chat-rail-metric">
                  <span>Thread</span>
                  <strong>{messages.length}</strong>
                </div>
                <div className="chat-rail-metric">
                  <span>Draft</span>
                  <strong>{draftWords}</strong>
                </div>
                <div className="chat-rail-metric">
                  <span>Files</span>
                  <strong>{attachments.length}</strong>
                </div>
              </div>

              <div className="chat-rail-section">
                <div className="chat-rail-section-head">
                  <span>Mode</span>
                </div>
                <div className="chat-mode-grid" aria-label="Chat modes">
                  {CHAT_MODES.map((mode) => (
                    <button
                      key={mode.label}
                      type="button"
                      className="chat-mode-button"
                      onClick={() => applyMode(mode.instruction)}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="chat-rail-section chat-prompt-deck">
                <div className="chat-rail-section-head">
                  <span>Prompt deck</span>
                  <button
                    type="button"
                    className="chat-text-button"
                    onClick={refreshStarters}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Shuffle
                  </button>
                </div>
                <div className="chat-prompt-card-grid">
                  {visibleStarters.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      className="chat-prompt-card"
                      onClick={() => {
                        trackUsage("chat.minimal_prompt");
                        setInput(starter);
                        inputRef.current?.focus();
                      }}
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="chat-rail-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={copyConversation}
                  disabled={messages.length === 0}
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={clearChat}
                  disabled={
                    busy ||
                    (messages.length === 0 && input.trim().length === 0)
                  }
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </button>
              </div>
            </aside>
          )}

          {!isMinimal && (
            <div className="chat-meta" aria-label="Chat workspace status">
              <span>{totalTurns} messages exchanged</span>
              <span>
                {messages.length > 0 ? "Open thread" : "New thread"}
              </span>
              <span>
                {input.trim().length > 0
                  ? "Draft ready"
                  : initialDraft
                    ? "Draft restored"
                    : "Draft empty"}
              </span>
            </div>
          )}

          <div className="chat-log" ref={logRef}>
            {isMinimal && messages.length === 0 && (
              <div className="chat-empty chat-empty-minimal">
                <p className="card-kicker">New thread</p>
                <h3>Ready.</h3>
              </div>
            )}

            {!isMinimal && messages.length === 0 && (
              <div className="chat-empty">New thread</div>
            )}

            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`chat-row ${isUser ? "chat-row-user" : "chat-row-assistant"}`}
                >
                  <div
                    className={`chat-bubble ${isUser ? "chat-bubble-user" : "chat-bubble-assistant"}`}
                  >
                    {isUser ? (
                      <>
                        <p>{message.content}</p>
                        {message.attachments?.length ? (
                          <div
                            className="chat-attachment-list"
                            aria-label="Files sent with this message"
                          >
                            {message.attachments.map((attachment) => (
                              <span
                                key={attachment.id}
                                className="chat-attachment-chip"
                              >
                                <FileText className="h-3.5 w-3.5" aria-hidden />
                                <span>{attachment.name}</span>
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <MarkdownMessage
                          content={message.content}
                          className="chat-markdown"
                        />
                        {extractSearchQueries(message.content).length > 0 && (
                          <div className="chat-loop-actions">
                            {extractSearchQueries(message.content).map(
                              (query) => (
                                <button
                                  key={`${message.id}-${query}`}
                                  type="button"
                                  className="chat-loop-chip"
                                  onClick={() => {
                                    trackUsage("chat.loop.search");
                                    runSearchFromChat(query);
                                  }}
                                >
                                  Search: {query}
                                </button>
                              ),
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {busy && (
              <div className="chat-row chat-row-assistant">
                <div className="chat-bubble chat-bubble-assistant chat-bubble-loading">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking
                </div>
              </div>
            )}
          </div>

          {error && <div className="status-line status-error">{error}</div>}
          {copyNote && !error && <div className="status-line">{copyNote}</div>}

          <form
            className={`chat-compose ${draggingUpload ? "chat-compose-dragging" : ""}`}
            onSubmit={sendMessage}
            onDragOver={(event) => {
              event.preventDefault();
              setDraggingUpload(true);
            }}
            onDragLeave={() => setDraggingUpload(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDraggingUpload(false);
              void addAttachments(event.dataTransfer.files);
            }}
          >
            <label
              htmlFor="family-chat-input"
              className={isMinimal ? "sr-only" : "input-callout"}
            >
              <span>Message</span>
              <strong>Message House Chat</strong>
            </label>
            <textarea
              id="family-chat-input"
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                isMinimal
                  ? "Type here..."
                  : "Type here..."
              }
              rows={isMinimal ? 3 : 5}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
            />
            {attachments.length > 0 && (
              <div
                className="chat-attachment-tray"
                aria-label="Files attached for House Chat"
              >
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="chat-attachment-pill">
                    <FileText className="h-4 w-4" aria-hidden />
                    <div>
                      <strong>{attachment.name}</strong>
                      <span>
                        {formatChatFileSize(attachment.size)}
                        {attachment.previewable
                          ? attachment.truncated
                            ? " - text preview clipped"
                            : " - text preview ready"
                          : " - file name only"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="chat-attachment-remove"
                      onClick={() => removeAttachment(attachment.id)}
                      aria-label={`Remove ${attachment.name}`}
                      disabled={busy}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="chat-compose-actions">
              <div className="chat-compose-left">
                <input
                  id="family-chat-files"
                  ref={fileInputRef}
                  className="sr-only"
                  type="file"
                  multiple
                  aria-label="Attach files for House Chat"
                  onChange={(event) => {
                    const { files } = event.currentTarget;
                    if (files) void addAttachments(files);
                    event.currentTarget.value = "";
                  }}
                />
                <label
                  htmlFor="family-chat-files"
                  className="chat-attach-button"
                >
                  <Paperclip className="h-4 w-4" aria-hidden />
                  <span>Attach</span>
                </label>
                {!isMinimal && (
                  <div className="chat-footnote">
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    {draftWords > 0
                      ? `${draftWords} draft words`
                      : `${messages.length} thread items`}
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={busy || !canSend}
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
