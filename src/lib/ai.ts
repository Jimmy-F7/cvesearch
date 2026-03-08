import { AISettings } from "./types";
import { callAnthropicText } from "./anthropic-client";
import { callOpenAIText } from "./openai-client";

export {
  buildHeuristicAlertInvestigation,
  buildHeuristicCveInsight,
  buildHeuristicDigest,
  buildHeuristicExposureAssessment,
  buildHeuristicProjectSummary,
  buildHeuristicRemediationPlan,
  buildHeuristicTriageSuggestion,
  buildHeuristicWatchlistReview,
  generateAlertInvestigation,
  generateCveInsight,
  generateDigest,
  generateExposureAssessment,
  generateProjectSummary,
  generateRemediationPlan,
  generateSearchInterpretation,
  generateTriageSuggestion,
  generateWatchlistReview,
  getRecentAIRuns,
  getServerAIConfigurationSummary,
  interpretSearchPromptHeuristically,
  preparePromptInputForFeature,
} from "./ai-service";

export type {
  AlertInvestigationInput,
  CveInsightInput,
  DigestInput,
  ExposureAssessmentInput,
  ProjectSummaryInput,
  RemediationPlanInput,
  ServerAIConfigurationSummary,
  TriageSuggestionInput,
  WatchlistReviewInput,
} from "./ai-service";

const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
const DEFAULT_ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

export async function callModel(prompt: string, settings: AISettings): Promise<string> {
  if (settings.provider === "anthropic") {
    return callAnthropic(prompt, settings);
  }

  return callOpenAI(prompt, settings);
}

export function resolveAISettings(settings?: Pick<Partial<AISettings>, "provider" | "model">): AISettings {
  const provider = settings?.provider ?? (process.env.OPENAI_API_KEY ? "openai" : "heuristic");
  const apiKey =
    (provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY) ??
    "";
  const model =
    settings?.model ??
    (provider === "anthropic" ? process.env.ANTHROPIC_MODEL : process.env.OPENAI_MODEL) ??
    "";

  if (provider !== "heuristic" && !apiKey) {
    return {
      provider: "heuristic",
      model: "",
      apiKey: "",
    };
  }

  return {
    provider,
    model,
    apiKey,
  };
}

async function callOpenAI(prompt: string, settings: AISettings): Promise<string> {
  return callOpenAIText({
    apiKey: settings.apiKey,
    model: settings.model || DEFAULT_OPENAI_MODEL,
    prompt,
    instructions: "Return only JSON. No markdown. No prose outside JSON.",
  });
}

async function callAnthropic(prompt: string, settings: AISettings): Promise<string> {
  return callAnthropicText({
    apiKey: settings.apiKey,
    model: settings.model || DEFAULT_ANTHROPIC_MODEL,
    prompt,
    maxTokens: 800,
    temperature: 0.2,
  });
}
