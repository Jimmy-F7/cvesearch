import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { addProjectItem, createProject, normalizeProjectName, removeProjectItem } from "../src/lib/projects-store";

test("normalizeProjectName trims and collapses whitespace", () => {
  assert.equal(normalizeProjectName("  Incident   Alpha   "), "Incident Alpha");
});

test("project store records bounded activity history for create and item changes", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "cvesearch-projects-"));
  const previous = process.env.PROJECTS_FILE;
  process.env.PROJECTS_FILE = path.join(tempDir, "projects.json");

  try {
    const userId = "user-projects";
    const project = await createProject(userId, { name: "Incident Alpha" });
    const withItem = await addProjectItem(userId, project.id, { cveId: "CVE-2026-1111", note: "Investigate first" });
    const withoutItem = await removeProjectItem(userId, project.id, "CVE-2026-1111");

    assert.ok(withItem);
    assert.ok(withoutItem);
    assert.equal(project.activity[0]?.action, "project_created");
    assert.equal(withItem?.activity[0]?.action, "project_item_added");
    assert.equal(withoutItem?.activity[0]?.action, "project_item_removed");
    assert.equal(withoutItem?.activity.length, 3);
  } finally {
    if (previous === undefined) {
      delete process.env.PROJECTS_FILE;
    } else {
      process.env.PROJECTS_FILE = previous;
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
