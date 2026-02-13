"use client";

import { useEffect, useRef, useState } from "react";
import {
  createAvatarController,
  type AvatarInstance,
  type AnimationState,
} from "@/app/lib/avatarController";
import { getWasmLazyLoader } from "@/app/lib/wasmLazyLoader";
import { useAvatarConfig } from "./AvatarConfigProvider";

interface MorphTargets {
  mouthOpen: number;
  mouthRound: number;
  eyesLookUp: number;
  eyesClose: number;
}

interface AvatarCanvasProps {
  animationState?: AnimationState;
  morphTargets?: MorphTargets;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export default function AvatarCanvas({
  animationState = "idle",
  morphTargets,
  onReady,
  onError,
}: AvatarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<AvatarInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const fpsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { config } = useAvatarConfig();

  // Initialize avatar controller and load model
  useEffect(() => {
    let cancelled = false;

    async function initializeAvatar() {
      try {
        setIsLoading(true);
        setError(null);

        if (!canvasRef.current) {
          throw new Error("Canvas element not found");
        }

        // Get WebAssembly module URL
        // In production, this would be a pre-built module from LIT-LAND engine build
        const wasmPath = "/lit-land/avatar.wasm";

        // Priority 2 Optimization: Lazy load WebAssembly module
        // Preload WASM when component mounts (avatar is visible in viewport)
        // This defers the ~5MB download until the avatar viewport becomes visible
        const loader = getWasmLazyLoader();
        console.log("[AvatarCanvas] Preloading WebAssembly module...");
        await loader.load(wasmPath, {
          onProgress: (progress) => {
            if (process.env.NODE_ENV === "development") {
              console.log(`[AvatarCanvas] WASM loading: ${progress.toFixed(0)}%`);
            }
          },
        });

        if (cancelled) return;

        // Create and initialize avatar controller
        const controller = await createAvatarController({
          canvasId: canvasRef.current.id,
          wasmPath,
          onReady: () => {
            if (!cancelled) {
              setIsLoading(false);
              onReady?.();
            }
          },
          onError: (err) => {
            if (!cancelled) {
              setError(err.message);
              onError?.(err);
              console.error("Avatar initialization error:", err);
            }
          },
        });

        if (cancelled) {
          controller.cleanup();
          return;
        }

        controllerRef.current = controller;

        // Load avatar model if configured
        if (config.avatarUrl) {
          try {
            await controller.loadAvatarModel(config.avatarUrl);
          } catch (err) {
            console.error("Failed to load avatar model:", err);
            // Don't fail initialization if model loading fails
            // Allow rendering empty scene
          }
        }

        // Start FPS monitoring
        fpsIntervalRef.current = setInterval(() => {
          if (controllerRef.current) {
            setFps(Math.round(controllerRef.current.getFrameRate()));
          }
        }, 500);
      } catch (err) {
        if (!cancelled) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          setError(errorMsg);
          onError?.(
            err instanceof Error ? err : new Error(errorMsg)
          );
        }
      }
    }

    initializeAvatar();

    return () => {
      cancelled = true;
      if (fpsIntervalRef.current) {
        clearInterval(fpsIntervalRef.current);
      }
      if (controllerRef.current) {
        controllerRef.current.cleanup();
        controllerRef.current = null;
      }
    };
  }, [config.avatarUrl, onReady, onError]);

  // Update animation state
  useEffect(() => {
    if (controllerRef.current && !isLoading) {
      controllerRef.current.setAnimationState(animationState);
    }
  }, [animationState, isLoading]);

  // Update morph targets for lip-sync
  useEffect(() => {
    if (controllerRef.current && !isLoading && morphTargets) {
      controllerRef.current.updateMorphTargets(morphTargets);
    }
  }, [morphTargets, isLoading]);

  // Handle canvas resize
  useEffect(() => {
    function handleResize() {
      if (canvasRef.current && controllerRef.current) {
        const width = canvasRef.current.clientWidth;
        const height = canvasRef.current.clientHeight;
        controllerRef.current.setCanvasSize(width, height);
      }
    }

    window.addEventListener("resize", handleResize);
    // Initial size
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="avatar-canvas-container">
      <canvas
        ref={canvasRef}
        id="avatar-canvas"
        className="avatar-canvas"
        style={{
          width: "100%",
          height: "100%",
          display: isLoading || error ? "none" : "block",
        }}
      />

      {/* Loading state */}
      {isLoading && (
        <div className="avatar-loading">
          <div className="spinner" />
          <p>Loading avatar engine...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="avatar-error">
          <p>Failed to load avatar</p>
          <code>{error}</code>
          <p className="error-hint">
            Make sure the WebAssembly module is available at /public/lit-land/avatar.wasm
          </p>
        </div>
      )}

      {/* Debug info (development only) */}
      {process.env.NODE_ENV === "development" && !isLoading && !error && (
        <div className="avatar-debug">
          <span className="debug-fps">FPS: {fps}</span>
          <span className="debug-state">{animationState}</span>
        </div>
      )}
    </div>
  );
}
