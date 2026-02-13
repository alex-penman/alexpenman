"use client";

import { useEffect, useState } from "react";
import LazyAvatarCanvas from "./LazyAvatarCanvas";
import { useAvatarAnimation } from "@/app/hooks/useAvatarAnimation";
import { useAudioElement } from "./AudioElementProvider";

interface AvatarWithLipSyncProps {
  audioElement?: HTMLAudioElement;
  onAvatarReady?: () => void;
  onAvatarError?: (error: Error) => void;
}

/**
 * AvatarWithLipSync - Avatar with real-time lip-sync animation
 *
 * Combines:
 * - Avatar3D (LIT-LAND WebAssembly rendering)
 * - useAvatarAnimation (animation state management)
 * - AudioAnalyzer (real-time frequency analysis)
 *
 * Synchronizes avatar mouth animation with audio playback
 * in real-time using Web Audio API frequency analysis.
 */
export default function AvatarWithLipSync({
  audioElement: audioElementProp,
  onAvatarReady,
  onAvatarError,
}: AvatarWithLipSyncProps) {
  const { audioElement: contextAudioElement } = useAudioElement();
  const [activeAudioElement, setActiveAudioElement] = useState<HTMLAudioElement | null>(null);

  // Use provided audio element or fall back to context
  useEffect(() => {
    const element = audioElementProp || contextAudioElement;
    setActiveAudioElement(element || null);
  }, [audioElementProp, contextAudioElement]);

  // Initialize animation system with audio element
  const {
    animationState,
    isSpeaking,
    morphTargets,
    startListening,
    stopListening,
  } = useAvatarAnimation({
    audioElement: activeAudioElement || undefined,
    // Morph targets flow through the component tree directly
    // No callback needed since AvatarCanvas subscribes to state changes
  });

  // Handle avatar ready
  const handleAvatarReady = () => {
    console.log("[AvatarWithLipSync] Avatar canvas ready");
    onAvatarReady?.();
  };

  // Handle avatar error
  const handleAvatarError = (error: Error) => {
    console.error("[AvatarWithLipSync] Avatar error:", error);
    onAvatarError?.(error);
  };

  return (
    <div className="avatar-with-lipsync">
      <LazyAvatarCanvas
        animationState={animationState}
        morphTargets={morphTargets}
        onReady={handleAvatarReady}
        onError={handleAvatarError}
        threshold={0}
        rootMargin="100px"
      />

      {/* Debug overlay (development only) */}
      {process.env.NODE_ENV === "development" && (
        <div className="avatar-debug-overlay">
          <div className="debug-item">
            <label>State:</label>
            <span>{animationState}</span>
          </div>
          <div className="debug-item">
            <label>Speaking:</label>
            <span>{isSpeaking ? "Yes" : "No"}</span>
          </div>
          <div className="debug-item">
            <label>Mouth Open:</label>
            <span>{morphTargets.mouthOpen.toFixed(2)}</span>
          </div>
          <div className="debug-item">
            <label>Mouth Round:</label>
            <span>{morphTargets.mouthRound.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
