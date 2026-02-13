"use client";

import { useMemo, useState, useRef } from "react";
import AudioPlayer from "./AudioPlayer";
import { useAvatarConfig } from "./AvatarConfigProvider";
import { useAudioElement } from "./AudioElementProvider";

type Turn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  audioBlob?: Blob;
  isPlayingAudio?: boolean;
};

function makeId(): string {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function TwinChat() {
  const { config } = useAvatarConfig();
  const { setAudioElement } = useAudioElement();

  const [turns, setTurns] = useState<Turn[]>([
    {
      id: makeId(),
      role: "assistant",
      content:
        "I am AI Alex (a local simulation). Tell me what you are trying to do, and I will ask one or two sharp questions before proposing a plan."
    }
  ]);
  const [draft, setDraft] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [synthesizing, setSynthesizing] = useState<boolean>(false);
  const [lastMeta, setLastMeta] = useState<string>("");
  const synthesisAudioRef = useRef<Blob | null>(null);

  const canSend = draft.trim().length > 0 && !busy;
  const history = useMemo(() => turns.slice(-12), [turns]);

  async function synthesizeVoice(text: string): Promise<Blob | null> {
    if (!config.voiceId) {
      console.warn("Voice ID not configured, skipping synthesis");
      return null;
    }

    try {
      setSynthesizing(true);

      const response = await fetch("/api/voice/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice_id: config.voiceId,
          emotion: "neutral"
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Synthesis error:", error);
        return null;
      }

      const audioBlob = await response.blob();
      return audioBlob;
    } catch (error) {
      console.error("Failed to synthesize voice:", error);
      return null;
    } finally {
      setSynthesizing(false);
    }
  }

  async function send() {
    const message = draft.trim();
    if (!message || busy) return;

    setDraft("");
    setBusy(true);
    const userTurnId = makeId();
    setTurns((prev) => [...prev, { id: userTurnId, role: "user", content: message }]);

    try {
      // Get AI response
      const resp = await fetch("/api/twin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history })
      });

      const json = (await resp.json()) as
        | { reply?: string; meta?: any; error?: string; detail?: string }
        | undefined;

      if (!resp.ok) {
        const detail = json?.detail ? `\n\n${json.detail}` : "";
        throw new Error(`${json?.error ?? "request_failed"}${detail}`);
      }

      const reply = String(json?.reply ?? "").trim();
      const meta = json?.meta?.memory
        ? `memory: facts=${json.meta.memory.selfFacts}, stories=${json.meta.memory.stories}, queries=${json.meta.memory.interestQueries}`
        : "";

      setLastMeta(meta);

      // Synthesize voice for response (non-blocking)
      let audioBlob: Blob | null = null;
      if (config.voiceId && config.isConfigured) {
        audioBlob = await synthesizeVoice(reply);
      }

      // Add assistant turn with optional audio
      const aiTurnId = makeId();
      setTurns((prev) => [
        ...prev,
        {
          id: aiTurnId,
          role: "assistant",
          content: reply,
          audioBlob: audioBlob || undefined,
          isPlayingAudio: false
        }
      ]);
    } catch (e: any) {
      const errorId = makeId();
      setTurns((prev) => [
        ...prev,
        {
          id: errorId,
          role: "assistant",
          content:
            `I hit an error calling the backend.\n\n` +
            `Error: ${String(e?.message ?? e)}\n\n` +
            `If you just started the dev server, ensure OPENAI_API_KEY is set in that shell.`
        }
      ]);
    } finally {
      setBusy(false);
      setSynthesizing(false);
    }
  }

  const handleAudioPlay = () => {
    // When audio starts playing, update avatar state
    // This will be connected to AvatarCanvas in next update
  };

  const handleAudioEnd = () => {
    // When audio finishes, reset avatar state
    // This will be connected to AvatarCanvas in next update
  };

  return (
    <div className="twin">
      <div className="twin-header">
        <div>
          <h2>AI Alex (Text)</h2>
          <p className="twin-subtitle">
            Local simulation based on your mind DB. It is allowed to be wrong.
          </p>
        </div>
        <div className="twin-badges">
          <span className="badge">private</span>
          <span className="badge">no raw logs</span>
        </div>
      </div>

      <div className="twin-log" role="log" aria-live="polite">
        {turns.map((t) => (
          <div key={t.id} className={`twin-turn ${t.role}`}>
            <div className="twin-role">{t.role === "user" ? "You" : "AI Alex"}</div>
            <div className="twin-content">{t.content}</div>

            {/* Audio player for AI responses */}
            {t.role === "assistant" && t.audioBlob && (
              <div className="twin-audio">
                <AudioPlayer
                  audioBlob={t.audioBlob}
                  autoPlay={false}
                  isLoading={synthesizing}
                  onPlay={handleAudioPlay}
                  onEnd={handleAudioEnd}
                  onAudioElementReady={setAudioElement}
                  onError={(err) => console.error("Audio playback error:", err)}
                />
              </div>
            )}

            {/* Synthesis indicator */}
            {t.role === "assistant" && synthesizing && !t.audioBlob && (
              <div className="twin-synthesis">
                <span className="spinner-small"></span>
                <span>Generating voice...</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="twin-input">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask anything. For best results: give context, goal, constraints."
          rows={3}
          disabled={busy}
        />
        <div className="twin-actions">
          <button onClick={send} disabled={!canSend}>
            {busy ? "Thinking..." : synthesizing ? "Synthesizing..." : "Send"}
          </button>
          <div className="twin-meta">{lastMeta}</div>
        </div>
      </div>
    </div>
  );
}
