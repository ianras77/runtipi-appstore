function joinParts(parts: string[]) {
  const merged = parts.map((part) => part.trim()).filter(Boolean).join('\n\n').trim();
  return merged.length > 0 ? merged : null;
}

function extractFromContentList(value: unknown) {
  if (!Array.isArray(value)) return null;

  const parts = value
    .map((item) => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return '';
      const record = item as Record<string, unknown>;
      const nested = extractLlmText(record.text) ?? extractLlmText(record.content);
      return nested ?? '';
    })
    .filter((item) => item.trim().length > 0);

  return joinParts(parts);
}

export function extractLlmText(payload: unknown): string | null {
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(payload)) {
    return extractFromContentList(payload);
  }

  if (!payload || typeof payload !== 'object') return null;

  const record = payload as Record<string, unknown>;

  for (const key of ['reply', 'message', 'text', 'answer', 'response']) {
    const direct = extractLlmText(record[key]);
    if (direct) return direct;
  }

  const contentText = extractLlmText(record.content);
  if (contentText) return contentText;

  const choices = record.choices;
  if (Array.isArray(choices)) {
    for (const choice of choices) {
      if (!choice || typeof choice !== 'object') continue;
      const entry = choice as Record<string, unknown>;
      const message = entry.message;
      if (message && typeof message === 'object') {
        const messageRecord = message as Record<string, unknown>;
        const messageText =
          extractLlmText(messageRecord.content) ??
          extractLlmText(messageRecord.reasoning) ??
          extractLlmText(messageRecord.text);
        if (messageText) return messageText;
      }

      const choiceText =
        extractLlmText(entry.text) ??
        extractLlmText(entry.delta) ??
        extractLlmText(entry.content);
      if (choiceText) return choiceText;
    }
  }

  return null;
}
