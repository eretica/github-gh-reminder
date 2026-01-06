import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { app } from "electron";
import { DEFAULT_SETTINGS } from "../../shared/types";
import * as schema from "./schema";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqlite: Database.Database | null = null;

export function initDatabase(): ReturnType<typeof drizzle<typeof schema>> {
  if (db) return db;

  const userDataPath = app.getPath("userData");
  const dbPath = join(userDataPath, "pr-reminder.db");

  sqlite = new Database(dbPath);

  // Enable WAL mode for better performance
  sqlite.pragma("journal_mode = WAL");

  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS repositories (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pull_requests (
      id TEXT PRIMARY KEY,
      repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      pr_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at TEXT NOT NULL,
      first_seen_at TEXT NOT NULL,
      notified_at TEXT,
      last_reminded_at TEXT
    );

    CREATE TABLE IF NOT EXISTS notification_history (
      id TEXT PRIMARY KEY,
      pr_id TEXT NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      notified_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pr_repository ON pull_requests(repository_id);
    CREATE INDEX IF NOT EXISTS idx_notification_pr ON notification_history(pr_id);
  `);

  db = drizzle(sqlite, { schema });

  // Initialize default settings if not exist
  initDefaultSettings();

  return db;
}

function initDefaultSettings(): void {
  if (!sqlite) return;

  const settingsKeys = Object.keys(
    DEFAULT_SETTINGS,
  ) as (keyof typeof DEFAULT_SETTINGS)[];

  for (const key of settingsKeys) {
    const existing = sqlite
      .prepare("SELECT key FROM settings WHERE key = ?")
      .get(key);
    if (!existing) {
      sqlite
        .prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
        .run(key, JSON.stringify(DEFAULT_SETTINGS[key]));
    }
  }
}

export function getDatabase(): ReturnType<typeof drizzle<typeof schema>> {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

export function closeDatabase(): void {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
}
