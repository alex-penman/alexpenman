import { getPool } from "@/app/lib/pg";

export type MemoryPack = {
  selfFacts: { predicate: string; object: string; confidence: number }[];
  stories: { title: string; summary: string; namespace: string; confidence: number }[];
  interestQueries: { query: string; createdAt: string | null }[];
};

type SelfFactRow = {
  predicate: string | null;
  object: string | null;
  confidence: number | string | null;
};

type StoryRow = {
  title: string | null;
  summary: string | null;
  namespace: string | null;
  confidence: number | string | null;
};

type InterestRow = {
  query: string | null;
  created_at: string | null;
};

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "i",
  "me",
  "my",
  "you",
  "your",
  "it",
  "that",
  "this",
  "as",
  "at",
  "by",
  "from",
  "we",
  "they",
  "he",
  "she",
  "them",
  "us",
  "do",
  "does",
  "did",
  "can",
  "could",
  "should",
  "would",
  "will",
  "just",
  "like",
  "lol"
]);

function uniq<T>(values: T[]): T[] {
  const out: T[] = [];
  const seen = new Set<T>();
  for (const v of values) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function tokensFromText(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length >= 4)
    .filter((t) => !STOPWORDS.has(t));

  return uniq(tokens).slice(0, 8);
}

function patternsFromTokens(tokens: string[]): string[] {
  return tokens.map((t) => `%${t}%`);
}

export async function getMemoryPack(query: string): Promise<MemoryPack> {
  const db = getPool();

  const tokens = tokensFromText(query);
  const patterns = patternsFromTokens(tokens);
  const hasPatterns = patterns.length > 0;

  const selfFactsQuery = hasPatterns
    ? db.query(
        `
        select
          predicate,
          coalesce(nullif(trim(object_text), ''), object_json::text, object_date::text, object_number::text, object_bool::text) as object,
          confidence
        from mind.fact
        where namespace = 'self'
          and (
            predicate ilike any($1::text[])
            or coalesce(object_text, '') ilike any($1::text[])
          )
          and coalesce(nullif(trim(object_text), ''), object_json::text, object_date::text, object_number::text, object_bool::text) is not null
        order by confidence desc, created_at desc
        limit 12
        `,
        [patterns]
      )
    : db.query(
        `
        select
          predicate,
          coalesce(nullif(trim(object_text), ''), object_json::text, object_date::text, object_number::text, object_bool::text) as object,
          confidence
        from mind.fact
        where namespace = 'self'
          and coalesce(nullif(trim(object_text), ''), object_json::text, object_date::text, object_number::text, object_bool::text) is not null
        order by confidence desc, created_at desc
        limit 8
        `
      );

  const storiesQuery = hasPatterns
    ? db.query(
        `
        select title, summary, namespace, confidence
        from mind.story
        where title ilike any($1::text[])
           or summary ilike any($1::text[])
        order by confidence desc, created_at desc
        limit 6
        `,
        [patterns]
      )
    : db.query(
        `
        select title, summary, namespace, confidence
        from mind.story
        order by confidence desc, created_at desc
        limit 6
        `
      );

  const interestQuery = hasPatterns
    ? db.query(
        `
        select object_text as query, created_at
        from mind.fact
        where namespace = 'interest'
          and object_text is not null
          and object_text ilike any($1::text[])
        order by created_at desc
        limit 10
        `,
        [patterns]
      )
    : db.query(
        `
        select object_text as query, created_at
        from mind.fact
        where namespace = 'interest'
          and object_text is not null
        order by created_at desc
        limit 10
        `
      );

  const [selfFactsRes, storiesRes, interestRes] = await Promise.all([
    selfFactsQuery,
    storiesQuery,
    interestQuery
  ]);

  return {
    selfFacts: (selfFactsRes.rows as SelfFactRow[]).map((r: SelfFactRow) => ({
      predicate: String(r.predicate ?? ""),
      object: String(r.object ?? ""),
      confidence: Number(r.confidence ?? 0.5)
    })),
    stories: (storiesRes.rows as StoryRow[]).map((r: StoryRow) => ({
      title: String(r.title ?? ""),
      summary: String(r.summary ?? ""),
      namespace: String(r.namespace ?? ""),
      confidence: Number(r.confidence ?? 0.5)
    })),
    interestQueries: (interestRes.rows as InterestRow[]).map((r: InterestRow) => ({
      query: String(r.query ?? ""),
      createdAt: r.created_at ? String(r.created_at) : null
    }))
  };
}
