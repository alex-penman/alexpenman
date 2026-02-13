"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import VoiceRecorder from "./VoiceRecorder";
import { useAvatarConfig } from "./AvatarConfigProvider";

type SetupStep = "welcome" | "avatar" | "voice" | "review" | "loading";

interface AvatarData {
  url: string;
  name: string;
}

export default function SetupWizard() {
  const router = useRouter();
  const { setAvatarUrl, setVoiceId } = useAvatarConfig();

  const [step, setStep] = useState<SetupStep>("welcome");
  const [avatar, setAvatar] = useState<AvatarData | null>(null);
  const [voiceRecordings, setVoiceRecordings] = useState<Blob[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Handle Ready Player Me avatar selection via postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.source === "readyplayerme") {
        if (event.data.eventName === "subscribe" && event.data.data?.url) {
          const avatarUrl = event.data.data.url;
          setAvatar({
            url: avatarUrl,
            name: avatarUrl.split("/").pop() || "avatar"
          });
          setStep("voice");
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleAvatarClick = () => {
    setStep("avatar");
  };

  const handleSkipAvatarSetup = () => {
    // Use default avatar
    const defaultAvatar = "https://models.readyplayer.me/655e7f0c955f5e001a47ac7d.glb";
    setAvatar({
      url: defaultAvatar,
      name: "default-alex"
    });
    setStep("voice");
  };

  const handleRecordingsComplete = (recordings: Blob[]) => {
    setVoiceRecordings(recordings);
    setStep("review");
  };

  const handleConfirm = async () => {
    if (!avatar || voiceRecordings.length === 0) {
      setError("Missing avatar or voice recordings");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Save avatar URL
      setAvatarUrl(avatar.url);

      // Train voice model with GPT-SoVITS
      const formData = new FormData();
      const voiceId = `alex_voice_${Date.now()}`;
      formData.append("voice_id", voiceId);

      // Add voice samples to form data
      voiceRecordings.forEach((blob, index) => {
        formData.append("samples", blob, `sample_${index}.wav`);
      });

      console.log(`Training voice model: ${voiceId}...`);

      const trainingResponse = await fetch("/api/voice/train", {
        method: "POST",
        body: formData
      });

      if (!trainingResponse.ok) {
        const error = await trainingResponse.json();
        throw new Error(
          error.error || `Training failed: ${trainingResponse.statusText}`
        );
      }

      const trainingResult = await trainingResponse.json();

      if (!trainingResult.success) {
        throw new Error(trainingResult.error || "Voice training failed");
      }

      console.log("Voice model training successful:", trainingResult);

      // Save the trained voice model ID
      setVoiceId(voiceId);

      // Redirect to home
      setStep("loading");
      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Setup failed";
      console.error("Setup error:", errorMessage);
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="setup-wizard">
      {step === "welcome" && (
        <div className="setup-step">
          <div className="setup-header">
            <h1>Welcome to AI Alex</h1>
            <p>
              Let&apos;s create your personalized avatar and voice clone for a more
              immersive chat experience.
            </p>
          </div>

          <div className="setup-content">
            <div className="setup-feature">
              <div className="feature-icon">🎨</div>
              <h3>Your Avatar</h3>
              <p>Create a 3D avatar that represents you in conversations.</p>
            </div>
            <div className="setup-feature">
              <div className="feature-icon">🎤</div>
              <h3>Your Voice</h3>
              <p>Record 5 short samples to clone your voice.</p>
            </div>
            <div className="setup-feature">
              <div className="feature-icon">💬</div>
              <h3>Live Chat</h3>
              <p>Chat with your avatar speaking in your voice.</p>
            </div>
          </div>

          <div className="setup-actions">
            <button onClick={() => setStep("avatar")} className="button-primary">
              Get Started
            </button>
            <button onClick={handleSkipAvatarSetup} className="button-secondary">
              Skip for now
            </button>
          </div>
        </div>
      )}

      {step === "avatar" && (
        <div className="setup-step">
          <div className="setup-header">
            <h1>Create Your Avatar</h1>
            <p>
              Use Ready Player Me to design a 3D avatar. You can upload a photo
              or customize from scratch.
            </p>
          </div>

          <div className="setup-content avatar-setup">
            <iframe
              ref={iframeRef}
              src="https://ready.readyplayer.me/avatar?frameApi"
              allow="camera *; microphone *; clipboard-read; clipboard-write"
              style={{
                width: "100%",
                height: "600px",
                border: "none",
                borderRadius: "12px"
              }}
            />
          </div>

          <div className="setup-actions">
            {avatar && (
              <button
                onClick={() => setStep("voice")}
                className="button-primary"
              >
                Continue with Avatar
              </button>
            )}
            <button
              onClick={() => setStep("welcome")}
              className="button-secondary"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {step === "voice" && (
        <div className="setup-step">
          <div className="setup-header">
            <h1>Record Your Voice</h1>
            <p>
              Record 5 short voice samples. These will be used to create a
              realistic voice clone of you.
            </p>
          </div>

          <div className="setup-content voice-setup">
            <VoiceRecorder
              onRecordingsComplete={handleRecordingsComplete}
              isSubmitting={isSubmitting}
            />
          </div>

          <div className="setup-actions">
            {voiceRecordings.length < 5 && (
              <button
                onClick={() => setStep("avatar")}
                className="button-secondary"
                disabled={isSubmitting}
              >
                Back
              </button>
            )}
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="setup-step">
          <div className="setup-header">
            <h1>Ready to Go!</h1>
            <p>Review your setup before we finalize everything.</p>
          </div>

          <div className="setup-content review-setup">
            <div className="review-item">
              <h3>Avatar</h3>
              <p className="review-value">{avatar?.name || "Custom Avatar"}</p>
              <button
                onClick={() => setStep("avatar")}
                className="button-link"
                disabled={isSubmitting}
              >
                Change avatar
              </button>
            </div>

            <div className="review-item">
              <h3>Voice Samples</h3>
              <p className="review-value">{voiceRecordings.length} recorded</p>
              <button
                onClick={() => setStep("voice")}
                className="button-link"
                disabled={isSubmitting}
              >
                Re-record voice
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}
          </div>

          <div className="setup-actions">
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="button-primary"
              title={isSubmitting ? "This may take 2-5 minutes for voice training" : ""}
            >
              {isSubmitting ? "Training voice model..." : "Finalize Setup"}
            </button>
            <button
              onClick={() => setStep("voice")}
              disabled={isSubmitting}
              className="button-secondary"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {step === "loading" && (
        <div className="setup-step">
          <div className="setup-header">
            <h1>Setting up your avatar...</h1>
            <p>Redirecting you to chat.</p>
          </div>
          <div className="setup-loader">
            <div className="spinner" />
          </div>
        </div>
      )}
    </div>
  );
}
