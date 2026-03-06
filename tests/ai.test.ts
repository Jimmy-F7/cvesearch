import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHeuristicCveInsight,
  buildHeuristicDigest,
  getServerAIConfigurationSummary,
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

test("getServerAIConfigurationSummary applies per-feature provider and model overrides", () => {
  const previous = {
    AI_PROVIDER: process.env.AI_PROVIDER,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    AI_SEARCH_ASSISTANT_PROVIDER: process.env.AI_SEARCH_ASSISTANT_PROVIDER,
    AI_SEARCH_ASSISTANT_MODEL: process.env.AI_SEARCH_ASSISTANT_MODEL,
    AI_CVE_INSIGHT_PROVIDER: process.env.AI_CVE_INSIGHT_PROVIDER,
    AI_CVE_INSIGHT_MODEL: process.env.AI_CVE_INSIGHT_MODEL,
    AI_DAILY_DIGEST_PROVIDER: process.env.AI_DAILY_DIGEST_PROVIDER,
    AI_DAILY_DIGEST_MODEL: process.env.AI_DAILY_DIGEST_MODEL,
  };

  process.env.AI_PROVIDER = "openai";
  process.env.OPENAI_API_KEY = "test-openai-key";
  process.env.OPENAI_MODEL = "gpt-global";
  process.env.AI_SEARCH_ASSISTANT_PROVIDER = "heuristic";
  process.env.AI_SEARCH_ASSISTANT_MODEL = "ignored-search-model";
  process.env.AI_CVE_INSIGHT_PROVIDER = "openai";
  process.env.AI_CVE_INSIGHT_MODEL = "gpt-cve";
  process.env.AI_DAILY_DIGEST_PROVIDER = "openai";
  process.env.AI_DAILY_DIGEST_MODEL = "gpt-digest";

  try {
    const summary = getServerAIConfigurationSummary();
    const search = summary.featureConfigurations.find((item) => item.feature === "search_assistant");
    const cveInsight = summary.featureConfigurations.find((item) => item.feature === "cve_insight");
    const digest = summary.featureConfigurations.find((item) => item.feature === "daily_digest");

    assert.equal(summary.provider, "openai");
    assert.equal(summary.model, "gpt-global");
    assert.equal(search?.provider, "heuristic");
    assert.equal(search?.mode, "heuristic");
    assert.equal(search?.model, "");
    assert.equal(cveInsight?.provider, "openai");
    assert.equal(cveInsight?.model, "gpt-cve");
    assert.equal(digest?.provider, "openai");
    assert.equal(digest?.model, "gpt-digest");
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});
