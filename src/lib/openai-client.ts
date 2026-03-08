const OPENAI_CHAT_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_RESPONSES_API_URL = "https://api.openai.com/v1/responses";

interface OpenAITextRequest {
  apiKey: string;
  model: string;
  prompt: string;
  instructions: string;
  temperature?: number;
}

export async function callOpenAIText({
  apiKey,
  model,
  prompt,
  instructions,
  temperature,
}: OpenAITextRequest): Promise<string> {
  const requestModel = model.trim();

  if (shouldUseResponsesAPI(requestModel)) {
    return callResponsesAPI({
      apiKey,
      model: requestModel,
      prompt,
      instructions,
    });
  }

  return callChatCompletionsAPI({
    apiKey,
    model: requestModel,
    prompt,
    instructions,
    temperature,
  });
}

function shouldUseResponsesAPI(model: string): boolean {
  const normalized = model.toLowerCase();
  return (
    normalized.startsWith("gpt-5") ||
    normalized.startsWith("gpt-4.1") ||
    normalized.startsWith("o1") ||
    normalized.startsWith("o3") ||
    normalized.startsWith("o4")
  );
}

async function callResponsesAPI({
  apiKey,
  model,
  prompt,
  instructions,
}: Omit<OpenAITextRequest, "temperature">): Promise<string> {
  const response = await fetch(OPENAI_RESPONSES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      instructions,
      input: prompt,
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
  });

  if (!response.ok) {
    throw await buildOpenAIError(response);
  }

  const data = await response.json();
  const content = extractResponsesText(data);
  if (!content.trim()) {
    throw new Error("OpenAI response did not include content");
  }

  return content;
}

async function callChatCompletionsAPI({
  apiKey,
  model,
  prompt,
  instructions,
  temperature,
}: OpenAITextRequest): Promise<string> {
  const response = await fetch(OPENAI_CHAT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [
        {
          role: "system",
          content: instructions,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw await buildOpenAIError(response);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI response did not include content");
  }

  return content;
}

function extractResponsesText(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "";
  }

  const outputText = (data as { output_text?: unknown }).output_text;
  if (typeof outputText === "string") {
    return outputText;
  }

  const output = (data as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return "";
  }

  const textParts: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const part of content) {
      if (!part || typeof part !== "object") {
        continue;
      }

      const textValue = readTextValue(part as Record<string, unknown>);
      if (textValue) {
        textParts.push(textValue);
      }
    }
  }

  return textParts.join("\n").trim();
}

function readTextValue(part: Record<string, unknown>): string {
  if (typeof part.text === "string") {
    return part.text;
  }

  if (part.text && typeof part.text === "object") {
    const nestedValue = (part.text as { value?: unknown }).value;
    if (typeof nestedValue === "string") {
      return nestedValue;
    }
  }

  return "";
}

async function buildOpenAIError(response: Response): Promise<Error> {
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

  return new Error(detail ? `OpenAI error: ${response.status} - ${detail}` : `OpenAI error: ${response.status}`);
}
