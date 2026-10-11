type UsageMap = Record<string, number>;

const USAGE_KEY = 'rasies_usage_metrics_v1';
const UPDATE_EVENT = 'rasies:usage-updated';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getUsageSnapshot(): UsageMap {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(USAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as UsageMap;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

export function trackUsage(key: string) {
  if (!canUseStorage() || !key) return;
  const current = getUsageSnapshot();
  current[key] = (current[key] ?? 0) + 1;
  try {
    window.localStorage.setItem(USAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { key, value: current[key] } }));
  } catch {
    /* ignore */
  }
}

export function onUsageUpdate(handler: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const wrapped = () => handler();
  window.addEventListener(UPDATE_EVENT, wrapped);
  window.addEventListener('storage', wrapped);
  return () => {
    window.removeEventListener(UPDATE_EVENT, wrapped);
    window.removeEventListener('storage', wrapped);
  };
}
