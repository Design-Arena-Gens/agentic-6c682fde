import { Anthropic } from "@anthropic-ai/sdk";

type ConversationMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ClaudeResponse = {
  reply: string;
  html: string;
};

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const systemInstruction = `You are an expert JavaScript game developer producing compact, fully contained web games.
Return strictly minified JSON with the shape {"reply": string, "html": string}.
The html key must be a full HTML document that includes <html>, <head>, and <body>.
The game must run entirely client-side with no external network requests, using inline <style> and <script>.
Prefer canvas, CSS, and vanilla JavaScript. Keep the bundle under 100KB, avoid large assets, and provide keyboard and/or pointer controls.`;

const model = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20240620";

export async function POST(request: Request) {
  if (!anthropic.apiKey) {
    return Response.json(
      { error: "Missing ANTHROPIC_API_KEY environment variable." },
      { status: 500 },
    );
  }

  let body: {
    prompt?: string;
    conversation?: ConversationMessage[];
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const prompt = body?.prompt?.trim();

  if (!prompt) {
    return Response.json({ error: "Prompt is required." }, { status: 400 });
  }

  const history = (body.conversation ?? [])
    .slice(-6)
    .map((entry) => {
      const speaker =
        entry.role === "user" ? "Player" : entry.role === "assistant" ? "Architect" : "System";
      return `${speaker}: ${entry.content}`;
    })
    .join("\n");

  const userInstruction = [
    history ? `Conversation so far:\n${history}` : "",
    `Latest request:\n${prompt}`,
    `Respond with JSON as specified. Narrate reasoning inside the "reply" field, focusing on gameplay summary, controls, and iteration ideas.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 3000,
      temperature: 0.4,
      system: systemInstruction,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userInstruction,
            },
          ],
        },
      ],
    });

    const textContent = response.content
      .map((content) => (content.type === "text" ? content.text : ""))
      .join("")
      .trim();

    if (!textContent) {
      throw new Error("Empty response from Anthropic.");
    }

    const parsed = safeJsonParse<ClaudeResponse>(textContent);
    if (!parsed) {
      throw new Error("Failed to parse model output.");
    }

    if (!parsed.reply || !parsed.html) {
      throw new Error("Model response missing required fields.");
    }

    return Response.json({ reply: parsed.reply, game: parsed.html });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Generation failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    const trimmed = value.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      return null;
    }
  }
}
