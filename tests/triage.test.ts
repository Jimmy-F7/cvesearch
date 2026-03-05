import assert from "node:assert/strict";
import test from "node:test";
import { getTriageStatusLabel, parseTags } from "../src/lib/triage";

test("parseTags normalizes comma-separated tag input", () => {
  assert.deepEqual(parseTags(" internet-facing, patch-window, internet-facing "), [
    "internet-facing",
    "patch-window",
  ]);
});

test("getTriageStatusLabel returns user-facing labels", () => {
  assert.equal(getTriageStatusLabel("new"), "New");
  assert.equal(getTriageStatusLabel("investigating"), "Investigating");
  assert.equal(getTriageStatusLabel("accepted"), "Accepted Risk");
});
