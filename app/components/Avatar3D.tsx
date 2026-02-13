"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF, PerspectiveCamera } from "@react-three/drei";
import { useAvatarConfig } from "./AvatarConfigProvider";

interface MorphTargets {
  mouthOpen: number;
  mouthRound: number;
  eyesLookUp: number;
  eyesClose: number;
}

interface Avatar3DProps {
  animationState?: "idle" | "listening" | "speaking";
  morphTargets?: MorphTargets;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

/**
 * AvatarModel - Loads and renders a Ready Player Me GLB avatar
 */
function AvatarModel({
  url,
  morphTargets,
  onLoad,
  onError
}: {
  url: string;
  morphTargets?: MorphTargets;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}) {
  const { scene } = useGLTF(url, true, true, (loader) => {
    loader.setCrossOrigin("anonymous");
  });
  const modelRef = useRef<any>(null);

  useEffect(() => {
    if (scene) {
      onLoad?.();
    }
  }, [scene, onLoad]);

  // Apply morph targets for lip-sync
  useEffect(() => {
    if (!modelRef.current || !morphTargets) return;

    modelRef.current.traverse((child: any) => {
      if (child.isMesh && child.morphTargetInfluences) {
        // Ready Player Me avatars use specific morph target indices
        // These are standard ARKit blendshapes
        const morphTargetDict = child.morphTargetDictionary;

        if (morphTargetDict) {
          // Mouth open blendshape
          if (morphTargetDict.jawOpen !== undefined) {
            child.morphTargetInfluences[morphTargetDict.jawOpen] = morphTargets.mouthOpen;
          }

          // Mouth round/pucker blendshape
          if (morphTargetDict.mouthPucker !== undefined) {
            child.morphTargetInfluences[morphTargetDict.mouthPucker] = morphTargets.mouthRound;
          }

          // Eye blink blendshape
          if (morphTargetDict.eyeBlinkLeft !== undefined) {
            child.morphTargetInfluences[morphTargetDict.eyeBlinkLeft] = morphTargets.eyesClose;
          }
          if (morphTargetDict.eyeBlinkRight !== undefined) {
            child.morphTargetInfluences[morphTargetDict.eyeBlinkRight] = morphTargets.eyesClose;
          }

          // Eye look up blendshape
          if (morphTargetDict.eyeLookUpLeft !== undefined) {
            child.morphTargetInfluences[morphTargetDict.eyeLookUpLeft] = morphTargets.eyesLookUp;
          }
          if (morphTargetDict.eyeLookUpRight !== undefined) {
            child.morphTargetInfluences[morphTargetDict.eyeLookUpRight] = morphTargets.eyesLookUp;
          }
        }
      }
    });
  }, [morphTargets]);

  return (
    <primitive
      ref={modelRef}
      object={scene}
      position={[0, -1.5, 0]}
      scale={1}
    />
  );
}

/**
 * DefaultAvatar - Fallback placeholder when no avatar is configured
 */
function DefaultAvatar() {
  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color="#0e5e6f" wireframe />
    </mesh>
  );
}

/**
 * Avatar3D - Main 3D avatar component using React Three Fiber
 *
 * Renders Ready Player Me avatars with:
 * - PBR materials and lighting
 * - Orbit controls for interaction
 * - Morph target-based lip sync
 * - Animation states (idle, listening, speaking)
 */
export default function Avatar3D({
  animationState = "idle",
  morphTargets,
  onReady,
  onError
}: Avatar3DProps) {
  const { config } = useAvatarConfig();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const handleModelLoad = () => {
    setIsLoading(false);
    onReady?.();
  };

  const handleModelError = (err: Error) => {
    setError(err);
    setIsLoading(false);
    onError?.(err);
  };

  // Use configured avatar URL or default
  const avatarUrl = config.avatarUrl || null;

  return (
    <div className="avatar-3d-container" style={{ width: "100%", height: "100%" }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0, 3], fov: 50 }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[5, 5, 5]}
            intensity={0.8}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight
            position={[-5, 3, -5]}
            intensity={0.4}
          />

          {/* Environment map for realistic reflections */}
          <Environment preset="studio" />

          {/* Avatar or fallback */}
          {avatarUrl ? (
            <AvatarModel
              url={avatarUrl}
              morphTargets={morphTargets}
              onLoad={handleModelLoad}
              onError={handleModelError}
            />
          ) : (
            <DefaultAvatar />
          )}

          {/* Camera controls */}
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 1.5}
            target={[0, 0, 0]}
          />
        </Suspense>
      </Canvas>

      {/* Loading overlay */}
      {isLoading && avatarUrl && (
        <div className="avatar-loading-overlay">
          <div className="spinner"></div>
          <p>Loading avatar...</p>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="avatar-error-overlay">
          <p>Failed to load avatar</p>
          <code>{error.message}</code>
        </div>
      )}

      {/* Animation state indicator (dev only) */}
      {process.env.NODE_ENV === "development" && (
        <div className="avatar-state-indicator">
          <span className={`state-badge state-${animationState}`}>
            {animationState}
          </span>
        </div>
      )}
    </div>
  );
}

// Preload default avatar
if (typeof window !== "undefined") {
  // This will be the default Ready Player Me avatar URL
  // For now, we'll skip preloading until we have a default URL
}
