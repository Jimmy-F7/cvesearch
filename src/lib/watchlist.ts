export const WATCHLIST_UPDATED_EVENT = "cvesearch:watchlist-updated";

let watchlistCache: string[] = [];

export async function loadWatchlist(): Promise<string[]> {
  const next = await fetchWatchlist();
  watchlistCache = next;
  return next;
}

export function readWatchlist(): string[] {
  return watchlistCache;
}

export async function toggleWatchlistItem(id: string): Promise<string[]> {
  const next = await fetchWatchlistMutation(id);
  watchlistCache = next;
  dispatchWatchlistUpdated();
  return next;
}

export function isWatchlisted(id: string): boolean {
  return watchlistCache.includes(id);
}

function dispatchWatchlistUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(WATCHLIST_UPDATED_EVENT));
  }
}

async function fetchWatchlist(): Promise<string[]> {
  const res = await fetch("/api/watchlist", { cache: "no-store" });
  if (!res.ok) {
    return [];
  }

  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? data.filter((value): value is string => typeof value === "string") : [];
}

async function fetchWatchlistMutation(id: string): Promise<string[]> {
  const res = await fetch("/api/watchlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });

  if (!res.ok) {
    throw new Error("Failed to update watchlist");
  }

  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? data.filter((value): value is string => typeof value === "string") : [];
}
