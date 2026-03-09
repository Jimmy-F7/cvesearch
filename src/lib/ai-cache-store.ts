import { getDb } from "./db";
import { AIFeature } from "./types";

export interface AICacheEntry {
  outputJson: string;
  createdAt: string;
}

export function getAICacheEntry(userId: string, feature: AIFeature, entityId: string): AICacheEntry | null {
  const row = getDb().prepare(`
    SELECT output_json as outputJson, created_at as createdAt
    FROM ai_cache
    WHERE user_id = ? AND feature = ? AND entity_id = ?
  `).get(userId, feature, entityId) as AICacheEntry | undefined;
  return row ?? null;
}

export function setAICacheEntry(userId: string, feature: AIFeature, entityId: string, outputJson: string): void {
  getDb().prepare(`
    INSERT OR REPLACE INTO ai_cache (user_id, feature, entity_id, output_json, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, feature, entityId, outputJson, new Date().toISOString());
}

export function deleteAICacheEntry(userId: string, feature: AIFeature, entityId: string): void {
  getDb().prepare(`
    DELETE FROM ai_cache WHERE user_id = ? AND feature = ? AND entity_id = ?
  `).run(userId, feature, entityId);
}

export function clearAICacheForUserFeature(userId: string, feature: AIFeature): void {
  getDb().prepare(`
    DELETE FROM ai_cache WHERE user_id = ? AND feature = ?
  `).run(userId, feature);
}

export function clearAICacheForUser(userId: string): void {
  getDb().prepare("DELETE FROM ai_cache WHERE user_id = ?").run(userId);
}
