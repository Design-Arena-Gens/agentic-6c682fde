'use client';

import { FormEvent, useMemo, useState } from "react";

import { SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
};

type GenerateResponse = {
  reply: string;
  game: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [gameHtml, setGameHtml] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      createdAt: Date.now(),
    };

    const optimisticState = [...messages, userMessage];
    setMessages(optimisticState);
    setInput("");
    setIsStreaming(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-game", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: userMessage.content,
          conversation: optimisticState.map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Generation failed (${response.status})`);
      }

      const data = (await response.json()) as GenerateResponse;
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setGameHtml(data.game);
    } catch (generationError) {
      const message =
        generationError instanceof Error
          ? generationError.message
          : "An unknown error occurred.";
      setError(message);
    } finally {
      setIsStreaming(false);
    }
  };

  const previewSource = useMemo(() => {
    if (gameHtml?.trim()) return gameHtml;
    return `<html>
      <head>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: radial-gradient(circle at top, #18181b, #09090b);
            color: #fafafa;
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            text-align: center;
            padding: 2rem;
          }
          h1 { font-size: 2rem; margin-bottom: 1rem; }
          p { max-width: 32rem; color: #d4d4d8; line-height: 1.6; }
          code {
            background: rgba(244,244,245,0.1);
            padding: 0.25rem 0.5rem;
            border-radius: 0.5rem;
          }
        </style>
      </head>
      <body>
        <div>
          <h1>Text-to-Game Preview</h1>
          <p>The generated game will appear here. Describe your idea in the chat to bring a playable prototype to life.</p>
          <p>Try prompts like <code>"retro space shooter"</code> or <code>"zen garden clicker"</code> to get started.</p>
        </div>
      </body>
    </html>`;
  }, [gameHtml]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-50">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-lg">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Text-to-Game Studio</h1>
            <p className="text-sm text-zinc-400">
              Describe a concept. Watch it evolve into a playable prototype.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="size-2 rounded-full bg-emerald-400" />
            Live Preview
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-6 md:flex-row">
        <section className="flex h-[calc(50vh-3rem)] flex-1 flex-col rounded-3xl border border-white/10 bg-black/40 p-6 shadow-lg backdrop-blur md:h-[calc(100vh-7.5rem)]">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Creative Chat</h2>
            <p className="text-sm text-zinc-400">
              Iteratively shape mechanics, art direction, and polish through conversation.
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-4">
            <ScrollArea className="flex-1 rounded-2xl border border-white/5 bg-black/30 p-4">
              {messages.length === 0 ? (
                <div className="space-y-4 text-sm text-zinc-400">
                  <p>Need ideas?</p>
                  <ul className="space-y-2">
                    <li className="rounded-xl bg-white/5 px-3 py-2">
                      <span className="font-semibold text-zinc-100">Retro Runner:</span>{" "}
                      “Synthwave city endless runner with neon obstacles.”
                    </li>
                    <li className="rounded-xl bg-white/5 px-3 py-2">
                      <span className="font-semibold text-zinc-100">Puzzle Forge:</span>{" "}
                      “Tile-based alchemy game with chaining reactions.”
                    </li>
                    <li className="rounded-xl bg-white/5 px-3 py-2">
                      <span className="font-semibold text-zinc-100">Ambient Flow:</span>{" "}
                      “Minimalist zen game where ripples trigger music.”
                    </li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <article
                      key={message.id}
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        message.role === "user"
                          ? "ml-auto max-w-[85%] bg-emerald-500/20 text-emerald-100"
                          : "mr-auto max-w-[90%] bg-white/10 text-zinc-100"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <span className="mt-2 block text-[11px] uppercase tracking-wide text-white/40">
                        {message.role === "user" ? "You" : "Game Architect"}
                      </span>
                    </article>
                  ))}
                  {isStreaming && (
                    <article className="mr-auto max-w-[90%] rounded-2xl bg-white/10 px-4 py-3 text-sm text-zinc-300">
                      Synthesizing interactive experience…
                    </article>
                  )}
                </div>
              )}
            </ScrollArea>
            {error && (
              <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Describe your next great interactive experience..."
                className="min-h-[120px] resize-none border-white/10 bg-black/40 text-sm text-zinc-100 placeholder:text-zinc-500"
              />
              <Button
                type="submit"
                disabled={isStreaming}
                className="w-full gap-2 bg-emerald-500 font-medium text-black hover:bg-emerald-400 md:w-auto"
              >
                <SendHorizontal className="size-4" />
                {isStreaming ? "Designing..." : "Generate"}
              </Button>
            </form>
          </div>
        </section>
        <section className="flex h-[calc(50vh-3rem)] flex-1 flex-col rounded-3xl border border-white/10 bg-black/40 p-6 shadow-lg backdrop-blur md:h-[calc(100vh-7.5rem)]">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold">Live Preview</h2>
              <p className="text-sm text-zinc-400">
                Interactive build renders directly inside this viewport.
              </p>
            </div>
            <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
              sandboxed
            </div>
          </div>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
            <iframe
              title="Generated Game Preview"
              className="h-full w-full"
              sandbox="allow-scripts allow-pointer-lock allow-same-origin"
              srcDoc={previewSource}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
