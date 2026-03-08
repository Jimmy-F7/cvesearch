export const WATCHLIST_UPDATED_EVENT = "cvesearch:watchlist-updated";

let watchlistCache: string[] = [];
let watchlistLoaded = false;
let watchlistPromise: Promise<string[]> | null = null;

export async function loadWatchlist(): Promise<string[]> {
  if (watchlistLoaded) {
    return watchlistCache;
  }

  if (watchlistPromise) {
    return watchlistPromise;
  }

  watchlistPromise = fetchWatchlist()
    .then((next) => {
      watchlistCache = next;
      watchlistLoaded = true;
      return next;
    })
    .catch(() => watchlistCache)
    .finally(() => {
      watchlistPromise = null;
    });

  return watchlistPromise;
}

export function readWatchlist(): string[] {
  return watchlistCache;
}

export async function toggleWatchlistItem(id: string): Promise<string[]> {
  const next = await fetchWatchlistMutation(id);
  watchlistCache = next;
  watchlistLoaded = true;
  dispatchWatchlistUpdated();
  return next;
}

export async function removeWatchlistItems(ids: string[]): Promise<string[]> {
  const res = await fetch("/api/watchlist", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });

  if (!res.ok) {
    throw new Error("Failed to remove watchlist items");
  }

  const data = await res.json().catch(() => []);
  const next = Array.isArray(data) ? data.filter((value): value is string => typeof value === "string") : [];
  watchlistCache = next;
  watchlistLoaded = true;
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
