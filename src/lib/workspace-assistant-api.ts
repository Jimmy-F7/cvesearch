import { WorkspaceConversationRecord } from "./workspace-types";

async function fetchWorkspaceAssistantAPI<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Workspace assistant API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export function listWorkspaceConversationsAPI(): Promise<WorkspaceConversationRecord[]> {
  return fetchWorkspaceAssistantAPI<WorkspaceConversationRecord[]>("/api/workspace/conversations");
}

export function createWorkspaceConversationAPI(input?: { title?: string; prompt?: string }): Promise<WorkspaceConversationRecord> {
  return fetchWorkspaceAssistantAPI<WorkspaceConversationRecord>("/api/workspace/conversations", {
    method: "POST",
    body: JSON.stringify(input ?? {}),
  });
}

export function getWorkspaceConversationAPI(id: string): Promise<WorkspaceConversationRecord> {
  return fetchWorkspaceAssistantAPI<WorkspaceConversationRecord>(`/api/workspace/conversations/${encodeURIComponent(id)}`);
}

export function appendWorkspaceMessageAPI(id: string, prompt: string): Promise<WorkspaceConversationRecord> {
  return fetchWorkspaceAssistantAPI<WorkspaceConversationRecord>(`/api/workspace/conversations/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}
