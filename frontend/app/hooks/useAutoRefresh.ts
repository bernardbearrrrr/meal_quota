import { useEffect, useRef } from "react";

type SilentFetcher = (options: { silent: boolean }) => void | Promise<unknown>;

/**
 * Periodically calls `fetchData({ silent: true })` in the background so data
 * stays fresh without flicker or "Loading..." flashes. The interval is cleaned
 * up on unmount (and when the interval value changes) to avoid memory leaks.
 *
 * The latest `fetchData` is kept in a ref so re-renders don't reset the timer,
 * which keeps navigation and polling smooth.
 */
export function useAutoRefresh(fetchData: SilentFetcher, interval = 3000): void {
  const savedFetch = useRef(fetchData);

  useEffect(() => {
    savedFetch.current = fetchData;
  }, [fetchData]);

  useEffect(() => {
    if (interval <= 0) {
      return;
    }

    const id = setInterval(() => {
      void savedFetch.current({ silent: true });
    }, interval);

    return () => clearInterval(id);
  }, [interval]);
}
