"use client";

import { useState, useRef } from "react";

const PROMPTS = [
  "Hi, I'm Alex. I teach people to think clearly and build with confidence.",
  "When I approach a problem, I focus on understanding first, then structure.",
  "The best code is the code you can delete. Keep systems simple.",
  "I believe teaching is about momentum: small wins that compound.",
  "Let me help you turn confusion into clarity, one question at a time."
];

const RECORDING_DURATION = 30000; // 30 seconds

interface VoiceRecorderProps {
  onRecordingsComplete: (recordings: Blob[]) => void;
  isSubmitting?: boolean;
}

export default function VoiceRecorder({
  onRecordingsComplete,
  isSubmitting = false
}: VoiceRecorderProps) {
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const newRecordings = [...recordings, blob];
        setRecordings(newRecordings);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        // Move to next prompt or complete
        if (currentPromptIndex + 1 < PROMPTS.length) {
          setCurrentPromptIndex(currentPromptIndex + 1);
          setIsRecording(false);
        } else {
          // All recordings complete
          setIsRecording(false);
          onRecordingsComplete(newRecordings);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Auto-stop after duration
      timerRef.current = setTimeout(() => {
        if (mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
      }, RECORDING_DURATION);
    } catch (error) {
      console.error("Failed to access microphone:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    }
  };

  const skipRecording = () => {
    stopRecording();
    if (currentPromptIndex + 1 < PROMPTS.length) {
      setCurrentPromptIndex(currentPromptIndex + 1);
    } else {
      onRecordingsComplete(recordings);
    }
  };

  const resetRecordings = () => {
    setRecordings([]);
    setCurrentPromptIndex(0);
    setIsRecording(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const progress = (recordings.length / PROMPTS.length) * 100;

  return (
    <div className="voice-recorder">
      <div className="voice-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="progress-text">
          {recordings.length} of {PROMPTS.length} recordings
        </p>
      </div>

      <div className="voice-prompt">
        <h3>Sample {currentPromptIndex + 1}</h3>
        <p className="prompt-text">&ldquo;{PROMPTS[currentPromptIndex]}&rdquo;</p>
        <p className="prompt-instructions">
          {isRecording
            ? "🎤 Recording... (auto-stops in 30 seconds)"
            : "Click start to begin recording"}
        </p>
      </div>

      <div className="voice-controls">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isSubmitting || recordings.length === PROMPTS.length}
            className="button-primary"
          >
            Start Recording
          </button>
        ) : (
          <button onClick={stopRecording} className="button-primary button-recording">
            Stop Recording
          </button>
        )}

        {isRecording && (
          <button
            onClick={skipRecording}
            className="button-secondary"
            disabled={isSubmitting}
          >
            Skip
          </button>
        )}

        {recordings.length > 0 && !isRecording && (
          <>
            {recordings.length < PROMPTS.length && (
              <button
                onClick={resetRecordings}
                className="button-secondary"
                disabled={isSubmitting}
              >
                Reset
              </button>
            )}
          </>
        )}
      </div>

      {recordings.length === PROMPTS.length && !isRecording && (
        <div className="voice-complete">
          <p>✓ All voice samples recorded successfully!</p>
          <p className="voice-complete-note">
            Ready to upload and create your voice clone.
          </p>
        </div>
      )}
    </div>
  );
}
