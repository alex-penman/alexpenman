import { getPool } from "@/app/lib/pg";

export type MindStats = {
  threads: number;
  contentItems: number;
  facts: number;
  stories: number;
  queries: number;
};

function parseCount(value: string | number | null | undefined): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getMindStats(): Promise<MindStats | null> {
  try {
    const db = getPool();
    const [threads, contentItems, facts, stories, queries] = await Promise.all([
      db.query("select count(*) as count from mind.thread"),
      db.query("select count(*) as count from mind.content_item"),
      db.query("select count(*) as count from mind.fact"),
      db.query("select count(*) as count from mind.story"),
      db.query("select count(*) as count from mind.user_query")
    ]);

    return {
      threads: parseCount(threads.rows[0]?.count),
      contentItems: parseCount(contentItems.rows[0]?.count),
      facts: parseCount(facts.rows[0]?.count),
      stories: parseCount(stories.rows[0]?.count),
      queries: parseCount(queries.rows[0]?.count)
    };
  } catch (error) {
    console.warn("Mind stats unavailable:", error);
    return null;
  }
}
