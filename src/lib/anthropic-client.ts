const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION = "2023-06-01";

interface AnthropicTextRequest {
  apiKey: string;
  model: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
}

export async function callAnthropicText({
  apiKey,
  model,
  prompt,
  maxTokens,
  temperature,
}: AnthropicTextRequest): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_API_VERSION,
    },
    body: JSON.stringify({
      model: model.trim(),
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: "user",
          content: `Return only JSON. No markdown. No prose outside JSON.\n\n${prompt}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw await buildAnthropicError(response);
  }

  const data = await response.json();
  const content = data?.content?.find?.((item: { type?: string }) => item.type === "text")?.text;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Anthropic response did not include content");
  }

  return content;
}

async function buildAnthropicError(response: Response): Promise<Error> {
  let detail = "";

  try {
    const data = await response.json();
    if (data && typeof data === "object") {
      const message = (data as { error?: { message?: unknown }; message?: unknown }).error?.message;
      if (typeof message === "string" && message.trim()) {
        detail = message.trim();
      } else if (typeof (data as { message?: unknown }).message === "string" && (data as { message: string }).message.trim()) {
        detail = (data as { message: string }).message.trim();
      }
    }
  } catch {
  }

  return new Error(detail ? `Anthropic error: ${response.status} - ${detail}` : `Anthropic error: ${response.status}`);
}
