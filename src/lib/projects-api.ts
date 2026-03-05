import { ProjectRecord } from "./types";

async function fetchProjectsAPI<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Projects API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export function listProjectsAPI(): Promise<ProjectRecord[]> {
  return fetchProjectsAPI<ProjectRecord[]>("/api/projects");
}

export function createProjectAPI(input: { name: string; description?: string }): Promise<ProjectRecord> {
  return fetchProjectsAPI<ProjectRecord>("/api/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteProjectAPI(projectId: string): Promise<{ success: boolean }> {
  return fetchProjectsAPI<{ success: boolean }>(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
  });
}

export function addProjectItemAPI(projectId: string, input: { cveId: string; note?: string }): Promise<ProjectRecord> {
  return fetchProjectsAPI<ProjectRecord>(`/api/projects/${encodeURIComponent(projectId)}/items`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function removeProjectItemAPI(projectId: string, cveId: string): Promise<ProjectRecord> {
  return fetchProjectsAPI<ProjectRecord>(`/api/projects/${encodeURIComponent(projectId)}/items`, {
    method: "DELETE",
    body: JSON.stringify({ cveId }),
  });
}
