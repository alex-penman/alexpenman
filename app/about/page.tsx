import Link from "next/link";

export const metadata = {
  title: "About Alex Penman",
  description: "Learn about Alex Penman's teaching, engineering, and guiding principles"
};

export const dynamic = "force-dynamic";

export default function AboutPage() {
  return (
    <main>
      <section className="hero">
        <div>
          <p className="hero-subtitle">About Alex Penman</p>
          <h1 className="hero-title">Teacher. Coder. Calm Builder.</h1>
          <p className="hero-subtitle">
            I help people move from confusion to clarity. Whether through teaching,
            engineering, or thoughtful conversation, my focus is always the same:
            structure beats noise, and clarity compounds.
          </p>
        </div>
        <div className="pill-row">
          <Link className="pill" href="/">
            Back to Chat
          </Link>
          <Link className="pill" href="/twin">
            Talk with AI Alex (Text)
          </Link>
        </div>
      </section>

      <section className="section">
        <h2>Teaching that Sticks</h2>
        <p>
          I teach with structure, empathy, and momentum. Clients hire me when
          they want clear explanations, custom materials, and steady progress.
        </p>
        <div className="grid-two">
          <div>
            <p><strong>How I Teach</strong></p>
            <ul style={{ paddingLeft: "1.2rem" }}>
              <li>Concept-first lessons with real examples</li>
              <li>Live problem solving, not just lecture</li>
              <li>Progress tracking and learning plans</li>
            </ul>
          </div>
          <div>
            <p><strong>What Clients Get</strong></p>
            <ul style={{ paddingLeft: "1.2rem" }}>
              <li>Tailored pacing for each student</li>
              <li>Clear feedback and confidence-building</li>
              <li>Focus on transfer: explain it, then use it</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Engineering that Ships</h2>
        <p>
          I design software that stays readable under pressure. Clients hire me
          for thoughtful architecture, decisive execution, and the ability to
          translate complexity into calm.
        </p>
        <div className="grid-two">
          <div>
            <p><strong>What I Build</strong></p>
            <ul style={{ paddingLeft: "1.2rem" }}>
              <li>Product discovery and technical roadmaps</li>
              <li>Full-stack applications with crisp UI</li>
              <li>Data pipelines and automation</li>
            </ul>
          </div>
          <div>
            <p><strong>Why It Works</strong></p>
            <ul style={{ paddingLeft: "1.2rem" }}>
              <li>Rapid prototypes that are production-ready</li>
              <li>Clean integrations with existing systems</li>
              <li>Teams aligned with practical documentation</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Guiding Principles</h2>
        <p>
          The mind-map engine behind this site helps me spot patterns across my
          work so I can deliver better outcomes. I only surface content that is
          safe, relevant, and supportive of a professional relationship.
        </p>
        <div className="grid-two">
          <div>
            <p><strong>On Work</strong></p>
            <ul style={{ paddingLeft: "1.2rem" }}>
              <li>Clarity beats cleverness</li>
              <li>Systems should reduce anxiety, not add to it</li>
              <li>Good work is honest work</li>
            </ul>
          </div>
          <div>
            <p><strong>On Growth</strong></p>
            <ul style={{ paddingLeft: "1.2rem" }}>
              <li>Build trust through consistency</li>
              <li>Teach what you learn</li>
              <li>Ship with care</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>The Combination</h2>
        <p>
          I combine a teacher&apos;s clarity with an engineer&apos;s precision. That means
          fewer meetings, tighter feedback loops, and software that keeps paying
          you back. Whether you need to learn something new, build something complex,
          or understand the principles behind clear work—this is where those things
          intersect.
        </p>
      </section>
    </main>
  );
}
