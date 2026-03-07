import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createProject, addProjectItem } from "../src/lib/projects-store";
import { getOrCreateWorkspaceSession } from "../src/lib/auth-session";
import { answerWorkspaceQuestion } from "../src/lib/workspace-assistant";
import { toggleWatchlistEntry } from "../src/lib/workspace-store";

test("workspace assistant answers with project and watchlist context", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cvesearch-workspace-assistant-"));
  const previousDatabaseFile = process.env.DATABASE_FILE;
  process.env.DATABASE_FILE = path.join(tempDir, "workspace-assistant.db");

  try {
    const session = getOrCreateWorkspaceSession(new Request("https://example.test/workspace"));
    await toggleWatchlistEntry(session.userId, "CVE-2026-5555");
    const project = await createProject({ name: "Incident Delta", owner: "Alex", status: "at_risk" });
    await addProjectItem(project.id, {
      cveId: "CVE-2026-5555",
      owner: "Alex",
      remediationState: "in_progress",
    });

    const answer = await answerWorkspaceQuestion("Show project SLA risk and watchlist status", session.userId);

    assert.match(answer.message.content, /Workspace summary:/);
    assert.match(answer.message.content, /Watchlist focus:/);
    assert.match(answer.message.content, /Project flow:/);
    assert.ok(answer.message.references.some((reference) => reference.startsWith("project:")));
  } finally {
    if (previousDatabaseFile === undefined) {
      delete process.env.DATABASE_FILE;
    } else {
      process.env.DATABASE_FILE = previousDatabaseFile;
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
