import { NotificationDeliveryRecord, NotificationPreferenceRecord } from "./workspace-types";

interface NotificationsPayload {
  preferences: NotificationPreferenceRecord[];
  deliveries: NotificationDeliveryRecord[];
}

async function fetchNotificationsAPI<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Notifications API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export function loadNotifications(): Promise<NotificationsPayload> {
  return fetchNotificationsAPI<NotificationsPayload>("/api/notifications");
}

export function createNotificationPreference(
  input: Pick<NotificationPreferenceRecord, "teamName" | "channel" | "destination" | "cadence">
): Promise<NotificationPreferenceRecord> {
  return fetchNotificationsAPI<NotificationPreferenceRecord>("/api/notifications", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateNotificationPreference(
  id: string,
  input: Partial<Pick<NotificationPreferenceRecord, "teamName" | "channel" | "destination" | "cadence" | "enabled">>
): Promise<NotificationPreferenceRecord> {
  return fetchNotificationsAPI<NotificationPreferenceRecord>(`/api/notifications/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteNotificationPreference(id: string): Promise<{ success: boolean }> {
  return fetchNotificationsAPI<{ success: boolean }>(`/api/notifications/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function runNotificationDigests(input?: { preview?: boolean; preferenceId?: string }): Promise<NotificationDeliveryRecord[]> {
  return fetchNotificationsAPI<NotificationDeliveryRecord[]>("/api/notifications/run", {
    method: "POST",
    body: JSON.stringify(input ?? {}),
  });
}
