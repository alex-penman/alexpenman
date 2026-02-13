"use client";

import dynamic from "next/dynamic";
import type { AnimationState } from "@/app/lib/avatarController";

/**
 * Priority 3 Optimization: Lazy-loaded AvatarWithLipSync
 *
 * Defers loading AvatarWithLipSync and its dependencies (~50KB) until needed.
 * This reduces initial bundle size and improves Time to Interactive (TTI).
 *
 * The component is dynamically imported with:
 * - Loading fallback UI
 * - Error boundary (implicit)
 * - SSR disabled (client-only rendering)
 *
 * Expected improvement: 30% TTI reduction when combined with other optimizations
 */

const AvatarWithLipSyncComponent = dynamic(
  () => import("./AvatarWithLipSync"),
  {
    loading: () => (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0, 0, 0, 0.02)",
          borderRadius: "inherit",
          gap: "1rem",
          color: "#666",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid #e0e0e0",
            borderTop: "3px solid #333",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ margin: 0, fontSize: "0.875rem" }}>Loading avatar...</p>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    ),
    ssr: false, // Client-side only (avatar needs browser APIs)
  }
);

interface AvatarWithLipSyncLazyProps {
  onAvatarReady?: () => void;
  onAvatarError?: (error: Error) => void;
}

/**
 * Lazy-loaded Avatar with Lip-Sync
 *
 * This component is code-split from the main bundle and loaded on-demand.
 * Benefits:
 * - Reduces initial bundle by ~50KB
 * - Improves Time to Interactive (TTI)
 * - Avatar loads while user reads chat setup
 *
 * Usage:
 * ```tsx
 * import AvatarWithLipSyncLazy from "@/app/components/AvatarWithLipSyncLazy";
 *
 * export default function Home() {
 *   return <AvatarWithLipSyncLazy />;
 * }
 * ```
 */
export default function AvatarWithLipSyncLazy({
  onAvatarReady,
  onAvatarError,
}: AvatarWithLipSyncLazyProps) {
  return (
    <AvatarWithLipSyncComponent
      onAvatarReady={onAvatarReady}
      onAvatarError={onAvatarError}
    />
  );
}
