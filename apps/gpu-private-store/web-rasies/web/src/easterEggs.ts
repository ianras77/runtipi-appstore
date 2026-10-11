export const dadJokes = [
  'I tried to tell a UDP joke... but I’m not sure you got it.',
  'My server and I have a lot in common. We both need good backups to feel safe.',
  'I told the router a joke. It forwarded it to everyone.',
  'Why did the SSL cert break up? Too many issues with trust.',
  'I asked Authentik for a date. It said: prove your identity first.',
  'My Docker containers are like toddlers: quiet is suspicious.',
  'I wanted a pun about SearXNG... but I couldn’t find it.',
  'House Chat asked me to be concise. So I said: barely.',
  'I renamed my NAS to Dadabase. It stores only father facts.',
  'I tried to optimize latency… now my coffee loads faster too.',
  'I told the cloud a joke. It started to rain on my parade.',
  'I asked the firewall for a hug. It said: access denied.'
];

export const KONAMI_SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a'
];

export function normalizeSecretKey(value: string) {
  return value.length === 1 ? value.toLowerCase() : value;
}

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName;
  return target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}

export function attachKonami(onActivate: () => void) {
  let idx = 0;
  const handler = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target)) return;
    const key = normalizeSecretKey(e.key);
    if (key === KONAMI_SEQUENCE[idx]) {
      idx += 1;
      if (idx === KONAMI_SEQUENCE.length) {
        idx = 0;
        onActivate();
      }
    } else {
      idx = 0;
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}
