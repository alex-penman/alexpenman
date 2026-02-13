"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

// Lazy load heavy 3D components
const Avatar3D = dynamic(
  () => import("@/app/components/Avatar3D"),
  { ssr: false }
);

const TwinChat = dynamic(
  () => import("@/app/components/TwinChat"),
  { ssr: false }
);

const StatGrid = dynamic(
  () => import("@/app/components/StatGrid"),
  { ssr: false }
);

export default function Home() {
  const stats = null;

  return (
    <main className="avatar-chat-main">
      <div className="avatar-chat-container">
        {/* Avatar Column (40%) - React Three Fiber with Ready Player Me */}
        <div className="avatar-viewport">
          <Avatar3D
            animationState="idle"
            onReady={() => {
              console.log("Avatar ready");
            }}
            onError={(error) => {
              console.error("Avatar error:", error);
            }}
          />
          <div className="avatar-setup-hint">
            <Link href="/setup" className="button-link">
              Setup your avatar →
            </Link>
          </div>
        </div>

        {/* Chat Column (60%) */}
        <div className="chat-viewport">
          <div className="chat-header">
            <div>
              <h2>AI Alex</h2>
              <p className="chat-subtitle">
                Chat powered by your personal mind-map
              </p>
            </div>
            <div className="chat-nav">
              <Link href="/about" className="pill">
                About
              </Link>
            </div>
          </div>
          <TwinChat />
        </div>
      </div>

      {/* Stats Section Below */}
      {stats && (
        <div className="home-stats-section">
          <h2>Mind-Map Pulse</h2>
          <p>
            My personal knowledge graph synthesizes years of questions, projects,
            and reflections. Only aggregate signals appear here: the detail stays
            private, the insight stays sharp.
          </p>
          <StatGrid stats={stats} />
        </div>
      )}
    </main>
  );
}
