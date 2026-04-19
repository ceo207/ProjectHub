import Database from "@tauri-apps/plugin-sql";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";
import { runMigrations } from "./migrations";

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDB | null = null;
let _sqlite: Database | null = null;
let _initPromise: Promise<void> | null = null;

export async function initDB(): Promise<void> {
  // Prevent double-init from React StrictMode running effects twice
  if (_initPromise) return _initPromise;
  _initPromise = _doInit();
  return _initPromise;
}

async function _doInit(): Promise<void> {
  _sqlite = await Database.load("sqlite:projecthub.db");

  _db = drizzle(
    async (
      sql: string,
      params: unknown[],
      method: "run" | "all" | "values" | "get"
    ) => {
      if (!_sqlite) throw new Error("SQLite not initialized");

      if (method === "run") {
        await _sqlite.execute(sql, params as unknown[]);
        return { rows: [] };
      }

      const rows = await _sqlite.select<Record<string, unknown>[]>(
        sql,
        params as unknown[]
      );

      if (method === "get") {
        if (rows.length === 0) return { rows: [] };
        return { rows: [Object.values(rows[0])] };
      }

      // 'all' | 'values'
      return { rows: rows.map((row) => Object.values(row)) };
    },
    { schema }
  );

  await runMigrations(_sqlite);
}

export function getDB(): DrizzleDB {
  if (!_db) throw new Error("Database not initialized. Call initDB() first.");
  return _db;
}

export function getSQLite(): Database {
  if (!_sqlite)
    throw new Error("SQLite not initialized. Call initDB() first.");
  return _sqlite;
}
