const WATCHLIST_STORAGE_KEY = "cvesearch.watchlist";
export const WATCHLIST_UPDATED_EVENT = "cvesearch:watchlist-updated";

export function readWatchlist(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export function writeWatchlist(ids: string[]): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(WATCHLIST_UPDATED_EVENT));
}

export function toggleWatchlistItem(id: string): string[] {
  const current = readWatchlist();
  const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current];
  writeWatchlist(next);
  return next;
}

export function isWatchlisted(id: string): boolean {
  return readWatchlist().includes(id);
}
