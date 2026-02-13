import type { MindStats } from "@/app/lib/db";

const format = (value: number) => new Intl.NumberFormat("en-AU").format(value);

export default function StatGrid({ stats }: { stats: MindStats | null }) {
  if (!stats) {
    return (
      <div className="stat-grid empty">
        <p>Live mind-map stats are warming up. Connect the local database to reveal the numbers.</p>
      </div>
    );
  }

  const items = [
    { label: "Conversations captured", value: stats.threads },
    { label: "Content items indexed", value: stats.contentItems },
    { label: "Facts + micro-insights", value: stats.facts },
    { label: "Stories distilled", value: stats.stories },
    { label: "Questions + intents", value: stats.queries }
  ];

  return (
    <div className="stat-grid">
      {items.map((item) => (
        <div key={item.label} className="stat-card">
          <span className="stat-label">{item.label}</span>
          <strong className="stat-value">{format(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}
