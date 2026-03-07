import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { getOrCreateWorkspaceSession } from "../src/lib/auth-session";
import {
  createAlertRuleForUser,
  createSavedViewForUser,
  listAlertRulesForUser,
  listSavedViewsForUser,
  listWatchlist,
  readTriageRecordForUser,
  toggleWatchlistEntry,
  writeTriageRecordForUser,
} from "../src/lib/workspace-store";
import { createDefaultTriageRecord } from "../src/lib/triage-shared";

test("workspace stores are isolated per session user", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cvesearch-workspace-"));
  const previousDatabaseFile = process.env.DATABASE_FILE;
  process.env.DATABASE_FILE = path.join(tempDir, "workspace.db");

  try {
    const sessionA = getOrCreateWorkspaceSession(new Request("https://example.test/api/watchlist"));
    const sessionB = getOrCreateWorkspaceSession(new Request("https://example.test/api/watchlist"));

    await toggleWatchlistEntry(sessionA.userId, "CVE-2026-1111");
    await createSavedViewForUser(sessionA.userId, "Critical OpenSSL", {
      query: "openssl",
      vendor: "",
      product: "openssl",
      cwe: "",
      since: "",
      minSeverity: "CRITICAL",
      sort: "risk_desc",
      page: 1,
      perPage: 20,
    });
    await createAlertRuleForUser(sessionA.userId, "OpenSSL Alert", {
      query: "openssl",
      vendor: "",
      product: "openssl",
      cwe: "",
      since: "",
      minSeverity: "HIGH",
      sort: "risk_desc",
      page: 1,
      perPage: 20,
    });
    await writeTriageRecordForUser(sessionA.userId, {
      ...createDefaultTriageRecord("CVE-2026-1111"),
      status: "investigating",
      owner: "Rupert",
      notes: "Investigating impact",
      tags: ["internet-facing"],
      updatedAt: new Date().toISOString(),
    });

    assert.deepEqual(await listWatchlist(sessionA.userId), ["CVE-2026-1111"]);
    assert.equal((await listSavedViewsForUser(sessionA.userId)).length, 1);
    assert.equal((await listAlertRulesForUser(sessionA.userId)).length, 1);
    assert.equal((await readTriageRecordForUser(sessionA.userId, "CVE-2026-1111")).status, "investigating");

    assert.deepEqual(await listWatchlist(sessionB.userId), []);
    assert.equal((await listSavedViewsForUser(sessionB.userId)).length, 0);
    assert.equal((await listAlertRulesForUser(sessionB.userId)).length, 0);
    assert.equal((await readTriageRecordForUser(sessionB.userId, "CVE-2026-1111")).status, "new");
  } finally {
    if (previousDatabaseFile === undefined) {
      delete process.env.DATABASE_FILE;
    } else {
      process.env.DATABASE_FILE = previousDatabaseFile;
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
