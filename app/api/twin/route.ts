import { NextResponse } from "next/server";

import { getMemoryPack } from "@/app/lib/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatTurn = { role: "user" | "assistant"; content: string };

function clampHistory(history: ChatTurn[] | undefined): ChatTurn[] {
  if (!history) return [];
  const filtered = history
    .filter((t) => t && (t.role === "user" || t.role === "assistant"))
    .map((t) => ({ role: t.role, content: String(t.content ?? "") }))
    .filter((t) => t.content.trim().length > 0);
  return filtered.slice(-12);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      message?: string;
      history?: ChatTurn[];
    };

    const message = String(body?.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "missing_message" }, { status: 400 });
    }

    const memory = await getMemoryPack(message);

    const system = [
      'You are "AI Alex": a private, local-first assistant modeled after Alex Penman.',
      "You are not the real Alex. Do not claim you are human; be explicit that you are an AI simulation.",
      "Primary purpose: help with teaching and coding, with Alex-like clarity and directness.",
      "Privacy rule: never reveal raw chat logs, private identifiers, or file paths. Paraphrase and generalize personal context.",
      "If memory is missing or ambiguous, ask crisp follow-up questions before guessing."
    ].join("\n");

    const memoryNotes = [
      "MEMORY NOTES (curated from the mind DB; treat as fallible):",
      "",
      "Self facts:",
      ...memory.selfFacts.slice(0, 10).map((f) => `- ${f.predicate}: ${f.object}`),
      "",
      "Stories:",
      ...memory.stories
        .slice(0, 6)
        .map((s) => `- ${s.title} (${s.namespace}): ${s.summary}`),
      "",
      "Recent related interests (questions Alex asked):",
      ...memory.interestQueries.slice(0, 8).map((q) => `- ${q.query}`)
    ]
      .filter(Boolean)
      .join("\n");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "missing_openai_api_key" },
        { status: 500 }
      );
    }

    const model = process.env.TWIN_MODEL ?? "gpt-4o-mini";
    const history = clampHistory(body.history);

    const payload = {
      model,
      temperature: 0.7,
      max_tokens: 600,
      messages: [
        { role: "system", content: system },
        { role: "system", content: memoryNotes },
        ...history,
        { role: "user", content: message }
      ]
    };

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json(
        { error: "openai_error", detail: errText.slice(0, 2000) },
        { status: 502 }
      );
    }

    const data = (await resp.json()) as any;
    const reply = String(data?.choices?.[0]?.message?.content ?? "").trim();

    return NextResponse.json({
      reply,
      meta: {
        model,
        memory: {
          selfFacts: memory.selfFacts.length,
          stories: memory.stories.length,
          interestQueries: memory.interestQueries.length
        }
      }
    });
  } catch (error) {
    console.error("twin route error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

