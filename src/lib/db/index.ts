import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Neon over HTTP (pooled connection string): one fetch per query, safe under serverless fan-out.
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function db() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  _db = drizzle(neon(url), { schema });
  return _db;
}

export function hasDb(): boolean {
  return !!process.env.DATABASE_URL;
}

export { schema };
