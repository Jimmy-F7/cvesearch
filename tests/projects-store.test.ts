import assert from "node:assert/strict";
import test from "node:test";
import { normalizeProjectName } from "../src/lib/projects-store";

test("normalizeProjectName trims and collapses whitespace", () => {
  assert.equal(normalizeProjectName("  Incident   Alpha   "), "Incident Alpha");
});
