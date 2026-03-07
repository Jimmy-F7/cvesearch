import { getDb } from "./db";
import { WorkspaceConversationMessage, WorkspaceConversationRecord } from "./workspace-types";

interface ConversationRow {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface MessageRow {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  referencesJson: string;
}

export async function listWorkspaceConversationsForUser(userId: string): Promise<WorkspaceConversationRecord[]> {
  const rows = getDb().prepare(`
    SELECT id, title, created_at as createdAt, updated_at as updatedAt
    FROM user_workspace_conversations
    WHERE user_id = ?
    ORDER BY updated_at DESC, created_at DESC
  `).all(userId) as ConversationRow[];

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    messages: [],
  }));
}

export async function getWorkspaceConversationForUser(userId: string, conversationId: string): Promise<WorkspaceConversationRecord | null> {
  const row = getDb().prepare(`
    SELECT id, title, created_at as createdAt, updated_at as updatedAt
    FROM user_workspace_conversations
    WHERE user_id = ? AND id = ?
  `).get(userId, conversationId) as ConversationRow | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    messages: listConversationMessages(conversationId),
  };
}

export async function createWorkspaceConversationForUser(userId: string, title: string): Promise<WorkspaceConversationRecord> {
  const now = new Date().toISOString();
  const record: WorkspaceConversationRecord = {
    id: crypto.randomUUID(),
    title: title.trim() || "Workspace conversation",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };

  getDb().prepare(`
    INSERT INTO user_workspace_conversations (id, user_id, title, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(record.id, userId, record.title, record.createdAt, record.updatedAt);

  return record;
}

export async function appendWorkspaceConversationMessages(
  userId: string,
  conversationId: string,
  messages: WorkspaceConversationMessage[]
): Promise<WorkspaceConversationRecord | null> {
  const existing = await getWorkspaceConversationForUser(userId, conversationId);
  if (!existing) {
    return null;
  }

  const insert = getDb().prepare(`
    INSERT INTO user_workspace_messages (id, conversation_id, role, content, created_at, references_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const message of messages) {
    insert.run(
      message.id,
      conversationId,
      message.role,
      message.content,
      message.createdAt,
      JSON.stringify(message.references)
    );
  }

  const updatedAt = messages[messages.length - 1]?.createdAt ?? new Date().toISOString();
  getDb().prepare(`
    UPDATE user_workspace_conversations
    SET updated_at = ?
    WHERE user_id = ? AND id = ?
  `).run(updatedAt, userId, conversationId);

  return getWorkspaceConversationForUser(userId, conversationId);
}

function listConversationMessages(conversationId: string): WorkspaceConversationMessage[] {
  const rows = getDb().prepare(`
    SELECT id, role, content, created_at as createdAt, references_json as referencesJson
    FROM user_workspace_messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC, rowid ASC
  `).all(conversationId) as MessageRow[];

  return rows.map((row) => ({
    id: row.id,
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
    createdAt: row.createdAt,
    references: parseReferences(row.referencesJson),
  }));
}

function parseReferences(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
