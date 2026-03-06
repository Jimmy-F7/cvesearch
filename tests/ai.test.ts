import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHeuristicCveInsight,
  buildHeuristicDigest,
  interpretSearchPromptHeuristically,
} from "../src/lib/ai";

test("interpretSearchPromptHeuristically extracts severity and recent window", () => {
  const result = interpretSearchPromptHeuristically("show me critical OpenSSL vulns from this month");

  assert.equal(result.minSeverity, "CRITICAL");
  assert.equal(result.sort, "cvss_desc");
  assert.match(result.query, /openssl/i);
  assert.notEqual(result.since, "");
  assert.equal(result.appliedFilters.some((filter) => filter.field === "query"), true);
  assert.equal(result.toolCalls.length > 0, true);
  assert.equal(result.needsClarification, false);
});

test("interpretSearchPromptHeuristically requests clarification for underspecified prompts", () => {
  const result = interpretSearchPromptHeuristically("recent");

  assert.equal(result.needsClarification, true);
  assert.match(result.clarificationQuestion, /product|vendor|severity|time window/i);
});

test("buildHeuristicCveInsight produces triage and remediation guidance", () => {
  const result = buildHeuristicCveInsight({
    id: "CVE-2026-1111",
    cvss3: 9.8,
    summary: "Critical issue in OpenSSL",
    aliases: ["GHSA-xxxx-yyyy-zzzz"],
    containers: {
      cna: {
        affected: [{ product: "openssl", vendor: "openssl" }],
      },
    },
  });

  assert.equal(result.triage.priority, "critical");
  assert.equal(result.triage.confidence, "low");
  assert.equal(result.cluster.canonicalId, "CVE-2026-1111");
  assert.equal(result.remediation.length > 0, true);
  assert.equal(result.triage.signals.some((signal) => signal.label === "Severity"), true);
  assert.equal(result.projectContext.projectCount, 0);
});

test("buildHeuristicCveInsight incorporates epss triage workflow and project context", () => {
  const result = buildHeuristicCveInsight({
    detail: {
      id: "CVE-2026-2222",
      cvss3: 7.8,
      summary: "High-severity issue in a web edge component",
      references: ["https://vendor.example/advisory", "https://research.example/exploit-poc"],
      containers: {
        cna: {
          affected: [{ vendor: "acme", product: "edge-proxy" }],
          references: [{ url: "https://vendor.example/patch", tags: ["patch", "vendor-advisory"] }],
        },
      },
    },
    epss: {
      cve: "CVE-2026-2222",
      epss: 0.83,
      percentile: 0.96,
    },
    triage: {
      status: "investigating",
      owner: "edge-platform",
      notes: "Internet-facing service",
      tags: ["internet-facing"],
      updatedAt: "2026-03-06T10:00:00.000Z",
    },
    relatedProjects: [
      {
        name: "Edge Platform",
        updatedAt: "2026-03-06T10:00:00.000Z",
        items: [{ cveId: "CVE-2026-2222", addedAt: "2026-03-06T09:00:00.000Z" }],
      },
    ],
  });

  assert.equal(result.triage.priority, "high");
  assert.equal(result.triage.status, "investigating");
  assert.equal(result.triage.confidence, "high");
  assert.match(result.triage.ownerRecommendation, /edge-platform/i);
  assert.equal(result.triage.signals.some((signal) => signal.label === "EPSS"), true);
  assert.equal(result.triage.signals.some((signal) => signal.label === "Project impact"), true);
  assert.equal(result.projectContext.projectCount, 1);
  assert.deepEqual(result.projectContext.projectNames, ["Edge Platform"]);
});

test("buildHeuristicDigest summarizes watchlist, alerts, and projects", () => {
  const result = buildHeuristicDigest({
    watchlist: [{ id: "CVE-2026-1111" }],
    alerts: [{ name: "Critical OpenSSL", unread: 2, topMatches: ["CVE-2026-1111"] }],
    projects: [{ name: "Incident Alpha", updatedAt: "2026-03-05", items: [{ cveId: "CVE-2026-1111", addedAt: "2026-03-05" }] }],
  });

  assert.match(result.headline, /Critical OpenSSL|Tracking/);
  assert.equal(result.sections.length, 3);
});
