/**
 * POST /api/voice/synthesize
 *
 * Generate speech from text using ElevenLabs API.
 * Supports voice cloning with trained voice models.
 *
 * Request: { text: string, voice_id: string, emotion?: string }
 * Response: Audio blob (MP3 format)
 */

export const runtime = "nodejs";
export const maxDuration = 60; // 1 minute timeout for synthesis

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, voice_id, emotion = "neutral" } = body;

    if (!text || !voice_id) {
      return Response.json(
        { error: "text and voice_id required" },
        { status: 400 }
      );
    }

    if (text.length > 1000) {
      return Response.json(
        { error: "Text too long (max 1000 characters)" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return Response.json(
        {
          error: "ElevenLabs API key not configured",
          hint: "Set ELEVENLABS_API_KEY environment variable",
        },
        { status: 500 }
      );
    }

    // Call ElevenLabs text-to-speech API
    // Using streaming endpoint for lower latency
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      console.error("ElevenLabs API error:", error);

      // Handle quota exceeded
      if (response.status === 429) {
        return Response.json(
          {
            error: "Voice synthesis quota exceeded",
            hint: "Upgrade your ElevenLabs plan or wait for quota reset",
          },
          { status: 429 }
        );
      }

      // Handle invalid voice ID
      if (response.status === 404) {
        return Response.json(
          {
            error: "Voice model not found",
            hint: "Train your voice first at /setup",
          },
          { status: 404 }
        );
      }

      return Response.json(
        {
          error: "Failed to synthesize speech",
          details: error,
        },
        { status: response.status }
      );
    }

    // Stream audio directly to client
    const audioBuffer = await response.arrayBuffer();

    // Return audio as MP3
    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=86400", // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error("Synthesis error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return Response.json(
      {
        error: "Failed to synthesize speech",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json(
    {
      message: "Voice synthesis endpoint (ElevenLabs)",
      method: "POST",
      body: {
        text: "String to synthesize",
        voice_id: "Trained voice model ID from ElevenLabs",
        emotion: "Optional: neutral (ignored for now, future feature)",
      },
      setup: "Get voice_id by training a voice at /setup or using a preset ElevenLabs voice",
    },
    { status: 200 }
  );
}
