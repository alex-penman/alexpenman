/**
 * useAvatarAnimation - Animation state management for avatar
 *
 * Manages avatar animation states (idle, listening, speaking)
 * and coordinates morph target updates during audio playback.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AudioAnalyzer, MouthTargets } from "@/app/lib/audioAnalyzer";

export type AnimationState = "idle" | "listening" | "speaking";

export interface AvatarMorphTargets {
  mouthOpen: number;
  mouthRound: number;
  eyesLookUp: number;
  eyesClose: number;
  // Add more as needed based on avatar model
}

interface UseAvatarAnimationConfig {
  avatarElement?: HTMLElement;
  audioElement?: HTMLAudioElement;
  onMorphTargetUpdate?: (targets: AvatarMorphTargets) => void;
}

export function useAvatarAnimation(
  config: UseAvatarAnimationConfig = {}
) {
  const [animationState, setAnimationState] = useState<AnimationState>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [morphTargets, setMorphTargets] = useState<AvatarMorphTargets>({
    mouthOpen: 0,
    mouthRound: 0,
    eyesLookUp: 0,
    eyesClose: 0
  });

  const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const breathingPhaseRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(0);

  // Initialize audio analyzer
  useEffect(() => {
    if (!config.audioElement) return;

    try {
      audioAnalyzerRef.current = new AudioAnalyzer({
        smoothingFactor: 0.3,
        fftSize: 256
      });

      audioAnalyzerRef.current.initialize(config.audioElement);
      audioAnalyzerRef.current.resumeContext();
    } catch (error) {
      console.error("[useAvatarAnimation] Failed to initialize analyzer:", error);
    }

    return () => {
      if (audioAnalyzerRef.current) {
        audioAnalyzerRef.current.destroy();
        audioAnalyzerRef.current = null;
      }
    };
  }, [config.audioElement]);

  // Calculate breathing animation (idle state)
  const calculateBreathing = useCallback((time: number): number => {
    // Simple sine wave for breathing motion
    return 0.15 + Math.sin(time * 0.002) * 0.1;
  }, []);

  // Update morph targets based on current state
  const updateMorphTargets = useCallback(() => {
    const now = performance.now();

    // Only update at reasonable frequency (60 FPS max)
    if (now - lastUpdateTimeRef.current < 16) {
      return;
    }

    lastUpdateTimeRef.current = now;

    let newTargets: AvatarMorphTargets = {
      mouthOpen: 0,
      mouthRound: 0,
      eyesLookUp: 0.2, // Slight upward gaze
      eyesClose: 0
    };

    if (animationState === "idle") {
      // Breathing animation
      newTargets.mouthOpen = calculateBreathing(now);
    } else if (animationState === "listening") {
      // Attentive expression
      newTargets.mouthOpen = 0.05;
      newTargets.eyesLookUp = 0.3;
    } else if (animationState === "speaking" && audioAnalyzerRef.current) {
      // Lip-sync from audio analysis
      const audioTargets: MouthTargets = audioAnalyzerRef.current.analyze();

      newTargets.mouthOpen = audioTargets.mouthOpen;
      newTargets.mouthRound = audioTargets.mouthRound;
      newTargets.eyesLookUp = 0.15 + audioTargets.speechIntensity * 0.2;

      // Slight head nod based on intensity (simulated via eye position)
      if (audioTargets.speechIntensity > 0.7) {
        newTargets.eyesLookUp += 0.05;
      }
    }

    setMorphTargets(newTargets);
    config.onMorphTargetUpdate?.(newTargets);
  }, [animationState, config, calculateBreathing]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      updateMorphTargets();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateMorphTargets]);

  // Handle audio playback events
  useEffect(() => {
    if (!config.audioElement) return;

    const handlePlay = () => {
      setIsSpeaking(true);
      setAnimationState("speaking");
    };

    const handlePause = () => {
      setIsSpeaking(false);
      setAnimationState("idle");
    };

    const handleEnded = () => {
      setIsSpeaking(false);
      setAnimationState("idle");
    };

    config.audioElement.addEventListener("play", handlePlay);
    config.audioElement.addEventListener("pause", handlePause);
    config.audioElement.addEventListener("ended", handleEnded);

    return () => {
      config.audioElement?.removeEventListener("play", handlePlay);
      config.audioElement?.removeEventListener("pause", handlePause);
      config.audioElement?.removeEventListener("ended", handleEnded);
    };
  }, [config.audioElement]);

  // Change to listening state
  const startListening = useCallback(() => {
    setAnimationState("listening");
  }, []);

  // Change to idle state
  const stopListening = useCallback(() => {
    if (!isSpeaking) {
      setAnimationState("idle");
    }
  }, [isSpeaking]);

  // Manually set animation state
  const setManualAnimationState = useCallback((state: AnimationState) => {
    setAnimationState(state);
  }, []);

  // Get visualization data (for debug/display)
  const getFrequencyData = useCallback((): Uint8Array | null => {
    return audioAnalyzerRef.current?.getFrequencyData() ?? null;
  }, []);

  return {
    animationState,
    isSpeaking,
    morphTargets,
    startListening,
    stopListening,
    setAnimationState: setManualAnimationState,
    getFrequencyData
  };
}
