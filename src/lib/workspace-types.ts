import { SearchState } from "./search";

export interface SavedView {
  id: string;
  name: string;
  search: SearchState;
  createdAt: string;
}

export interface AlertRule {
  id: string;
  name: string;
  search: SearchState;
  createdAt: string;
  lastCheckedAt: string | null;
}
