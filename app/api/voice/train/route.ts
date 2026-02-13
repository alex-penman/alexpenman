/**
 * POST /api/voice/train
 *
 * Train a voice model using ElevenLabs Voice Cloning API.
 * Requires 5+ audio samples (30 seconds each minimum).
 *
 * Request: FormData with audio files
 * Response: { success: boolean, voice_id: string, status: string }
 */

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minute timeout for voice training

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const voiceName = formData.get("voice_name") as string;
    const voiceDescription = formData.get("description") as string || "AI Alex voice clone";

    if (!voiceName) {
      return Response.json(
        { error: "voice_name required in form data" },
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

    // Collect audio files from form data
    const audioFiles: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("sample_") && value instanceof File) {
        audioFiles.push(value);
      }
    }

    if (audioFiles.length < 1) {
      return Response.json(
        {
          error: "At least 1 audio sample required",
          hint: "Upload audio samples with keys: sample_0, sample_1, etc.",
        },
        { status: 400 }
      );
    }

    // Note: ElevenLabs requires at least 1 sample for instant voice cloning
    // Professional voice cloning (better quality) requires 5+ samples
    if (audioFiles.length < 5) {
      console.warn(
        `Only ${audioFiles.length} samples provided. For best quality, provide 5+ samples (30s each).`
      );
    }

    // Create FormData for ElevenLabs API
    const elevenLabsFormData = new FormData();
    elevenLabsFormData.append("name", voiceName);
    elevenLabsFormData.append("description", voiceDescription);

    // Add audio files
    for (let i = 0; i < audioFiles.length; i++) {
      elevenLabsFormData.append("files", audioFiles[i], `sample_${i}.wav`);
    }

    // Optional: Add labels for each file (what text was spoken)
    // This improves quality but is optional
    // const labels = formData.get("labels") as string;
    // if (labels) {
    //   elevenLabsFormData.append("labels", labels);
    // }

    console.log(`Training voice "${voiceName}" with ${audioFiles.length} samples...`);

    // Call ElevenLabs voice cloning API
    const response = await fetch(
      "https://api.elevenlabs.io/v1/voices/add",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          // Don't set Content-Type - let fetch set it with boundary
        },
        body: elevenLabsFormData,
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      console.error("ElevenLabs voice training error:", error);

      // Handle quota exceeded
      if (response.status === 429) {
        return Response.json(
          {
            error: "Voice cloning quota exceeded",
            hint: "Upgrade your ElevenLabs plan for more voice clones",
          },
          { status: 429 }
        );
      }

      // Handle invalid audio
      if (response.status === 422) {
        return Response.json(
          {
            error: "Invalid audio files",
            hint: "Ensure audio is clear, 30+ seconds per sample, and in WAV/MP3 format",
            details: error,
          },
          { status: 422 }
        );
      }

      return Response.json(
        {
          error: "Failed to train voice model",
          details: error,
        },
        { status: response.status }
      );
    }

    const result = await response.json();
    const voiceId = result.voice_id;

    console.log(`Voice training successful! Voice ID: ${voiceId}`);

    return Response.json(
      {
        success: true,
        voice_id: voiceId,
        status: "Voice model trained successfully",
        samples_used: audioFiles.length,
        hint: audioFiles.length < 5
          ? "For better quality, provide 5+ samples (30 seconds each)"
          : "Voice model ready to use",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Voice training error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return Response.json(
      {
        error: "Failed to train voice model",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json(
    {
      message: "Voice training endpoint (ElevenLabs)",
      method: "POST",
      body: {
        voice_name: "Name for your voice",
        description: "Optional description",
        sample_0: "First audio file (WAV/MP3)",
        sample_1: "Second audio file (WAV/MP3)",
        sample_N: "Additional samples (5+ recommended for quality)",
      },
      requirements: {
        min_samples: 1,
        recommended_samples: 5,
        sample_duration: "30+ seconds each",
        sample_format: "WAV or MP3",
        sample_quality: "Clear speech, no background noise",
      },
    },
    { status: 200 }
  );
}
