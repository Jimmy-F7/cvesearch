import assert from "node:assert/strict";
import test from "node:test";
import { extractFixedVersion } from "../src/lib/ai-fix";

test("extractFixedVersion chooses the nearest upgrade branch above the installed version", () => {
  const result = extractFixedVersion(
    {
      id: "GHSA-6frx-j292-c844",
      summary: "TYPO3 Allows Privilege Escalation to System Maintainer",
      details: "",
      aliases: [],
      severity: [],
      references: [],
      published: "2026-01-01T00:00:00Z",
      modified: "2026-01-02T00:00:00Z",
      affected: [
        {
          package: {
            name: "typo3/cms-core",
            ecosystem: "Packagist",
          },
          ranges: [
            {
              type: "ECOSYSTEM",
              events: [
                { introduced: "10.4.0" },
                { fixed: "10.4.50" },
                { introduced: "11.5.0" },
                { fixed: "11.5.44" },
                { introduced: "12.4.0" },
                { fixed: "12.4.37" },
                { introduced: "13.4.0" },
                { fixed: "13.4.12" },
              ],
            },
          ],
        },
      ],
    },
    "typo3/cms-core",
    "13.4.0"
  );

  assert.equal(result, "13.4.12");
});

test("extractFixedVersion returns null when all fixed events are at or below the installed version", () => {
  const result = extractFixedVersion(
    {
      id: "GHSA-example",
      summary: "Example vulnerability",
      details: "",
      aliases: [],
      severity: [],
      references: [],
      published: "2026-01-01T00:00:00Z",
      modified: "2026-01-02T00:00:00Z",
      affected: [
        {
          package: {
            name: "vendor/package",
            ecosystem: "npm",
          },
          ranges: [
            {
              type: "ECOSYSTEM",
              events: [
                { introduced: "1.0.0" },
                { fixed: "1.2.3" },
              ],
            },
          ],
        },
      ],
    },
    "vendor/package",
    "1.2.3"
  );

  assert.equal(result, null);
});
