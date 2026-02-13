"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

/**
 * Priority 3 Optimization: Lazy-loaded VoiceRecorder
 *
 * Defers loading VoiceRecorder and Web Audio API dependencies (~20KB) until
 * the user reaches the voice recording step in the setup wizard.
 *
 * Expected improvement: Reduces setup page initial bundle
 */

const VoiceRecorderComponent = dynamic(
  () => import("./VoiceRecorder"),
  {
    loading: () => (
      <div
        style={{
          width: "100%",
          padding: "2rem",
          textAlign: "center",
          color: "#666",
        }}
      >
        <p>Initializing audio recording...</p>
      </div>
    ),
    ssr: false, // Client-side only (needs Web Audio API)
  }
);

interface VoiceRecorderLazyProps {
  onRecordingsComplete: (recordings: Blob[]) => void;
  isSubmitting?: boolean;
}

/**
 * Lazy-loaded Voice Recorder
 *
 * This component is code-split and only loaded when user reaches
 * the voice recording step in setup wizard.
 *
 * Usage:
 * ```tsx
 * import VoiceRecorderLazy from "@/app/components/VoiceRecorderLazy";
 *
 * export default function SetupWizard() {
 *   const [step, setStep] = useState(0);
 *
 *   return (
 *     <>
 *       {step === 0 && <AvatarSelector />}
 *       {step === 1 && (
 *         <Suspense fallback={<div>Loading audio...</div>}>
 *           <VoiceRecorderLazy onRecordingComplete={handleRecording} />
 *         </Suspense>
 *       )}
 *     </>
 *   );
 * }
 * ```
 */
export default function VoiceRecorderLazy({
  onRecordingsComplete,
  isSubmitting = false,
}: VoiceRecorderLazyProps) {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "2rem", textAlign: "center", color: "#999" }}>
          Loading audio recorder...
        </div>
      }
    >
      <VoiceRecorderComponent
        onRecordingsComplete={onRecordingsComplete}
        isSubmitting={isSubmitting}
      />
    </Suspense>
  );
}
