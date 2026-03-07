import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { addMonitoredRepo } from "../src/lib/monitored-repos-store";
import { listRepoScansForRepo, persistRepoScanResult } from "../src/lib/repo-scans-store";

test("repo scan store persists scan snapshots for monitored repos", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cvesearch-repo-scans-"));
  const previousDatabaseFile = process.env.DATABASE_FILE;
  process.env.DATABASE_FILE = path.join(tempDir, "repo-scans.db");

  try {
    await addMonitoredRepo({
      githubId: 42,
      fullName: "acme/api",
      htmlUrl: "https://github.com/acme/api",
      isPrivate: true,
      defaultBranch: "main",
    });

    await persistRepoScanResult("acme/api", "main", {
      repoFullName: "acme/api",
      scannedAt: new Date().toISOString(),
      dependencyCount: 12,
      locationCount: 3,
      vulnerabilities: [],
    });

    const history = await listRepoScansForRepo("acme/api");
    assert.equal(history.length, 1);
    assert.equal(history[0]?.repoFullName, "acme/api");
    assert.equal(history[0]?.branch, "main");
    assert.equal(history[0]?.dependencyCount, 12);
  } finally {
    if (previousDatabaseFile === undefined) {
      delete process.env.DATABASE_FILE;
    } else {
      process.env.DATABASE_FILE = previousDatabaseFile;
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
