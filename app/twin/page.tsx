import Link from "next/link";

import TwinChat from "@/app/components/TwinChat";

export const dynamic = "force-dynamic";

export default function TwinPage() {
  return (
    <main>
      <section className="hero">
        <div>
          <p className="hero-subtitle">AI Alex</p>
          <h1 className="hero-title">Talk to the mind-map.</h1>
          <p className="hero-subtitle">
            This is a local-first interface to an AI trained on your structured
            memory and patterns, filtered for privacy. It is designed to help you
            think and build, not to impersonate you publicly.
          </p>
        </div>
        <div className="pill-row">
          <Link className="pill" href="/">
            Avatar Chat
          </Link>
          <Link className="pill" href="/about">
            About
          </Link>
          <Link className="pill" href="/setup">
            Setup
          </Link>
        </div>
      </section>

      <section className="section">
        <TwinChat />
      </section>
    </main>
  );
}

