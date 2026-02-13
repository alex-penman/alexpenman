import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;

  // Use Vercel/Neon environment variables if available, otherwise fall back to local
  const connectionString =
    process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (connectionString) {
    // Production: Use Neon/Vercel Postgres connection string
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
  } else {
    // Development: Use local PostgreSQL socket
    const host =
      process.env.PROFILE_DB_HOST ??
      "/Users/ragnar/Documents/projects/self/data/pgsocket";
    const port = Number(process.env.PROFILE_DB_PORT ?? 54329);
    const user = process.env.PROFILE_DB_USER ?? "ragnar";
    const database = process.env.PROFILE_DB_NAME ?? "profile";
    const password = process.env.PROFILE_DB_PASSWORD;

    pool = new Pool({
      host,
      port,
      user,
      database,
      password
    });
  }

  return pool;
}

