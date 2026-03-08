import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createProject } from "../src/lib/projects-store";
import {
  createNotificationPreferenceForUser,
  listNotificationDeliveriesForUser,
  runDueNotificationDigestsForUser,
} from "../src/lib/notifications-store";
import { getOrCreateWorkspaceSession } from "../src/lib/auth-session";
import { toggleWatchlistEntry } from "../src/lib/workspace-store";

test("notification store creates delivery records for due digests", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cvesearch-notifications-"));
  const previousDatabaseFile = process.env.DATABASE_FILE;
  process.env.DATABASE_FILE = path.join(tempDir, "notifications.db");

  try {
    const session = getOrCreateWorkspaceSession(new Request("https://example.test/workspace"));
    await toggleWatchlistEntry(session.userId, "CVE-2026-7777");
    await createProject(session.userId, { name: "Digest Project", labels: ["critical"] });
    await createNotificationPreferenceForUser(session.userId, {
      teamName: "Security",
      channel: "in_app",
      destination: "#vuln-ops",
      cadence: "daily",
    });

    const deliveries = await runDueNotificationDigestsForUser(session.userId, { force: true });
    const stored = await listNotificationDeliveriesForUser(session.userId);

    assert.equal(deliveries.length, 1);
    assert.equal(stored.length, 1);
    assert.match(stored[0]?.headline ?? "", /Tracking|digest/i);
  } finally {
    if (previousDatabaseFile === undefined) {
      delete process.env.DATABASE_FILE;
    } else {
      process.env.DATABASE_FILE = previousDatabaseFile;
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
