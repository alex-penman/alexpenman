/**
 * POST /api/avatar/animate
 *
 * Generate lip-sync animation data using D-ID Streaming API.
 * Takes audio URL and returns animation timing data.
 *
 * Note: For this implementation, we're using a simpler approach:
 * - Audio analysis on the client side (Web Audio API)
 * - Real-time morph target calculation
 * - D-ID integration is optional for production (adds cost)
 *
 * Request: { text: string, audio_url: string, avatar_image_url?: string }
 * Response: { animation_data: object, duration: number }
 */

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, audio_url, avatar_image_url } = body;

    if (!text || !audio_url) {
      return Response.json(
        { error: "text and audio_url required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.DID_API_KEY;

    // If D-ID is not configured, return a simple timing-based animation
    if (!apiKey) {
      console.warn("D-ID API key not configured, using client-side lip-sync");

      // Estimate duration based on text length (roughly 150 words per minute)
      const words = text.split(/\s+/).length;
      const estimatedDuration = (words / 150) * 60;

      return Response.json({
        animation_data: {
          type: "client-side",
          method: "audio-analysis",
          note: "Using Web Audio API for real-time lip-sync",
        },
        duration: estimatedDuration,
        hint: "Set DID_API_KEY for server-side lip-sync (optional)",
      });
    }

    // D-ID Integration (Optional - adds cost)
    // This is the production-ready approach with better lip-sync quality

    // Step 1: Create a talks stream
    const streamResponse = await fetch("https://api.d-id.com/talks/streams", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_url: avatar_image_url || "https://create-images-results.d-id.com/default-presenters/Noelle_f/image.jpeg",
        script: {
          type: "audio",
          audio_url: audio_url,
        },
        config: {
          fluent: true,
          pad_audio: 0.0,
          driver_expressions: {
            expressions: [
              { start_frame: 0, expression: "neutral", intensity: 1.0 },
            ],
          },
        },
      }),
    });

    if (!streamResponse.ok) {
      const error = await streamResponse.json().catch(() => ({ error: "Unknown error" }));
      console.error("D-ID stream creation error:", error);

      // Fallback to client-side animation
      return Response.json({
        animation_data: {
          type: "client-side",
          method: "audio-analysis",
          note: "D-ID error, using Web Audio API fallback",
          error: error,
        },
        duration: 5,
      });
    }

    const streamData = await streamResponse.json();
    const streamId = streamData.id;
    const sessionId = streamData.session_id;

    // Step 2: Start the stream
    await fetch(`https://api.d-id.com/talks/streams/${streamId}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        script: {
          type: "audio",
          audio_url: audio_url,
        },
      }),
    });

    // Return animation metadata
    // Note: In a real implementation, you would:
    // 1. Connect to the WebRTC stream
    // 2. Extract morph target values frame by frame
    // 3. Return timing data for playback
    //
    // For simplicity, we're using client-side audio analysis instead

    return Response.json({
      animation_data: {
        type: "d-id",
        stream_id: streamId,
        session_id: sessionId,
        note: "D-ID stream created (WebRTC connection required on client)",
      },
      duration: streamData.duration || 5,
    });
  } catch (error) {
    console.error("Animation error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Always fallback to client-side animation on error
    return Response.json({
      animation_data: {
        type: "client-side",
        method: "audio-analysis",
        note: "Using Web Audio API (error occurred)",
      },
      duration: 5,
      error: errorMessage,
    });
  }
}

export async function GET() {
  return Response.json(
    {
      message: "Avatar animation endpoint (D-ID)",
      method: "POST",
      body: {
        text: "Text that was spoken",
        audio_url: "URL to audio file",
        avatar_image_url: "Optional: URL to avatar image (for D-ID)",
      },
      note: "D-ID is optional. Client-side audio analysis is used by default.",
      setup: {
        required: "None (works without D-ID)",
        optional: "Set DID_API_KEY for server-side lip-sync (better quality, adds cost)",
      },
    },
    { status: 200 }
  );
}
