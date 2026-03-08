import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { addMonitoredRepo, listMonitoredRepos } from "../src/lib/monitored-repos-store";

test("monitored repo store serializes concurrent writes", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cvesearch-monitored-repos-"));
  const previous = process.env.MONITORED_REPOS_FILE;
  process.env.MONITORED_REPOS_FILE = path.join(tempDir, "monitored-repos.json");

  try {
    const userId = "user-monitored";
    await Promise.all([
      addMonitoredRepo(userId, { githubId: 1, fullName: "acme/api", htmlUrl: "https://example.test/acme/api", isPrivate: true, defaultBranch: "main" }),
      addMonitoredRepo(userId, { githubId: 2, fullName: "acme/web", htmlUrl: "https://example.test/acme/web", isPrivate: true, defaultBranch: "main" }),
      addMonitoredRepo(userId, { githubId: 3, fullName: "acme/worker", htmlUrl: "https://example.test/acme/worker", isPrivate: false, defaultBranch: "main" }),
    ]);

    const repos = await listMonitoredRepos(userId);
    assert.equal(repos.length, 3);
    assert.deepEqual(
      repos.map((repo) => repo.fullName).sort(),
      ["acme/api", "acme/web", "acme/worker"]
    );
  } finally {
    if (previous === undefined) {
      delete process.env.MONITORED_REPOS_FILE;
    } else {
      process.env.MONITORED_REPOS_FILE = previous;
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("monitored repos are isolated per session user and allow the same full name in separate workspaces", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cvesearch-monitored-repos-scope-"));
  const previousDatabaseFile = process.env.DATABASE_FILE;
  process.env.DATABASE_FILE = path.join(tempDir, "monitored-repos.db");

  try {
    await addMonitoredRepo("user-a", {
      githubId: 1,
      fullName: "acme/api",
      htmlUrl: "https://example.test/acme/api",
      isPrivate: true,
      defaultBranch: "main",
    });
    await addMonitoredRepo("user-b", {
      githubId: 1,
      fullName: "acme/api",
      htmlUrl: "https://example.test/acme/api",
      isPrivate: true,
      defaultBranch: "main",
    });

    assert.equal((await listMonitoredRepos("user-a")).length, 1);
    assert.equal((await listMonitoredRepos("user-b")).length, 1);
  } finally {
    if (previousDatabaseFile === undefined) {
      delete process.env.DATABASE_FILE;
    } else {
      process.env.DATABASE_FILE = previousDatabaseFile;
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
