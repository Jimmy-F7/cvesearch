import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCVEDetail,
  parseCVESummaryList,
  parseCWEData,
  parseEPSSResponse,
  parseKnownExploitedCatalog,
  parseStringList,
} from "../src/lib/validation";

test("parseCVESummaryList accepts a basic CVE list", () => {
  const data = parseCVESummaryList([
    { id: "CVE-2026-0001", summary: "Example" },
    { id: "CVE-2026-0002" },
  ]);

  assert.equal(data.length, 2);
  assert.equal(data[0].id, "CVE-2026-0001");
});

test("parseCVESummaryList skips malformed entries instead of failing the whole list", () => {
  const data = parseCVESummaryList([
    { id: "CVE-2026-0001", summary: "Example" },
    { summary: "Missing id" },
    null,
    { id: "CVE-2026-0002" },
  ]);

  assert.deepEqual(
    data.map((item) => item.id),
    ["CVE-2026-0001", "CVE-2026-0002"]
  );
});

test("parseCVESummaryList prefers CVE aliases and deduplicates by canonical id", () => {
  const data = parseCVESummaryList([
    { id: "GHSA-aaaa-bbbb-cccc", aliases: ["CVE-2026-3333"] },
    { id: "CVE-2026-3333" },
  ]);

  assert.equal(data.length, 1);
  assert.equal(data[0].id, "CVE-2026-3333");
  assert.equal(data[0].sourceId, "GHSA-aaaa-bbbb-cccc");
});

test("parseCVEDetail rejects missing ids", () => {
  assert.throws(() => parseCVEDetail({ summary: "Missing id" }), /missing an id/);
});

test("parseCVEDetail accepts cveMetadata.cveId when top-level id is missing", () => {
  const detail = parseCVEDetail({
    cveMetadata: {
      cveId: "CVE-2026-2836",
    },
    aliases: ["GHSA-example-1234"],
  });

  assert.equal(detail.id, "CVE-2026-2836");
  assert.deepEqual(detail.aliases, ["GHSA-example-1234"]);
});

test("parseStringList rejects mixed arrays", () => {
  assert.throws(() => parseStringList(["ok", 2], "vendors"), /string list/);
});

test("parseEPSSResponse parses numeric strings", () => {
  const data = parseEPSSResponse({
    data: [{ cve: "CVE-2026-0001", epss: "0.42", percentile: "0.88", date: "2026-03-05" }],
  });

  assert.deepEqual(data, {
    cve: "CVE-2026-0001",
    epss: 0.42,
    percentile: 0.88,
    date: "2026-03-05",
  });
});

test("parseCWEData requires an id", () => {
  assert.throws(() => parseCWEData({ description: "No id" }), /missing an id/);
});

test("parseKnownExploitedCatalog parses KEV entries", () => {
  const data = parseKnownExploitedCatalog({
    catalogVersion: "2026.03.06",
    dateReleased: "2026-03-06T00:00:00.000Z",
    count: 1,
    vulnerabilities: [
      {
        cveID: "CVE-2026-9999",
        vendorProject: "Acme",
        product: "Edge Gateway",
        vulnerabilityName: "Remote Code Execution",
        dateAdded: "2026-03-06",
        shortDescription: "Known exploited vulnerability",
        requiredAction: "Apply the vendor patch.",
        dueDate: "2026-03-20",
        knownRansomwareCampaignUse: "Known",
        cwes: ["CWE-94"],
      },
    ],
  });

  assert.equal(data.length, 1);
  assert.equal(data[0].cveID, "CVE-2026-9999");
  assert.equal(data[0].knownRansomwareCampaignUse, "Known");
  assert.deepEqual(data[0].cwes, ["CWE-94"]);
});
