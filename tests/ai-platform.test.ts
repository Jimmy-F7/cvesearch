import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { getServerAIConfigurationSummary, interpretSearchPromptHeuristically } from "../src/lib/ai";

test("AI configuration summary exposes prompt versions and tool registry", () => {
  const summary = getServerAIConfigurationSummary();

  assert.equal(summary.promptTemplates.length >= 3, true);
  assert.equal(summary.promptTemplates.every((template) => template.version.includes("2026-03-07")), true);
  assert.equal(summary.toolRegistry.some((tool) => tool.name === "search_cves"), true);
  assert.equal(summary.toolRegistry.some((tool) => tool.name === "write_triage_state"), true);
});

test("search assistant evaluation fixtures remain stable", () => {
  const fixturePath = path.join(process.cwd(), "tests", "fixtures", "ai-search-evals.json");
  const cases = JSON.parse(readFileSync(fixturePath, "utf8")) as Array<{
    prompt: string;
    expected: {
      minSeverity: string;
      sort: string;
      queryIncludes: string;
      requiresClarification: boolean;
      hasSince: boolean;
    };
  }>;

  for (const item of cases) {
    const result = interpretSearchPromptHeuristically(item.prompt);
    assert.equal(result.minSeverity, item.expected.minSeverity);
    assert.equal(result.sort, item.expected.sort);
    assert.equal(result.needsClarification, item.expected.requiresClarification);
    assert.equal(Boolean(result.since), item.expected.hasSince);

    if (item.expected.queryIncludes) {
      assert.match(result.query.toLowerCase(), new RegExp(item.expected.queryIncludes));
    }
  }
});
