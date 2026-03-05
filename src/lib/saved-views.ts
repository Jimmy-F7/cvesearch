import { buildSearchParams, SearchState } from "./search";

const SAVED_VIEWS_STORAGE_KEY = "cvesearch.saved-views";
export const SAVED_VIEWS_UPDATED_EVENT = "cvesearch:saved-views-updated";

export interface SavedView {
  id: string;
  name: string;
  search: SearchState;
  createdAt: string;
}

export function readSavedViews(): SavedView[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(SAVED_VIEWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSavedView) : [];
  } catch {
    return [];
  }
}

export function saveView(name: string, search: SearchState): SavedView[] {
  const current = readSavedViews();
  const next: SavedView[] = [
    {
      id: crypto.randomUUID(),
      name: name.trim(),
      search,
      createdAt: new Date().toISOString(),
    },
    ...current,
  ];

  writeSavedViews(next);
  return next;
}

export function deleteSavedView(id: string): SavedView[] {
  const next = readSavedViews().filter((view) => view.id !== id);
  writeSavedViews(next);
  return next;
}

export function getSavedViewHref(view: SavedView): string {
  const params = buildSearchParams(view.search);
  return params.toString() ? `/?${params.toString()}` : "/";
}

function writeSavedViews(views: SavedView[]): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(SAVED_VIEWS_STORAGE_KEY, JSON.stringify(views));
  window.dispatchEvent(new CustomEvent(SAVED_VIEWS_UPDATED_EVENT));
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
