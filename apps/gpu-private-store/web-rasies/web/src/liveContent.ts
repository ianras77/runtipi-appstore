import { useEffect, useState } from 'react';

const LIVE_REFRESH_MS = 1000 * 20;

export type QueryState<T> = {
  loading: boolean;
  error: string | null;
  data: T | null;
};

export function useLiveJson<T>(url: string, unavailableMessage: string) {
  const [state, setState] = useState<QueryState<T>>({
    loading: true,
    error: null,
    data: null
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return () => undefined;
    }

    let active = true;
    let currentController: AbortController | null = null;

    const refresh = async ({ background = false }: { background?: boolean } = {}) => {
      currentController?.abort();
      const controller = new AbortController();
      currentController = controller;

      if (!background) {
        setState((previous) => ({
          loading: previous.data === null,
          error: null,
          data: previous.data
        }));
      }

      try {
        const response = await fetch(url, {
          cache: 'no-store',
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as T;
        if (!active || controller.signal.aborted || currentController !== controller) {
          return;
        }

        setState({
          loading: false,
          error: null,
          data
        });
      } catch (err: unknown) {
        if (!active || controller.signal.aborted || currentController !== controller) {
          return;
        }

        const message = err instanceof Error ? err.message : unavailableMessage;
        setState((previous) =>
          previous.data
            ? {
                loading: false,
                error: null,
                data: previous.data
              }
            : {
                loading: false,
                error: message,
                data: null
              }
        );
      } finally {
        if (currentController === controller) {
          currentController = null;
        }
      }
    };

    const refreshIfVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void refresh({ background: true });
    };

    void refresh();

    const intervalId = window.setInterval(refreshIfVisible, LIVE_REFRESH_MS);
    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      active = false;
      currentController?.abort();
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [unavailableMessage, url]);

  return state;
}
