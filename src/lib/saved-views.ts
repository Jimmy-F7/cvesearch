import { buildSearchParams, SearchState } from "./search";
import { SavedView } from "./workspace-types";

export const SAVED_VIEWS_UPDATED_EVENT = "cvesearch:saved-views-updated";

let savedViewsCache: SavedView[] = [];

export type { SavedView };

export async function loadSavedViews(): Promise<SavedView[]> {
  const next = await fetchSavedViews();
  savedViewsCache = next;
  return next;
}

export function readSavedViews(): SavedView[] {
  return savedViewsCache;
}

export async function saveView(name: string, search: SearchState): Promise<SavedView[]> {
  await fetchSavedViewsMutation("/api/saved-views", {
    method: "POST",
    body: JSON.stringify({ name, search }),
  });
  return refreshSavedViews();
}

export async function deleteSavedView(id: string): Promise<SavedView[]> {
  await fetchSavedViewsMutation(`/api/saved-views/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return refreshSavedViews();
}

export function getSavedViewHref(view: SavedView): string {
  const params = buildSearchParams(view.search);
  return params.toString() ? `/?${params.toString()}` : "/";
}

async function refreshSavedViews(): Promise<SavedView[]> {
  const next = await fetchSavedViews();
  savedViewsCache = next;
  dispatchSavedViewsUpdated();
  return next;
}

function dispatchSavedViewsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SAVED_VIEWS_UPDATED_EVENT));
  }
}

async function fetchSavedViews(): Promise<SavedView[]> {
  const res = await fetch("/api/saved-views", { cache: "no-store" });
  if (!res.ok) {
    return [];
  }

  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? data.filter(isSavedView) : [];
}

async function fetchSavedViewsMutation(path: string, init: RequestInit): Promise<void> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    throw new Error("Saved views request failed");
  }
}

function isSavedView(value: unknown): value is SavedView {
  if (!value || typeof value !== "object") return false;

  return (
    "id" in value &&
    "name" in value &&
    "search" in value &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.search === "object"
  );
}
