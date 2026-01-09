import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { app } from "electron";
import { DEFAULT_SETTINGS } from "../../shared/types";
import * as schema from "./schema";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqlite: Database.Database | null = null;

export function initDatabase(): ReturnType<typeof drizzle<typeof schema>> {
  if (db) return db;

  try {
    const userDataPath = app.getPath("userData");
    const dbPath = join(userDataPath, "github-pr-reminder.db");

    sqlite = new Database(dbPath);

    // Enable WAL mode for better performance
    sqlite.pragma("journal_mode = WAL");

    db = drizzle(sqlite, { schema });

    // Run migrations to create/update database schema
    const migrationsFolder = join(__dirname, "db", "migrations");
    migrate(db, { migrationsFolder });

    // Initialize default settings if not exist
    initDefaultSettings();

    return db;
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
}

function initDefaultSettings(): void {
  if (!db) return;

  const settingsKeys = Object.keys(
    DEFAULT_SETTINGS,
  ) as (keyof typeof DEFAULT_SETTINGS)[];

  for (const key of settingsKeys) {
    const existing = db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, key))
      .get();

    if (!existing) {
      db.insert(schema.settings)
        .values({
          key,
          value: JSON.stringify(DEFAULT_SETTINGS[key]),
        })
        .run();
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
